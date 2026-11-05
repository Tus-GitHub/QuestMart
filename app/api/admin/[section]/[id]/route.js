import { requireAdmin } from "@/lib/auth.mjs";
import { adminService } from "@/lib/admin-server.mjs";
import {
  assertSameOrigin,
  readJson,
  errorResponse,
  jsonResponse,
} from "@/lib/http.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";
export async function GET(request, context) {
  try {
    await requireAdmin(request);
    const { section, id } = await context.params;
    return jsonResponse({
      success: true,
      item: await adminService.detail(section, id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request, context) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdmin(request);
    await rateLimit(request, "admin-mutation", 60, actor._id);
    const { section, id } = await context.params;
    return jsonResponse({
      success: true,
      ...(await adminService.mutate(
        actor,
        section,
        id,
        await readJson(request),
      )),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
