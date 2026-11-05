import { query } from "@/lib/db.mjs";
import bcrypt from "bcryptjs";
import { createSessionToken, publicUser, sessionCookie } from "@/lib/auth.mjs";
import {
  ApiError,
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/lib/http.mjs";
import { validateSignin } from "@/lib/validation.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";

// Equal-cost password check for missing users; this is a dummy hash, not a credential.
const DUMMY_HASH =
  "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { identifier, password } = validateSignin(await readJson(request));
    await rateLimit(request, "signin", 30);
    const statement = identifier.includes("@")
      ? "SELECT id, username, email, avatar, created_at, password_hash FROM users WHERE email = $1"
      : "SELECT id, username, email, avatar, created_at, password_hash FROM users WHERE username = $1";
    const {
      rows: [user],
    } = await query(statement, [identifier.toLowerCase()]);
    const valid = await bcrypt.compare(
      password,
      user?.password_hash || DUMMY_HASH,
    );
    if (!user || !valid)
      throw new ApiError(401, "Incorrect username/email or password.");
    return jsonResponse(
      {
        success: true,
        message: "Signed in successfully.",
        user: publicUser(user),
      },
      200,
      {
        "Set-Cookie": sessionCookie(createSessionToken(user.id)),
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
