import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { applyMigrations } from "../scripts/db-migrate.mjs";
import {
  createAccountEmail,
  tokenHash,
  recoveryEmail,
  resetPasswordInput,
} from "../lib/account-email.mjs";
import { emailTemplate } from "../lib/email-templates.mjs";

test("templates escape account names, include usable text and trusted action links", () => {
  for (const kind of ["verify", "welcome", "reset"]) {
    const message = emailTemplate(
      kind,
      "<img src=x onerror=alert(1)>",
      "https://quest-mart.vercel.app/verify-email#token=abc",
    );
    assert.ok(!message.html.includes("<img src=x"));
    assert.ok(message.html.includes("&lt;img"));
    assert.ok(message.text.includes("https://quest-mart.vercel.app/"));
    assert.ok(message.html.includes('role="presentation"'));
    assert.ok(message.subject.endsWith("QuestMart"));
  }
  assert.throws(() => emailTemplate("verify", "user", "javascript:alert(1)"));
});
test("recovery inputs reject malformed emails, short passwords, mismatches and bcrypt truncation", () => {
  assert.equal(recoveryEmail(" PLAYER@Example.com "), "player@example.com");
  assert.throws(() => recoveryEmail({ email: "a@b.com" }));
  assert.throws(() => recoveryEmail("not an email"));
  assert.throws(() => recoveryEmail("Name<player@example.com>"));
  assert.throws(() => recoveryEmail("group:player@example.com;"));
  assert.equal(resetPasswordInput("123456", "123456"), "123456");
  assert.throws(() => resetPasswordInput("12345", "12345"));
  assert.throws(() => resetPasswordInput("123456", "654321"));
  assert.throws(() => resetPasswordInput("😀".repeat(19), "😀".repeat(19)));
});

test(
  "email migration preserves existing admin access while requiring verification for new accounts",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const client = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await client.connect();
    try {
      await client.query("BEGIN");
      const schema = "email_legacy_" + randomUUID().replaceAll("-", "");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      for (const file of [
        "001_initial.sql",
        "002_marketplace.sql",
        "003_admin.sql",
        "004_audit_permissions.sql",
      ])
        await client.query(
          await readFile(
            new URL("../db/migrations/" + file, import.meta.url),
            "utf8",
          ),
        );
      await client.query(
        "INSERT INTO users(username,email,password_hash,role,session_version) VALUES('legacyadmin','legacy@example.test',$1,'admin',3)",
        ["$2a$10$" + "a".repeat(53)],
      );
      await client.query(
        await readFile(
          new URL("../db/migrations/005_account_email.sql", import.meta.url),
          "utf8",
        ),
      );
      const {
        rows: [legacy],
      } = await client.query(
        "SELECT role,session_version,email_verified_at,email_verification_required FROM users WHERE username='legacyadmin'",
      );
      assert.deepEqual(legacy, {
        role: "admin",
        session_version: 3,
        email_verified_at: null,
        email_verification_required: false,
      });
      const {
        rows: [newUser],
      } = await client.query(
        "INSERT INTO users(username,email,password_hash) VALUES('newplayer','new@example.test',$1) RETURNING email_verification_required",
        ["$2a$10$" + "a".repeat(53)],
      );
      assert.equal(newUser.email_verification_required, true);
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      await client.end();
    }
  },
);

