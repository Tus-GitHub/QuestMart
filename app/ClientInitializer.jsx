"use client";
import { useEffect } from "react";
import { gameStore } from "./store/gameStore";
import { useDispatch } from "react-redux";
import { checkSession } from "@/redux/user/userSlice";

export default function ClientInitializer() {
  const fetchGames = gameStore(state => state.fetchGames);
  const dispatch = useDispatch();

  useEffect(() => {
    const request = dispatch(checkSession());
    return () => request.abort();
  }, [dispatch]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return null;
}
