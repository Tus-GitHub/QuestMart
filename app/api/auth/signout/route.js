import { sessionCookie } from "@/lib/auth.mjs";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/lib/http.mjs";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    return jsonResponse({ success: true, message: "Signed out successfully." }, 200, {
      "Set-Cookie": sessionCookie("", 0),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
