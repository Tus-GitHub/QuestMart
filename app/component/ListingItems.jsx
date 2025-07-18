'use client';

export default function ListingItems({games}){
    return (
        <div className="bg-[#282828] md:h-72 md:w-56 h-52 w-26 md:text-base text-xs">
            <img 
                src={games.image}
                className="md:w-56 md:h-52 w-26 h-32"
            />
            <p>{games.name}</p>
            <p>Genre: {games.genre}</p>
            <p>Rs. {games.price}</p>
        </div>
    )
}