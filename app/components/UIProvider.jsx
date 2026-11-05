"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import AuthModal from "./AuthModal";

const UIContext = createContext(null);
export function useUI() {
  return useContext(UIContext);
}
export default function UIProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState([]);
  useEffect(() => {
    try {
      const ids = JSON.parse(
        localStorage.getItem("questmart:saved:v1") || "[]",
      );
      if (Array.isArray(ids))
        setSaved(ids.filter(Number.isSafeInteger).slice(0, 120));
    } catch {}
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const toggleSaved = useCallback((id) => {
    setSaved((previous) => {
      const next = previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id];
      try {
        localStorage.setItem("questmart:saved:v1", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  return (
    <UIContext.Provider
      value={{
        openAuth: (mode = "signin") => setAuth(mode),
        notify: setToast,
        saved,
        toggleSaved,
      }}
    >
      {children}
      {auth ? (
        <AuthModal initialMode={auth} onClose={() => setAuth(null)} />
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          <CheckCircleIcon />
          {toast}
        </div>
      ) : null}
    </UIContext.Provider>
  );
}
