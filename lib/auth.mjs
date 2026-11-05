import jwt from "jsonwebtoken";
import { ApiError } from "./http.mjs";

export const SESSION_COOKIE = "accessToken";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const issuer = "questmart";
const audience = "questmart-web";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return secret;
}

export function createSessionToken(userId) {
  if (!uuidPattern.test(String(userId))) throw new Error("Invalid session subject");
  return jwt.sign({}, signingSecret(), {
    algorithm: "HS256", issuer, audience, subject: String(userId), expiresIn: SESSION_MAX_AGE,
  });
}

export function verifySessionToken(token) {
  const secret = signingSecret();
  if (typeof token !== "string" || !token || token.length > 4096) return null;
  try {
    const claims = jwt.verify(token, secret, { algorithms: ["HS256"], issuer, audience });
    if (typeof claims !== "object" || !uuidPattern.test(claims.sub || "") || !Number.isFinite(claims.exp)) return null;
    return claims.sub;
  } catch {
    return null;
  }
}

export function sessionCookie(token, maxAge = SESSION_MAX_AGE) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function sessionTokenFromRequest(request) {
  const entry = (request.headers.get("cookie") || "").split(";")
    .map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1)); }
  catch { return null; }
}

export function publicUser(user) {
  return {
    _id: String(user.id), username: user.username, email: user.email,
    avatar: user.avatar || "", createdAt: user.created_at,
  };
}

export async function requireUser(request) {
  const token = sessionTokenFromRequest(request);
  if (!token) throw new ApiError(401, "Please sign in to continue.");
  const userId = verifySessionToken(token);
  if (!userId) throw new ApiError(401, "Your session has expired. Please sign in again.");
  const { query } = await import("./db.mjs");
  const { rows: [user] } = await query(
    "SELECT id, username, email, avatar, created_at FROM users WHERE id = $1",
    [userId],
  );
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  return publicUser(user);
}

export function assertOwner(ownerId, userId) {
  const owner = String(ownerId || "");
  const user = String(userId || "");
  if (!uuidPattern.test(owner) || !uuidPattern.test(user) || owner.toLowerCase() !== user.toLowerCase()) {
    throw new ApiError(403, "You do not have permission to change this item.");
  }
}
