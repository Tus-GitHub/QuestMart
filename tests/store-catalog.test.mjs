import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogQuery,
  storeSearchUrl,
  parseStoreCatalog,
  editorialFallback,
} from "../lib/store-catalog.mjs";

test("store search clamps pages, encodes search, and accepts only known genres", () => {
  const query = catalogQuery(
    new URLSearchParams({
      page: "-2",
      search: "Elden & Ring",
      genre: "<script>",
    }),
  );
  assert.equal(query.page, 1);
  assert.equal(query.genre, "All games");
  assert.equal(storeSearchUrl(query).searchParams.get("term"), "Elden & Ring");
  assert.equal(
    storeSearchUrl({ ...query, page: 2 }).searchParams.get("start"),
    "25",
  );
});
test("normalizes store HTML without executing it or confusing free games with paid upgrades", () => {
  const html = `<a class="search_result_row" data-ds-appid="730"><div class="search_capsule"><img src="https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg"></div><span class="title">Game &amp; Friends</span><span class="platform_img win"></span><div class="search_released">21 Aug, 2012</div><div data-price-final="137000"><div class="discount_final_price free">Free</div></div></a>`;
  const result = parseStoreCatalog(
    { results_html: html, total_count: 100, start: 0 },
    { page: 1, genre: "All games" },
  );
  assert.equal(result.results[0].name, "Game & Friends");
  assert.equal(result.results[0].price, "Free to play");
  assert.equal(
    result.results[0].sourceUrl,
    "https://store.steampowered.com/app/730/",
  );
  assert.equal(result.hasMore, true);
  assert.equal(result.results[0].year, "2012");
  assert.throws(() =>
    parseStoreCatalog(
      { results_html: html, total_count: 100, start: 0 },
      { page: 2, genre: "All games" },
    ),
  );
});
test("changed markup fails explicitly and fallback stays honest about limited results", () => {
  assert.throws(() =>
    parseStoreCatalog(
      { results_html: "upstream error", total_count: 100 },
      { page: 1 },
    ),
  );
  const result = editorialFallback({
    page: 1,
    search: "Elden",
    genre: "All games",
  });
  assert.equal(result.fallback, true);
  assert.equal(result.results.length, 1);
  assert.equal(result.hasMore, false);
  assert.equal(
    editorialFallback({ page: 2, search: "", genre: "All games" }).results
      .length,
    0,
  );
});
