"use client";
import { useEffect } from "react";
import { gameStore } from "./store/gameStore";

export default function ClientInitializer() {
  const fetchGames = gameStore(state => state.fetchGames);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return null;
}
