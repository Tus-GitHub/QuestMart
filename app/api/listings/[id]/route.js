import { marketplace } from "@/lib/marketplace-server.mjs";
import { requireUser } from "@/lib/auth.mjs";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/lib/http.mjs";
export async function GET(_request, { params }) {
  try {
    return jsonResponse({
      success: true,
      listing: await marketplace.detail((await params).id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    return jsonResponse({
      success: true,
      listing: await marketplace.update(
        user._id,
        (await params).id,
        await readJson(request),
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await marketplace.remove(user._id, (await params).id);
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
