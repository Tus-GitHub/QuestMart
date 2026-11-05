import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { gameStore } from "../app/store/gameStore.js";

const originalFetch = globalThis.fetch;
const originalKey = process.env.NEXT_PUBLIC_ROWG_KEY;
const response = (results, next = null) => ({ ok: true, json: async () => ({ results, next }) });

beforeEach(() => {
  gameStore.setState({ games: [], loading: false, error: null, hasFetched: false });
  process.env.NEXT_PUBLIC_ROWG_KEY = "test-key";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_ROWG_KEY;
  else process.env.NEXT_PUBLIC_ROWG_KEY = originalKey;
});

test("empty catalog completes loading and does not refetch on remount", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response([]); };
  await gameStore.getState().fetchGames();
  const state = gameStore.getState();
  assert.equal(state.loading, false);
  assert.equal(state.hasFetched, true);
  assert.equal(state.error, null);
  assert.deepEqual(state.games, []);
  await state.fetchGames();
  assert.equal(calls, 1);
});

test("duplicate initializers share one in-flight catalog load", async () => {
  let finish;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  };
  const first = gameStore.getState().fetchGames();
  assert.equal(gameStore.getState().loading, true);
  await gameStore.getState().fetchGames();
  await gameStore.getState().fetchGames({ force: true });
  assert.equal(calls, 1);
  finish(response([{ id: 1, name: "Example" }]));
  await first;
  assert.equal(gameStore.getState().loading, false);
  assert.equal(gameStore.getState().games.length, 1);
});

test("catalog requests are bounded and duplicate/malformed game records are omitted", async () => {
  const urls = [];
  globalThis.fetch = async (url, options) => {
    urls.push(new URL(url));
    assert.ok(options.signal instanceof AbortSignal);
    return response([{ id: 1, name: "Example" }, { id: 2, name: "Other" }, null, { id: 3 }], "next-page");
  };
  await gameStore.getState().fetchGames();
  assert.equal(urls.length, 3);
  assert.deepEqual(urls.map(url => url.searchParams.get("page")), ["1", "2", "3"]);
  assert.ok(urls.every(url => url.searchParams.get("page_size") === "40"));
  assert.deepEqual(gameStore.getState().games.map(game => game.id), [1, 2]);
});

test("failed requests end loading, show an error, and can be retried successfully", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await gameStore.getState().fetchGames();
  assert.equal(gameStore.getState().loading, false);
  assert.equal(gameStore.getState().hasFetched, false);
  assert.match(gameStore.getState().error, /try again/);
  globalThis.fetch = async () => response([{ id: 1, name: "Recovered" }]);
  await gameStore.getState().fetchGames({ force: true });
  assert.equal(gameStore.getState().error, null);
  assert.equal(gameStore.getState().hasFetched, true);
  assert.equal(gameStore.getState().games[0].name, "Recovered");
});

test("malformed responses fail visibly instead of leaving a loading skeleton", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: null }) });
  await gameStore.getState().fetchGames();
  assert.equal(gameStore.getState().loading, false);
  assert.ok(gameStore.getState().error);
  assert.deepEqual(gameStore.getState().games, []);
});

test("a stalled catalog request is aborted after ten seconds and becomes retryable", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });
  const pending = gameStore.getState().fetchGames();
  t.mock.timers.tick(10000);
  await pending;
  assert.equal(gameStore.getState().loading, false);
  assert.equal(gameStore.getState().hasFetched, false);
  assert.match(gameStore.getState().error, /try again/);
});

test("missing configuration fails before making any external request", async () => {
  delete process.env.NEXT_PUBLIC_ROWG_KEY;
  let called = false;
  globalThis.fetch = async () => { called = true; return response([]); };
  await gameStore.getState().fetchGames();
  assert.equal(called, false);
  assert.equal(gameStore.getState().loading, false);
  assert.match(gameStore.getState().error, /not configured/);
});