test(
  "email token lifecycle, verification, recovery and legacy migration",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const client = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await client.connect();
    try {
      await client.query("BEGIN");
      const schema = "email_test_" + randomUUID().replaceAll("-", "");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await applyMigrations(client);
      const db = {
        query: client.query.bind(client),
        withTransaction: async (callback) => {
          await client.query("SAVEPOINT email_operation");
          try {
            const result = await callback(client);
            await client.query("RELEASE SAVEPOINT email_operation");
            return result;
          } catch (error) {
            await client.query("ROLLBACK TO SAVEPOINT email_operation");
            await client.query("RELEASE SAVEPOINT email_operation");
            throw error;
          }
        },
      };
      const sent = [];
      const service = createAccountEmail(db, async (kind, user, raw) => {
        sent.push({ kind, user, raw });
      });
      const hash = await bcrypt.hash("old-password", 10);
      const {
        rows: [user],
      } = await client.query(
        "INSERT INTO users(username,email,password_hash) VALUES('emailplayer','player@example.test',$1) RETURNING *",
        [hash],
      );
      assert.equal(user.email_verification_required, true);
      await t.test(
        "issue stores only a hash, throttles resends and does not reveal unknown accounts",
        async () => {
          assert.equal(await service.issue("verify", user.email), true);
          assert.equal(await service.issue("verify", user.email), true);
          assert.equal(
            await service.issue("verify", "unknown@example.test"),
            true,
          );
          assert.equal(sent.length, 1);
          const {
            rows: [token],
          } = await client.query(
            "SELECT * FROM account_email_tokens WHERE user_id=$1",
            [user.id],
          );
          assert.notEqual(token.token_hash, sent[0].raw);
          assert.equal(token.token_hash, tokenHash(sent[0].raw));
        },
      );
      await t.test(
        "verification is single use, sends welcome after verification and does not create a session",
        async () => {
          await assert.rejects(
            service.redeem("reset", sent[0].raw, "123456"),
            (e) => e.status === 400,
          );
          await service.redeem("verify", sent[0].raw);
          assert.equal(sent[1].kind, "welcome");
          await assert.rejects(
            service.redeem("verify", sent[0].raw),
            (e) => e.status === 400,
          );
          const {
            rows: [updated],
          } = await client.query(
            "SELECT email_verified_at,email_verification_required FROM users WHERE id=$1",
            [user.id],
          );
          assert.ok(updated.email_verified_at);
          assert.equal(updated.email_verification_required, false);
          await service.issue("verify", user.email);
          assert.equal(sent.length, 2);
        },
      );
      await t.test(
        "reset changes the hash, revokes old sessions and consumes recovery tokens",
        async () => {
          await service.issue("reset", user.email);
          const reset = sent.find((x) => x.kind === "reset").raw;
          await service.redeem("reset", reset, "new-password");
          const {
            rows: [updated],
          } = await client.query(
            "SELECT password_hash,session_version FROM users WHERE id=$1",
            [user.id],
          );
          assert.equal(
            await bcrypt.compare("new-password", updated.password_hash),
            true,
          );
          assert.equal(updated.session_version, 1);
          await assert.rejects(
            service.redeem("reset", reset, "another-password"),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "expired tokens and suspended accounts cannot redeem links",
        async () => {
          await client.query(
            "UPDATE account_email_tokens SET created_at=now()-interval '2 minutes' WHERE user_id=$1",
            [user.id],
          );
          await service.issue("reset", user.email);
          const expired = sent.at(-1).raw;
          await client.query(
            "UPDATE account_email_tokens SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",
            [tokenHash(expired)],
          );
          await assert.rejects(
            service.redeem("reset", expired, "new-password"),
            (e) => e.status === 400,
          );
          await client.query(
            "UPDATE account_email_tokens SET created_at=now()-interval '2 minutes' WHERE user_id=$1",
            [user.id],
          );
          await service.issue("reset", user.email);
          const suspended = sent.at(-1).raw;
          await client.query(
            "UPDATE users SET account_status='suspended' WHERE id=$1",
            [user.id],
          );
          await assert.rejects(
            service.redeem("reset", suspended, "new-password"),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "delivery failures preserve the created account and permit a later resend",
        async () => {
          await client.query(
            "UPDATE users SET account_status='active' WHERE id=$1",
            [user.id],
          );
          await client.query(
            "UPDATE account_email_tokens SET created_at=now()-interval '2 minutes' WHERE user_id=$1",
            [user.id],
          );
          const failing = createAccountEmail(db, async () => {
            throw new Error("test SMTP failure");
          });
          assert.equal(await failing.issue("reset", user.email), false);
          assert.equal(
            (await client.query("SELECT 1 FROM users WHERE id=$1", [user.id]))
              .rowCount,
            1,
          );
        },
      );
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      await client.end();
    }
  },
);
