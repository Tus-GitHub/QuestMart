import { marketplace } from "@/lib/marketplace-server.mjs";
import { requireUser } from "@/lib/auth.mjs";
import { ApiError, errorResponse, jsonResponse } from "@/lib/http.mjs";
export async function GET(request, { params }) {
  try {
    const user = await requireUser(request);
    return jsonResponse({
      success: true,
      order: await marketplace.order(user._id, (await params).id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST() {
  return errorResponse(
    new ApiError(503, "Payment confirmation is not enabled yet."),
  );
}
