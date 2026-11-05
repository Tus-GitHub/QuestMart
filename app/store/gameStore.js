import { create } from "zustand";
export const gameStore = create((set, get) => ({
  games: [],
  loading: false,
  error: null,
  hasFetched: false,
  fetchGames: async ({ force = false } = {}) => {
    if (get().loading || (get().hasFetched && !force)) return;
    set({ loading: true, error: null });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/games", { signal: controller.signal });
      if (!response.ok) throw new Error("Catalog unavailable");
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error("Invalid catalog");
      const unique = new Map();
      for (const game of data.results.slice(0, 120)) {
        if (game && Number.isFinite(game.id) && typeof game.name === "string")
          unique.set(game.id, game);
      }
      set({
        games: [...unique.values()],
        hasFetched: true,
        loading: false,
        error: null,
      });
    } catch {
      set({
        loading: false,
        error: "We couldn’t load the library. Please try again.",
      });
    } finally {
      clearTimeout(timeout);
    }
  },
}));
