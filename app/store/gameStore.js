import { create } from "zustand";

const API_KEY = process.env.NEXT_PUBLIC_ROWG_KEY;


export const gameStore = create((set, get) => ({
    games:[],
    hasFetched: false,
    fetchGames: async () => {
        if(get().hasFetched) return;
        let allGames = [];
        const totalPages = 3;
        try{
            for(let page = 1; page <= totalPages; page++){
                const res = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}&page_size=3000&page=${page}`);
                if(!res.ok){
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const data = await res.json();
                allGames = [...allGames, ...data.results];
            }
            set({games:allGames, hasFetched:true});
        } catch(error){
            console.log("Error fetching error",error);
        }
    }
}));