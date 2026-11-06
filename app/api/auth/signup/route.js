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
import { accountEmail } from "@/lib/account-email-server.mjs";
import { emailConfigured } from "@/lib/email.mjs";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { username, email, password } = validateSignup(
      await readJson(request),
    );
    await rateLimit(request, "signup", 10);
    if (!emailConfigured())
      throw new ApiError(
        503,
        "Account email is temporarily unavailable. Please try again later.",
      );
    await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
      [username, email, await bcrypt.hash(password, 12)],
    );
    const emailSent = await accountEmail.issue("verify", email);
    return jsonResponse(
      {
        success: true,
        requiresVerification: true,
        emailSent,
        message: emailSent
          ? "Account created. Check your inbox to verify your email before signing in."
          : "Account created, but delivery failed. Use Resend verification email in a minute.",
      },
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
