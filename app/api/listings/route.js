import { marketplace } from "@/lib/marketplace-server.mjs";
import { requireUser } from "@/lib/auth.mjs";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/lib/http.mjs";
import { rateLimit } from "@/lib/rate-limit.mjs";
export async function GET(request) {
  try {
    const p = new URL(request.url).searchParams;
    const mine =
      p.get("mine") === "true" ? (await requireUser(request))._id : null;
    return jsonResponse({
      success: true,
      ...(await marketplace.list({
        search: p.get("q") || "",
        platform: p.get("platform"),
        sort: p.get("sort"),
        page: p.get("page"),
        mine,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    await rateLimit(request, "listing-create", 20, user._id);
    return jsonResponse(
      {
        success: true,
        listing: await marketplace.create(user._id, await readJson(request)),
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
