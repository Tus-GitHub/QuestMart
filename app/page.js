'use client';

import { useEffect, useState } from "react";
import ListingItems from "./component/ListingItems";
import { useRouter } from "next/navigation";
import { gameStore } from "./store/gameStore";

const GENRES = ["All", "Action", "Adventure", "Shooter", "RPG", "Sports", "Indie", "Strategy"];

export default function Home() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("All");
    const [filteredGames, setFilteredGames] = useState(null);
    const router = useRouter();
    const allGames = gameStore(state => state.games);
    const loading = gameStore(state => state.loading);
    const error = gameStore(state => state.error);
    const hasFetched = gameStore(state => state.hasFetched);
    const fetchGames = gameStore(state => state.fetchGames);

    useEffect(() => {
        let result = allGames;

        if (selectedGenre !== "All") {
            result = result.filter(game => {
                if (!Array.isArray(game.genres)) return false;
                return game.genres.some(g =>
                    g?.name?.toLowerCase().includes(selectedGenre.toLowerCase()) ||
                    g?.slug?.toLowerCase().includes(selectedGenre.toLowerCase())
                );
            });
        }

        if (searchQuery.trim()) {
            result = result.filter(g =>
                g.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const unique = result.filter((g, i, self) => i === self.findIndex(x => x.id === g.id));
        setFilteredGames(unique);
    }, [selectedGenre, allGames, searchQuery]);

    const isLoading = loading || (!hasFetched && !error);

    return (
        <div className="flex flex-col bg-black min-h-screen">

            {/* ── Hero ── */}
            <div className="relative h-[480px] md:h-[580px] flex items-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-105"
                    style={{ backgroundImage: "url('/Front-page.jpg')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                <div className="relative z-10 px-6 md:px-16 max-w-2xl">
                    <p className="text-red-500 text-xs md:text-sm uppercase tracking-[0.2em] font-semibold mb-3">
                        The Ultimate Game Marketplace
                    </p>
                    <h1 className="text-3xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                        Turn Old Games Into<br />
                        <span className="text-red-500">New Adventures</span>
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base mb-8 max-w-md">
                        Buy and sell pre-owned games at the best prices. Thousands of titles across all platforms.
                    </p>
                    <div className="flex gap-3">
                        <button className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-red-900/50 text-sm md:text-base">
                            SELL GAMES
                        </button>
                        <button onClick={() => router.push("/items")} className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg font-bold border border-white/20 hover:border-white/40 transition-all text-sm md:text-base">
                            BROWSE
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Catalog ── */}
            <div className="px-4 md:px-8 py-8">

                {/* Search */}
                <div className="relative mb-6 max-w-lg">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base select-none">🔍</span>
                    <input
                        type="text"
                        placeholder="Search games..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#111] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-red-600 focus:bg-[#1a1a1a] transition-all text-sm"
                    />
                </div>

                {/* Genre pills */}
                <div className="flex gap-2 flex-wrap mb-8">
                    {GENRES.map(genre => (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                selectedGenre === genre
                                    ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/40"
                                    : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white"
                            }`}
                        >
                            {genre}
                        </button>
                    ))}
                </div>

                {/* Section header */}
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-white text-xl md:text-2xl font-bold">
                            {selectedGenre === "All" ? "All Games" : selectedGenre}
                        </h2>
                        {!isLoading && !error && filteredGames && (
                            <span className="text-gray-600 text-sm">{filteredGames.length} titles</span>
                        )}
                    </div>
                    <button
                        onClick={() => router.push(`/items?genre=${encodeURIComponent(selectedGenre)}`)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition flex items-center gap-1 group"
                    >
                        View All
                        <span className="transition-transform group-hover:translate-x-0.5">›</span>
                    </button>
                </div>

                {/* Game grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-16">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-xl overflow-hidden animate-pulse">
                                <div className="w-full h-36 md:h-44 bg-gray-800" />
                                <div className="p-3 space-y-2">
                                    <div className="h-3 bg-gray-700 rounded w-3/4" />
                                    <div className="h-2 bg-gray-800 rounded w-1/2" />
                                    <div className="h-5 bg-gray-700 rounded w-1/3 mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div role="alert" className="text-center py-20">
                        <p className="text-gray-400 mb-4">{error}</p>
                        <button onClick={() => fetchGames({ force: true })} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold transition">
                            Try again
                        </button>
                    </div>
                ) : filteredGames && filteredGames.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-16">
                        {filteredGames.slice(0, 18).map(game => (
                            <ListingItems games={game} key={game.id} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 text-gray-600">
                        <p className="text-4xl mb-3">🎮</p>
                        <p className="text-lg font-medium text-gray-400">No games found</p>
                        <p className="text-sm mt-1">{allGames.length ? "Try a different genre or search term" : "The catalog is empty right now. Please check back later."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
