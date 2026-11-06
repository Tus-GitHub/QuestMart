import { accountEmail } from "@/lib/account-email-server.mjs";
import { recoveryEmail, resetPasswordInput } from "@/lib/account-email.mjs";
import { emailConfigured } from "@/lib/email.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";
import {
  ApiError,
  assertSameOrigin,
  readJson,
  jsonResponse,
  errorResponse,
} from "@/lib/http.mjs";
import { sessionCookie } from "@/lib/auth.mjs";
export const runtime = "nodejs";
export async function POST(request, context) {
  try {
    assertSameOrigin(request);
    const { action } = await context.params;
    if (!["forgot", "resend", "verify", "reset"].includes(action))
      throw new ApiError(404, "Unknown account action.");
    await rateLimit(request, `email-${action}`, 20);
    const body = await readJson(request);
    if (action === "forgot" || action === "resend") {
      if (!emailConfigured())
        throw new ApiError(
          503,
          "Email is temporarily unavailable. Please try again later.",
        );
      const email = recoveryEmail(body.email);
      await rateLimit(request, `email-recipient-${action}`, 4, email);
      await accountEmail.issue(action === "forgot" ? "reset" : "verify", email);
      return jsonResponse({
        success: true,
        message:
          action === "forgot"
            ? "If an active account uses that email, a reset link will arrive shortly. Check spam too."
            : "If this email needs verification, a new link will arrive shortly. Check spam too.",
      });
    }
    if (action === "verify") {
      await accountEmail.redeem("verify", body.token);
      return jsonResponse({
        success: true,
        message:
          "Email verified. Your player account is ready. You can sign in now.",
      });
    }
    const password = resetPasswordInput(body.password, body.confirmPassword);
    await accountEmail.redeem("reset", body.token, password);
    return jsonResponse(
      {
        success: true,
        message:
          "Password updated. Previous sessions are signed out. Sign in with your new password.",
      },
      200,
      { "Set-Cookie": sessionCookie("", 0) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
