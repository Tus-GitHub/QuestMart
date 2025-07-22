'use client';

export default function ListingItems({games}){
    function getEstimatedLaunchPrice(game) {
        const basePrice = 1000;

        const rating = game.rating || 3;
        const ratingBoost = rating * 200;

        const platforms = game.platforms?.map(p => p.platform.name.toLowerCase()) || [];
        const isConsole = platforms.some(p => p.includes("playstation") || p.includes("xbox"));
        const platformBoost = isConsole ? 2000 : 1000;

        const releaseYear = parseInt(game.released?.slice(0, 4)) || 2020;
        const yearPenalty = (2025 - releaseYear) * 50; 

        const estimatedLaunchPrice = basePrice + ratingBoost + platformBoost  - yearPenalty;

        return Math.round(estimatedLaunchPrice);
    }
    return (
        <div className="bg-[#282828] md:h-72 md:w-56 h-52 w-26 md:text-base text-xs">
            <img 
                src={games.background_image}
                className="md:w-56 md:h-52 w-26 h-32"
            />
            <div className="space-y-1">
                <div className="relative group w-fit max-w-[180px]">
                    <p className="truncate text-white cursor-default">
                        {games.name}
                    </p>
                    <div className="absolute left-0 top-full z-10 mt-1 hidden w-max max-w-xs bg-black text-white text-xs rounded px-2 py-1 group-hover:block whitespace-normal shadow-lg">
                        {games.name}
                    </div>
                </div>

                <div className="relative group w-fit max-w-[180px]">
                    <p className="truncate text-gray-300 cursor-default">
                        Genre:{" "}
                        {games.genres.slice(0, 2).map((genre, i) => (
                            <span key={i}>
                            {genre.name}
                            {i < 1 && games.genres.length > 1 ? ", " : ""}
                            </span>
                        ))}
                        {games.genres.length > 2 && " ..."}
                    </p>
                    <div className="absolute left-0 top-full z-10 mt-1 hidden w-max max-w-xs bg-black text-white text-xs rounded px-2 py-1 group-hover:block whitespace-normal shadow-lg">
                        Genre: {games.genres.map((g) => g.name).join(", ")}
                    </div>
                </div>
            </div>
            <p>Rs. {getEstimatedLaunchPrice(games)}</p>
        </div>
    )
}