'use client';

export default function ListingItems(){
    return (
        <div className="bg-[#282828] md:h-72 md:w-56 h-52 w-26 md:text-base text-xs">
            <img 
                src="/GTA-V.jpg"
                className="md:w-56 md:h-52 w-26 h-32"
            />
            <p>Grand Theft Auto V</p>
            <p>Genre: Shooter, Action</p>
            <p>Rs. 1900</p>
        </div>
    )
}