import { catalog } from "@/data/catalog.mjs";
export async function GET() {
  return Response.json(
    {
      results: catalog,
      source: "editorial",
      attribution:
        "Game artwork belongs to its respective publishers. Store references: Steam.",
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
