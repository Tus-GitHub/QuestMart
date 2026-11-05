import {
  requireAdmin,
  publicUser,
  createSessionToken,
  sessionCookie,
} from "@/lib/auth.mjs";
import { adminService } from "@/lib/admin-server.mjs";
import { adminFilters } from "@/lib/admin.mjs";
import {
  assertSameOrigin,
  readJson,
  errorResponse,
  jsonResponse,
  ApiError,
} from "@/lib/http.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";
export async function GET(request, context) {
  try {
    const { section } = await context.params;
    const user = await requireAdmin(request, {
      allowPasswordChange: section === "security",
    });
    if (section === "security") return jsonResponse({ success: true, user });
    const data =
      section === "overview"
        ? await adminService.overview()
        : await adminService.list(
            section,
            adminFilters(new URL(request.url).searchParams),
          );
    return jsonResponse({ success: true, ...data });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request, context) {
  try {
    assertSameOrigin(request);
    const { section } = await context.params;
    const actor = await requireAdmin(request, {
      allowPasswordChange: section === "security",
    });
    if (section !== "security")
      throw new ApiError(405, "This action is not supported.");
    await rateLimit(request, "admin-password", 10, actor._id);
    const user = await adminService.changePassword(
      actor,
      await readJson(request),
    );
    return jsonResponse({ success: true, user: publicUser(user) }, 200, {
      "Set-Cookie": sessionCookie(
        createSessionToken(user.id, user.session_version),
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
