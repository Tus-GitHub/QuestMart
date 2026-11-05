import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  createSessionToken, verifySessionToken, sessionCookie, sessionTokenFromRequest,
  publicUser, assertOwner, requireUser,
} from "../lib/auth.mjs";
import { ApiError, assertSameOrigin, readJson, errorResponse } from "../lib/http.mjs";
import { validateSignup, validateSignin } from "../lib/validation.mjs";

const secret = "unit-test-secret-not-used-outside-tests-123456789";
process.env.JWT_SECRET = secret;
const userId = "9ff92a04-f414-480e-8c27-57f1cf7ca62c";
const options = { algorithm: "HS256", issuer: "questmart", audience: "questmart-web", subject: userId, expiresIn: "1h" };
const makeRequest = (headers = {}, body) => new Request("https://questmart.example/api/auth/signup", {
  method: "POST", headers, ...(body === undefined ? {} : { body }),
});

test("session binds identity to signed issuer, audience, algorithm and expiration", () => {
  assert.equal(verifySessionToken(createSessionToken(userId)), userId);
  const wrongClaims = [
    { ...options, issuer: "another-app" },
    { ...options, audience: "another-client" },
    { ...options, algorithm: "HS384" },
    { ...options, expiresIn: -1 },
    { ...options, subject: "not-a-user-id" },
  ];
  for (const settings of wrongClaims) assert.equal(verifySessionToken(jwt.sign({}, secret, settings)), null);
  const token = createSessionToken(userId);
  const parts = token.split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...jwt.decode(token), sub: "46c28242-552e-4a4e-b395-093ddfcf6344" })).toString("base64url");
  assert.equal(verifySessionToken(parts.join(".")), null);
  assert.equal(verifySessionToken(jwt.sign({}, "a-different-secret", options)), null);
  assert.equal(verifySessionToken("malformed"), null);
  assert.equal(verifySessionToken(null), null);
  assert.equal(verifySessionToken("x".repeat(4097)), null);
  const { expiresIn: unused, ...withoutExpiry } = options;
  assert.equal(verifySessionToken(jwt.sign({}, secret, withoutExpiry)), null);
});

test("untrusted and missing sessions fail before database access", async () => {
  await assert.rejects(requireUser(makeRequest()), error => error.status === 401);
  await assert.rejects(requireUser(makeRequest({ cookie: "accessToken=forged" })), error => error.status === 401);
});

test("cookies are HttpOnly, same-site, production secure and explicitly cleared", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const cookie = sessionCookie("test-token");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /; Secure/);
    assert.match(sessionCookie("", 0), /Max-Age=0/);
    process.env.NODE_ENV = "development";
    assert.doesNotMatch(sessionCookie("test-token"), /; Secure/);
    assert.equal(sessionTokenFromRequest(makeRequest({ cookie: "other=a; accessToken=abc.def.ghi" })), "abc.def.ghi");
    assert.equal(sessionTokenFromRequest(makeRequest({ cookie: "accessToken=%E0%A4%A" })), null);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("cross-origin and originless cookie mutations are rejected", () => {
  assert.doesNotThrow(() => assertSameOrigin(makeRequest({ origin: "https://questmart.example" })));
  assert.doesNotThrow(() => assertSameOrigin(makeRequest({ cookie: "accessToken=x", "sec-fetch-site": "same-origin" })));
  assert.throws(() => assertSameOrigin(makeRequest({ origin: "https://attacker.example" })), error => error.status === 403);
  assert.throws(() => assertSameOrigin(makeRequest({ "sec-fetch-site": "cross-site" })), error => error.status === 403);
  assert.throws(() => assertSameOrigin(makeRequest({ cookie: "accessToken=x" })), error => error.status === 403);
  assert.throws(() => assertSameOrigin(makeRequest({ origin: "https://attacker.example", "x-forwarded-host": "attacker.example" })), error => error.status === 403);
  const local = new Request("http://localhost:3000/api/auth/signin", { method: "POST", headers: { origin: "http://localhost:3000" } });
  assert.doesNotThrow(() => assertSameOrigin(local));
  const previous = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "https://public.questmart.example";
    const proxy = new Request("http://internal:3000/api/auth/signin", { method: "POST", headers: { origin: "https://public.questmart.example" } });
    assert.doesNotThrow(() => assertSameOrigin(proxy));
    assert.throws(() => assertSameOrigin(local), error => error.status === 403);
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});

