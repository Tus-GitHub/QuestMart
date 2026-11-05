import jwt from "jsonwebtoken";
import { ApiError } from "./http.mjs";

export const SESSION_COOKIE = "accessToken";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const issuer = "questmart";
const audience = "questmart-web";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  return secret;
}

export function createSessionToken(userId, version = 0) {
  if (!uuidPattern.test(String(userId)))
    throw new Error("Invalid session subject");
  return jwt.sign({ sv: version }, signingSecret(), {
    algorithm: "HS256",
    issuer,
    audience,
    subject: String(userId),
    expiresIn: SESSION_MAX_AGE,
  });
}

export function verifySessionClaims(token) {
  const secret = signingSecret();
  if (typeof token !== "string" || !token || token.length > 4096) return null;
  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer,
      audience,
    });
    if (
      typeof claims !== "object" ||
      !uuidPattern.test(claims.sub || "") ||
      !Number.isFinite(claims.exp)
    )
      return null;
    if (
      claims.sv !== undefined &&
      (!Number.isSafeInteger(claims.sv) || claims.sv < 0)
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}

export function verifySessionToken(token) {
  return verifySessionClaims(token)?.sub || null;
}

export function sessionCookie(token, maxAge = SESSION_MAX_AGE) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function sessionTokenFromRequest(request) {
  const entry = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

export function publicUser(user) {
  return {
    _id: String(user.id),
    username: user.username,
    email: user.email,
    avatar: user.avatar || "",
    createdAt: user.created_at,
    role: user.role || "user",
    passwordChangeRequired: Boolean(user.password_change_required),
    sessionVersion: user.session_version || 0,
  };
}

export async function requireUser(request, database) {
  const token = sessionTokenFromRequest(request);
  if (!token) throw new ApiError(401, "Please sign in to continue.");
  const claims = verifySessionClaims(token);
  if (!claims)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  const { query } = database || (await import("./db.mjs"));
  const {
    rows: [user],
  } = await query(
    "SELECT id, username, email, avatar, created_at, role, account_status, session_version, password_change_required FROM users WHERE id = $1",
    [claims.sub],
  );
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  if (user.account_status === "suspended")
    throw new ApiError(
      401,
      "This account is suspended. Contact the site administrator.",
    );
  if ((claims.sv || 0) !== user.session_version)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  return publicUser(user);
}

export async function requireAdmin(
  request,
  { allowPasswordChange = false, database } = {},
) {
  const user = await requireUser(request, database);
  if (user.role !== "admin")
    throw new ApiError(403, "Administrator access is required.");
  if (user.passwordChangeRequired && !allowPasswordChange)
    throw new ApiError(
      428,
      "Replace your setup password to unlock administration.",
    );
  return user;
}

export function assertOwner(ownerId, userId) {
  const owner = String(ownerId || "");
  const user = String(userId || "");
  if (
    !uuidPattern.test(owner) ||
    !uuidPattern.test(user) ||
    owner.toLowerCase() !== user.toLowerCase()
  ) {
    throw new ApiError(403, "You do not have permission to change this item.");
  }
}
