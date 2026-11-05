import { load } from "cheerio";
import { catalog } from "../data/catalog.mjs";

// Steam's storefront accepts 25-result page boundaries; other offsets reset to zero.
export const PAGE_SIZE = 25;
const tags = {
  Action: "19",
  Adventure: "21",
  RPG: "122",
  Racing: "699",
  Indie: "492",
  Strategy: "9",
  Sports: "701",
  Shooter: "1774",
};
export function catalogQuery(params) {
  const page = Math.min(
    1000,
    Math.max(1, Number.parseInt(params.get("page"), 10) || 1),
  );
  const search = (params.get("search") || "").trim().slice(0, 100);
  const genre = Object.hasOwn(tags, params.get("genre"))
    ? params.get("genre")
    : "All games";
  return { page, search, genre };
}
export function storeSearchUrl({ page, search, genre }) {
  const url = new URL("https://store.steampowered.com/search/results/");
  url.search = new URLSearchParams({
    start: String((page - 1) * PAGE_SIZE),
    count: String(PAGE_SIZE),
    term: search,
    category1: "998",
    infinite: "1",
    cc: "in",
    l: "english",
    supportedlang: "english",
    ...(tags[genre] ? { tags: tags[genre] } : {}),
  }).toString();
  return url;
}
export function parseStoreCatalog(payload, query) {
  if (
    typeof payload.results_html !== "string" ||
    !Number.isFinite(Number(payload.total_count))
  )
    throw new Error("Invalid store response");
  if (Number(payload.start) !== (query.page - 1) * PAGE_SIZE)
    throw new Error("Store returned the wrong page");
  const $ = load(payload.results_html);
  const results = [];
  const seen = new Set();
  $("a.search_result_row[data-ds-appid]").each((_, element) => {
    const row = $(element);
    const id = Number(row.attr("data-ds-appid"));
    const name = row.find(".title").text().trim();
    if (!Number.isSafeInteger(id) || id < 1 || !name || seen.has(id)) return;
    seen.add(id);
    const featured = catalog.find((game) => game.id === id);
    const imageUrl = row.find(".search_capsule img").attr("src");
    let image = "/games/placeholder.svg";
    try {
      const parsed = new URL(imageUrl);
      if (
        parsed.protocol === "https:" &&
        parsed.hostname.endsWith(".steamstatic.com")
      )
        image = parsed.href;
    } catch {
      /* Keep a local fallback for malformed upstream artwork. */
    }
    const priceText = row.find(".discount_final_price").first().text().trim();
    // A free base game can carry a paid upgrade's data-price-final. Use visible price text.
    const price = /^free(?: to play)?$/i.test(priceText)
      ? "Free to play"
      : /^₹[\d,.]+$/.test(priceText)
        ? priceText
        : null;
    const release = row.find(".search_released").text().trim();
    const platforms = [
      row.find(".platform_img.win").length ? "PC" : null,
      row.find(".platform_img.mac").length ? "Mac" : null,
      row.find(".platform_img.linux").length ? "Linux" : null,
    ].filter(Boolean);
    results.push({
      id,
      slug: `steam-${id}`,
      name,
      image: featured?.image || image,
      hero: featured?.hero || image,
      genre:
        featured?.genre ||
        (query.genre === "All games" ? "PC game" : query.genre),
      year: release.match(/\b(?:19|20)\d{2}\b/)?.[0] || "Coming soon",
      platforms: platforms.length ? platforms : ["PC"],
      tagline: featured?.tagline || "Your next adventure starts here.",
      description:
        featured?.description ||
        "Explore this title on its official Steam store page for gameplay, system requirements, supported languages, and purchase options.",
      color: featured?.color || "#c1ef76",
      sourceUrl: `https://store.steampowered.com/app/${id}/`,
      price,
      store: "Steam",
      release,
    });
  });
  const count = Number(payload.total_count);
  if (count > 0 && results.length === 0)
    throw new Error("Store markup changed");
  return {
    results,
    count,
    page: query.page,
    hasMore: query.page * PAGE_SIZE < count,
    source: "steam",
    fallback: false,
  };
}
export function editorialFallback(query) {
  const results = catalog.filter(
    (game) =>
      game.name.toLowerCase().includes(query.search.toLowerCase()) &&
      (query.genre === "All games" || game.genre === query.genre),
  );
  return {
    results: query.page === 1 ? results : [],
    count: results.length,
    page: query.page,
    hasMore: false,
    source: "editorial",
    fallback: true,
    message:
      "The full store catalog is temporarily unavailable. Showing matching featured picks. Retry to browse the full library.",
  };
}
