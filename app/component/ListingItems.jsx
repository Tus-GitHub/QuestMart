'use client';

import { useEffect, useState } from "react";

function estimatedPrice(game) {
    const basePrice = 1000;
    const ratingBoost = (game.rating || 3) * 200;
    const platforms = game.platforms?.map(p => p.platform.name.toLowerCase()) || [];
    const isConsole = platforms.some(p => p.includes("playstation") || p.includes("xbox"));
    const platformBoost = isConsole ? 2000 : 1000;
    const releaseYear = parseInt(game.released?.slice(0, 4)) || 2020;
    const yearPenalty = (2025 - releaseYear) * 50;
    return Math.max(199, Math.round(basePrice + ratingBoost + platformBoost - yearPenalty));
}

export default function ListingItems({ games }) {
    const [priceState, setPriceState] = useState({
        loading: true,
        formatted: null,
        isFree: false,
        isReal: false,
    });

    useEffect(() => {
        if (!games?.id) return;

        let cancelled = false;
        async function fetchPrice() {
            try {
                const res = await fetch(
                    `/api/games/price?gameId=${games.id}&name=${encodeURIComponent(games.name)}`
                );
                const data = await res.json();
                if (cancelled) return;

                if (data.success) {
                    setPriceState({
                        loading: false,
                        formatted: data.priceFormatted,
                        isFree: data.isFree,
                        isReal: true,
                    });
                } else {
                    // Not on Steam — fall back to estimate
                    setPriceState({
                        loading: false,
                        formatted: `~₹${estimatedPrice(games).toLocaleString()}`,
                        isFree: false,
                        isReal: false,
                    });
                }
            } catch {
                if (!cancelled) {
                    setPriceState({
                        loading: false,
                        formatted: `~₹${estimatedPrice(games).toLocaleString()}`,
                        isFree: false,
                        isReal: false,
                    });
                }
            }
        }

        fetchPrice();
        return () => { cancelled = true; };
    }, [games]);

    const genres = games.genres?.slice(0, 2).map(g => g.name).join(", ") || "Unknown";

    return (
        <div className="group relative bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(220,38,38,0.45)] border border-gray-800 hover:border-red-700">

            {/* Image */}
            <div className="relative overflow-hidden">
                <img
                    src={games.background_image}
                    alt={games.name}
                    className="w-full h-36 md:h-44 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                {games.rating > 0 && (
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        ★ {games.rating.toFixed(1)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-1.5">
                <div className="relative group/name">
                    <p className="truncate text-white text-sm font-semibold leading-snug">{games.name}</p>
                    <div className="absolute left-0 top-full z-20 mt-1 hidden group-hover/name:block w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl border border-gray-700 whitespace-normal">
                        {games.name}
                    </div>
                </div>

                <p className="text-gray-400 text-xs truncate">{genres}</p>

                {/* Price */}
                <div className="pt-1 flex items-center justify-between">
                    {priceState.loading ? (
                        <div className="h-6 w-16 bg-gray-700 rounded-md animate-pulse" />
                    ) : priceState.isFree ? (
                        <span className="bg-green-700 text-white text-xs px-2.5 py-1 rounded-md font-bold">
                            Free
                        </span>
                    ) : (
                        <span
                            title={priceState.isReal ? "Steam price" : "Estimated price"}
                            className={`text-white text-xs px-2.5 py-1 rounded-md font-bold ${
                                priceState.isReal ? "bg-red-700" : "bg-gray-700"
                            }`}
                        >
                            {priceState.formatted}
                        </span>
                    )}
                    {games.released && (
                        <span className="text-gray-600 text-xs">{games.released?.slice(0, 4)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
