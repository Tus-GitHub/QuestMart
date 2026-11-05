import test from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../data/catalog.mjs";
import fs from "node:fs/promises";
import { gameStore } from "../app/store/gameStore.js";
test("editorial catalog has unique entries and locally available artwork", async () => {
  assert.equal(new Set(catalog.map((g) => g.id)).size, catalog.length);
  for (const game of catalog) {
    await fs.access("public" + game.image);
    await fs.access("public" + game.hero);
    assert.ok(game.name && game.platforms.length);
  }
});
test("catalog works without RAWG and allows recovery after connection failure", async () => {
  const original = globalThis.fetch;
  try {
    gameStore.setState({
      games: [],
      loading: false,
      hasFetched: false,
      error: null,
    });
    globalThis.fetch = async () => ({ ok: false });
    await gameStore.getState().fetchGames();
    assert.equal(gameStore.getState().loading, false);
    assert.ok(gameStore.getState().error);
    globalThis.fetch = async (url) => {
      assert.equal(url, "/api/games");
      return { ok: true, json: async () => ({ results: catalog }) };
    };
    await gameStore.getState().fetchGames({ force: true });
    assert.equal(gameStore.getState().games.length, catalog.length);
    assert.equal(gameStore.getState().error, null);
  } finally {
    globalThis.fetch = original;
  }
});
