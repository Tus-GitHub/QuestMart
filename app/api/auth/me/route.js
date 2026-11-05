import { requireUser } from "@/lib/auth.mjs";
import { errorResponse, jsonResponse } from "@/lib/http.mjs";

export async function GET(request) {
  try {
    return jsonResponse({ success: true, user: await requireUser(request) });
  } catch (error) {
    return errorResponse(error);
  }
}