test("Next loopback host normalization accepts only local aliases on the same scheme and port", () => {
  const requestFor = origin => new Request("http://localhost:3002/api/auth/signup", {
    method: "POST", headers: { origin },
  });
  for (const origin of ["http://localhost:3002", "http://127.0.0.1:3002", "http://[::1]:3002"]) {
    assert.doesNotThrow(() => assertSameOrigin(requestFor(origin)));
  }
  for (const origin of [
    "http://127.0.0.1:3003", "https://127.0.0.1:3002", "http://localhost.evil:3002",
    "http://127.0.0.2:3002", "http://example.com:3002", "null", "http://127.0.0.1:3002/path",
  ]) assert.throws(() => assertSameOrigin(requestFor(origin)), error => error.status === 403);
  const externalRequest = new Request("https://questmart.example/api/auth/signup", {
    method: "POST", headers: { origin: "https://localhost" },
  });
  assert.throws(() => assertSameOrigin(externalRequest), error => error.status === 403);
  const crossSiteLocal = new Request("http://localhost:3002/api/auth/signup", {
    method: "POST", headers: { origin: "http://127.0.0.1:3002", "sec-fetch-site": "cross-site" },
  });
  assert.throws(() => assertSameOrigin(crossSiteLocal), error => error.status === 403);
  const previous = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "http://localhost:3002";
    assert.doesNotThrow(() => assertSameOrigin(requestFor("http://localhost:3002")));
    assert.throws(() => assertSameOrigin(requestFor("http://127.0.0.1:3002")), error => error.status === 403);
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});

test("signup normalizes identity and rejects query operators, invalid inputs, and bcrypt truncation", () => {
  const base = { username: "Test_User", email: " PERSON@Example.com ", password: "a secure password" };
  assert.deepEqual(validateSignup(base), { username: "test_user", email: "person@example.com", password: base.password });
  for (const change of [
    { username: { $ne: null } }, { username: "x" }, { username: "unsafe name" },
    { email: { $gt: "" } }, { email: "invalid" }, { password: "short" },
    { password: "x".repeat(73) }, { password: "😀".repeat(19) },
  ]) assert.throws(() => validateSignup({ ...base, ...change }), error => error.status === 400);
  assert.equal(validateSignin({ identifier: "LegacyUser", password: "short" }).password, "short");
  assert.throws(() => validateSignin({ identifier: { $ne: null }, password: "x" }), error => error.status === 400);
  assert.equal(validateSignup({ ...base, username: " User_1 " }).username, "user_1");
  assert.equal(validateSignup({ ...base, password: "x".repeat(72) }).password.length, 72);
  assert.equal(validateSignup({ ...base, password: "😀".repeat(18) }).password, "😀".repeat(18));
});

test("body parsing rejects malformed, non-object, oversized, and non-JSON input", async () => {
  const json = { "content-type": "application/json" };
  assert.deepEqual(await readJson(makeRequest(json, '{"username":"test"}')), { username: "test" });
  for (const body of ["{", "null", "[]", '"text"']) {
    await assert.rejects(readJson(makeRequest(json, body)), error => error.status === 400);
  }
  await assert.rejects(readJson(makeRequest(json, JSON.stringify({ value: "x".repeat(17000) }))), error => error.status === 413);
  await assert.rejects(readJson(makeRequest({ "content-type": "text/plain" }, "{}")), error => error.status === 415);
  await assert.rejects(readJson(makeRequest({ ...json, "content-length": "999999" }, "{}")), error => error.status === 413);
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(9000)); },
    cancel() { cancelled = true; },
  });
  const streamingRequest = new Request("https://questmart.example/api/auth/signup", {
    method: "POST", headers: json, body: stream, duplex: "half",
  });
  await assert.rejects(readJson(streamingRequest), error => error.status === 413);
  assert.equal(cancelled, true);
  await assert.rejects(readJson(makeRequest(json, new Uint8Array([0xff]))), error => error.status === 400);
});

test("public responses exclude private fields and unauthorized owner changes", async () => {
  const user = publicUser({ id: userId, username: "test", email: "test@example.com", password_hash: "secret-hash", role: "admin" });
  assert.equal(user._id, userId);
  assert.equal(user.password_hash, undefined);
  assert.equal(user.role, undefined);
  assert.doesNotThrow(() => assertOwner(userId, userId));
  assert.throws(() => assertOwner(userId, "someone-else"), error => error.status === 403);
  assert.throws(() => assertOwner(undefined, undefined), error => error.status === 403);
  assert.throws(() => assertOwner({}, {}), error => error.status === 403);
  assert.throws(() => assertOwner("not-an-id", "not-an-id"), error => error.status === 403);
  const response = errorResponse(new Error("postgresql://sensitive-credentials"));
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /sensitive|postgresql/);
  assert.equal(errorResponse(new ApiError(401, "Please sign in")).status, 401);
});
