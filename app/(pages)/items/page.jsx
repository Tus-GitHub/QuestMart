"use client"

import { useSearchParams } from "next/navigation"

export default function ItemPage(){
    const searchParams = useSearchParams();
    const genre = searchParams.get("genre") || "";

    return(
        <div className="text-white">
            <div className="text-5xl pt-6 pl-8">{genre}</div>
        </div>
    )
}