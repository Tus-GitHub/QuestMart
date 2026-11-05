"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { gameStore } from "@/app/store/gameStore";
import ListingItems from "@/app/component/ListingItems";

function ItemsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const genre = searchParams.get("genre") || "All";

    const [filteredGames, setFilteredGames] = useState(null);
    const [visibleCount, setVisibleCount] = useState(24);

    const allGames = gameStore(state => state.games);
    const loading = gameStore(state => state.loading);
    const error = gameStore(state => state.error);
    const hasFetched = gameStore(state => state.hasFetched);
    const fetchGames = gameStore(state => state.fetchGames);

    useEffect(() => {
        let result = allGames;
        if (genre !== "All") {
            result = result.filter(game => {
                if (!Array.isArray(game.genres)) return false;
                return game.genres.some(g =>
                    g?.name?.toLowerCase().includes(genre.toLowerCase()) ||
                    g?.slug?.toLowerCase().includes(genre.toLowerCase())
                );
            });
        }

        const unique = result.filter((g, i, self) => i === self.findIndex(x => x.id === g.id));
        setFilteredGames(unique);
        setVisibleCount(24);
    }, [genre, allGames]);

    const isLoading = loading || (!hasFetched && !error);
    const visible = filteredGames?.slice(0, visibleCount) || [];

    return (
        <div className="min-h-screen bg-black text-white px-4 md:px-8 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={() => router.push("/")}
                    className="text-gray-500 hover:text-white transition text-sm flex items-center gap-1"
                >
                    ‹ Home
                </button>
                <span className="text-gray-700">/</span>
                <h1 className="text-white text-2xl md:text-3xl font-bold">
                    {genre === "All" ? "All Games" : genre}
                </h1>
                {!isLoading && !error && filteredGames && (
                    <span className="text-gray-600 text-sm self-end mb-0.5">{filteredGames.length} titles</span>
                )}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 24 }).map((_, i) => (
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
            ) : visible.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {visible.map(game => (
                            <ListingItems games={game} key={game.id} />
                        ))}
                    </div>
                    {filteredGames && visibleCount < filteredGames.length && (
                        <div className="flex justify-center mt-10">
                            <button
                                onClick={() => setVisibleCount(v => v + 24)}
                                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-10 py-3 rounded-lg font-bold transition"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-24 text-gray-600">
                    <p className="text-4xl mb-3">🎮</p>
                    <p className="text-lg font-medium text-gray-400">No games found</p>
                    <p className="text-sm mt-1">{allGames.length ? "Try a different genre" : "The catalog is empty right now. Please check back later."}</p>
                </div>
            )}
        </div>
    );
}

export default function ItemPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
                Loading...
            </div>
        }>
            <ItemsContent />
        </Suspense>
    );
}
