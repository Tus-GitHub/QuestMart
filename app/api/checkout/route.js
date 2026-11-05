import { ApiError, errorResponse } from "@/lib/http.mjs";
export async function POST() {
  return errorResponse(
    new ApiError(
      503,
      "Secure checkout is being configured. Purchases are not open yet.",
    ),
  );
}
