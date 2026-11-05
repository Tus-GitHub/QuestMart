import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import sharp from "sharp";
import { del } from "@vercel/blob";
import { query, closePool } from "../lib/db.mjs";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.SMOKE_BASE_URL || "http://localhost:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local verification only.");
const prefix = "verify_" + randomBytes(5).toString("hex");
const identities = [];
let photoUrl;
async function request(path, method = "GET", body, cookie = "") {
  const multipart = body instanceof FormData;
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: new URL(base).origin,
      ...(multipart ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  for (const suffix of ["seller", "other"]) {
    const username = prefix + "_" + suffix,
      password = randomBytes(20).toString("hex"),
      email = username + "@example.test";
    identities.push(username);
    const signup = await request("/api/auth/signup", "POST", {
      username,
      email,
      password,
    });
    assert.equal(signup.status, 201, signup.data.message);
    const login = await request("/api/auth/signin", "POST", {
      identifier: username,
      password,
    });
    assert.equal(login.status, 200, login.data.message);
    identities[identities.length - 1] = {
      username,
      id: login.data.user._id,
      cookie: login.cookie,
    };
  }
  const [seller, other] = identities;
  assert.equal((await request("/api/listings", "POST", {})).status, 401);
  const photo = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#c1ef76" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set(
    "photo",
    new Blob([photo], { type: "image/png" }),
    "verification.png",
  );
  const upload = await request("/api/uploads", "POST", form, seller.cookie);
  assert.equal(upload.status, 201, upload.data.message);
  photoUrl = upload.data.url;
  const input = {
    title: "Verification game " + prefix,
    platform: "PS5",
    format: "disc",
    condition: "good",
    pricePaise: 125000,
    description:
      "Temporary listing created for automated verification of marketplace ownership.",
    photos: [photoUrl],
  };
  assert.equal(
    (await request("/api/listings", "POST", input, other.cookie)).status,
    400,
  );
  const created = await request("/api/listings", "POST", input, seller.cookie);
  assert.equal(created.status, 201, created.data.message);
  const id = created.data.listing.id;
  const list = await request("/api/listings?q=" + encodeURIComponent(prefix));
  assert.ok(list.data.listings.some((v) => v.id === id));
  assert.equal(
    (await request("/api/listings/" + id, "PATCH", input, other.cookie)).status,
    403,
  );
  assert.equal(
    (await request("/api/listings/" + id, "DELETE", undefined, other.cookie))
      .status,
    403,
  );
  const updated = await request(
    "/api/listings/" + id,
    "PATCH",
    { ...input, pricePaise: 119900 },
    seller.cookie,
  );
  assert.equal(updated.data.listing.price_paise, 119900);
  assert.equal((await request("/api/checkout", "POST", {})).status, 503);
  assert.equal(
    (
      await request(
        "/api/orders/" + id,
        "POST",
        { outcome: "success" },
        other.cookie,
      )
    ).status,
    503,
  );
  assert.equal(
    (await request("/api/listings/" + id, "DELETE", undefined, seller.cookie))
      .status,
    200,
  );
  assert.equal((await request("/api/listings/" + id)).status, 404);
  console.log(
    "Marketplace checks passed: real upload, listing creation/search/edit/removal, ownership protection, payment gating.",
  );
} finally {
  const ids = identities.filter((v) => typeof v === "object").map((v) => v.id);
  if (ids.length) {
    await query("DELETE FROM listings WHERE seller_id=ANY($1::uuid[])", [ids]);
    await query("DELETE FROM uploads WHERE owner_id=ANY($1::uuid[])", [ids]);
    await query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
  }
  if (photoUrl) await del(photoUrl);
  await closePool();
}
