import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  requireAdmin,
  requireUser,
  createSessionToken,
  verifySessionClaims,
} from "../lib/auth.mjs";
import { adminFilters, validateNewPassword } from "../lib/admin.mjs";
process.env.JWT_SECRET = "admin-unit-test-secret-that-is-not-used-by-the-app";
const id = "705c07f4-f105-45c3-9c7c-5e68e9f96647";
const user = {
  id,
  username: "admin",
  role: "admin",
  account_status: "active",
  session_version: 0,
  password_change_required: false,
};
const database = (changes = {}) => ({
  query: async () => ({ rows: [{ ...user, ...changes }] }),
});
const request = (token = createSessionToken(id)) =>
  new Request("https://questmart.test/api/admin/users", {
    headers: { cookie: `accessToken=${token}` },
  });
test("admin access is database-backed, not based on username or JWT role", async () => {
  assert.equal(
    (await requireAdmin(request(), { database: database() })).role,
    "admin",
  );
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "questmart",
    audience: "questmart-web",
    subject: id,
    expiresIn: "1h",
  });
  await assert.rejects(
    requireAdmin(request(token), { database: database({ role: "user" }) }),
    (error) => error.status === 403,
  );
});
test("suspension and session-version changes immediately reject existing tokens", async () => {
  await assert.rejects(
    requireUser(request(), database({ account_status: "suspended" })),
    (error) => error.status === 401,
  );
  await assert.rejects(
    requireUser(request(), database({ session_version: 1 })),
    (error) => error.status === 401,
  );
  assert.equal(
    (
      await requireAdmin(request(createSessionToken(id, 1)), {
        database: database({ session_version: 1 }),
      })
    )._id,
    id,
  );
});
test("initial-password users can only access the explicitly permitted security flow", async () => {
  const db = database({ password_change_required: true });
  await assert.rejects(
    requireAdmin(request(), { database: db }),
    (error) => error.status === 428,
  );
  assert.equal(
    (await requireAdmin(request(), { database: db, allowPasswordChange: true }))
      .passwordChangeRequired,
    true,
  );
});
test("session versions and password inputs are bounded", () => {
  assert.equal(verifySessionClaims(createSessionToken(id, 3)).sv, 3);
  assert.throws(() => validateNewPassword("short"));
  assert.throws(() => validateNewPassword("12345"));
  assert.equal(validateNewPassword("123456"), "123456");
  assert.equal(validateNewPassword("abcdef"), "abcdef");
  assert.throws(() => validateNewPassword("😀".repeat(19)));
  assert.equal(
    validateNewPassword("A sufficiently long passphrase"),
    "A sufficiently long passphrase",
  );
  assert.deepEqual(
    adminFilters(new URLSearchParams({ page: "-1", q: "  test  " })),
    { page: 1, search: "test", filter: "all" },
  );
});
