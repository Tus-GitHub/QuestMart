"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { checkSession } from "@/redux/user/userSlice";

export default function ClientInitializer() {
  const dispatch = useDispatch();

  useEffect(() => {
    const request = dispatch(checkSession());
    return () => request.abort();
  }, [dispatch]);

  return null;
}
