import { marketplace } from "@/lib/marketplace-server.mjs";
import { requireUser } from "@/lib/auth.mjs";
import { errorResponse, jsonResponse } from "@/lib/http.mjs";
export async function GET(request) {
  try {
    const user = await requireUser(request);
    return jsonResponse({
      success: true,
      orders: await marketplace.orders(user._id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
