import { create } from "zustand";

export const gameStore = create((set, get) => ({
    games: [],
    loading: false,
    error: null,
    hasFetched: false,
    fetchGames: async ({ force = false } = {}) => {
        if (get().loading || (get().hasFetched && !force)) return;
        set({ loading: true, error: null });

        const apiKey = process.env.NEXT_PUBLIC_ROWG_KEY;
        if (!apiKey) {
            set({ loading: false, error: "The game catalog is not configured yet. Please try again later." });
            return;
        }

        const gamesById = new Map();
        try {
            // Bound the initial catalog to 120 games; never request thousands at once.
            for (let page = 1; page <= 3; page++) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                let data;
                try {
                    const res = await fetch(
                        `https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey)}&page_size=40&page=${page}`,
                        { signal: controller.signal }
                    );
                    if (!res.ok) throw new Error("Catalog request failed");
                    data = await res.json();
                    if (!Array.isArray(data?.results)) throw new Error("Invalid catalog response");
                } finally {
                    clearTimeout(timeout);
                }

                for (const game of data.results) {
                    if (game && Number.isFinite(game.id) && typeof game.name === "string") {
                        gamesById.set(game.id, game);
                    }
                }
                if (!data.next || data.results.length === 0) break;
            }
            set({ games: [...gamesById.values()], hasFetched: true, loading: false, error: null });
        } catch {
            set({ loading: false, error: "We couldn’t load the game catalog. Check your connection and try again." });
        }
    },
}));
