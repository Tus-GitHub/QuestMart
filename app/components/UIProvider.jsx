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
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const motionDisabled = !motionReady || motionPaused || reducedMotion;
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(preference.matches);
    const syncStorage = (event) => {
      if (event.key === "questmart:motion-paused:v1")
        setMotionPaused(event.newValue === "true");
    };
    syncPreference();
    try {
      setMotionPaused(
        localStorage.getItem("questmart:motion-paused:v1") === "true",
      );
    } catch {}
    setMotionReady(true);
    preference.addEventListener("change", syncPreference);
    window.addEventListener("storage", syncStorage);
    return () => {
      preference.removeEventListener("change", syncPreference);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = motionDisabled ? "off" : "on";
  }, [motionDisabled]);
  const toggleMotion = useCallback(() => {
    setMotionPaused((previous) => {
      try {
        localStorage.setItem("questmart:motion-paused:v1", String(!previous));
      } catch {}
      return !previous;
    });
  }, []);
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
        motionDisabled,
        motionReady,
        reducedMotion,
        toggleMotion,
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
