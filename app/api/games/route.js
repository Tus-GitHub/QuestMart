import {
  catalogQuery,
  storeSearchUrl,
  parseStoreCatalog,
  editorialFallback,
} from "@/lib/store-catalog.mjs";
export async function GET(request) {
  const query = catalogQuery(new URL(request.url).searchParams);
  try {
    const response = await fetch(storeSearchUrl(query), {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 1800 },
    });
    if (!response.ok) throw new Error("Store unavailable");
    const data = parseStoreCatalog(await response.json(), query);
    return Response.json(data, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch {
    return Response.json(editorialFallback(query), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
