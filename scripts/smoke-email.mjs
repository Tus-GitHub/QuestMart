import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { query, closePool } from "../lib/db.mjs";
nextEnv.loadEnvConfig(process.cwd());
const base = "http://localhost:3011",
  mailbox = new URL("../.local/email-test-mailbox.json", import.meta.url);
if (new URL(process.env.DATABASE_URL).hostname !== "127.0.0.1")
  throw new Error("Local DB only");
const name = "mail_smoke_" + randomBytes(5).toString("hex"),
  email = name + "@example.test",
  password = randomBytes(18).toString("hex");
let cookie = "";
async function request(path, body, method = "POST", origin = base) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(90000),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function token(kind) {
  const messages = JSON.parse(await fs.readFile(mailbox, "utf8")).map((text) =>
    text.replace(/=\r?\n/g, "").replace(/=3D/g, "="),
  );
  return messages
    .filter((text) => text.includes(email))
    .map((text) => text.match(new RegExp(`/${kind}#token=([a-f0-9]{64})`))?.[1])
    .filter(Boolean)
    .at(-1);
}
try {
  // The server must explicitly be configured for the loopback SMTP sink.
  assert.equal(
    process.env.SMTP_HOST,
    "127.0.0.1",
    "Start smoke script with SMTP_HOST=127.0.0.1; never use a real provider for fixtures.",
  );
  assert.equal(
    (await request("/api/auth/signup", { username: name, email, password }))
      .status,
    201,
  );
  assert.equal(
    (await request("/api/auth/signin", { identifier: email, password })).status,
    403,
  );
  const verification = await token("verify-email");
  assert.ok(verification, "Verification message arrived through SMTP");
  assert.equal(
    (
      await request(
        "/api/auth/email/verify",
        { token: verification },
        "POST",
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/auth/email/verify", { token: verification })).status,
    200,
  );
  assert.equal(
    (await request("/api/auth/email/verify", { token: verification })).status,
    400,
  );
  const login = await request("/api/auth/signin", {
    identifier: email,
    password,
  });
  assert.equal(login.status, 200);
  cookie = login.cookie;
  assert.equal(
    (await request("/api/auth/email/forgot", { email })).status,
    200,
  );
  const recovery = await token("reset-password");
  assert.ok(recovery, "Recovery message arrived through SMTP");
  const nextPassword = randomBytes(18).toString("hex");
  assert.equal(
    (
      await request("/api/auth/email/reset", {
        token: recovery,
        password: nextPassword,
        confirmPassword: "mismatch",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/auth/email/reset", {
        token: recovery,
        password: nextPassword,
        confirmPassword: nextPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/auth/me", undefined, "GET")).status,
    401,
    "Old session must be revoked",
  );
  cookie = "";
  assert.equal(
    (await request("/api/auth/signin", { identifier: email, password })).status,
    401,
  );
  assert.equal(
    (
      await request("/api/auth/signin", {
        identifier: email,
        password: nextPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/auth/email/reset", {
        token: recovery,
        password: nextPassword,
        confirmPassword: nextPassword,
      })
    ).status,
    400,
  );
  const unknown = await request("/api/auth/email/forgot", {
    email: "unknown@example.test",
  });
  assert.equal(unknown.status, 200);
  assert.ok(unknown.data.message.startsWith("If an active account"));
  const messages = JSON.parse(await fs.readFile(mailbox, "utf8"));
  assert.equal(
    messages.filter((text) => text.includes(email)).length,
    3,
    "Verification, welcome and reset emails must all arrive",
  );
  console.log(
    "Email HTTP + SMTP checks passed: signup gating, verification, welcome, reset, old-session revocation, replay rejection and origin protection.",
  );
} finally {
  await query("DELETE FROM users WHERE username=$1 AND email=$2", [
    name,
    email,
  ]);
  await closePool();
  await fs.writeFile(mailbox, "[]");
}
