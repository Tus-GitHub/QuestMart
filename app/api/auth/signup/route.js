import { query } from "@/lib/db.mjs";
import bcrypt from "bcryptjs";
import {
  ApiError,
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/lib/http.mjs";
import { validateSignup } from "@/lib/validation.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { username, email, password } = validateSignup(
      await readJson(request),
    );
    await rateLimit(request, "signup", 10);
    await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
      [username, email, await bcrypt.hash(password, 12)],
    );
    return jsonResponse(
      { success: true, message: "Account created. You can now sign in." },
      201,
    );
  } catch (error) {
    if (error.code === "23505")
      return errorResponse(
        new ApiError(
          409,
          "An account with this email or username already exists.",
        ),
      );
    return errorResponse(error);
  }
}
