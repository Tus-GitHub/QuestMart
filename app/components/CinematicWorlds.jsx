"use client";

import { useEffect, useRef, useState } from "react";

export default function CinematicWorlds({
  games,
  paused,
  controller,
  progress,
}) {
  const host = useRef(null),
    pausedRef = useRef(paused),
    requestLoad = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    pausedRef.current = paused;
    controller.current?.setPaused(paused);
    if (!paused) requestLoad.current?.();
  }, [paused, controller]);
  useEffect(() => {
    const element = host.current;
    let disposed = false,
      loading = false,
      visible = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    async function load() {
      if (
        disposed ||
        loading ||
        controller.current ||
        !visible ||
        pausedRef.current ||
        preference.matches ||
        navigator.connection?.saveData
      )
        return;
      loading = true;
      try {
        const { createWorldScene } = await import("@/lib/journey-scene.mjs");
        if (disposed || preference.matches) return;
        controller.current = createWorldScene(element, games, {
          paused: pausedRef.current,
          onReady: () => {
            if (!disposed) setReady(true);
          },
          onUnavailable: () => {
            if (!disposed) setReady(false);
          },
        });
        controller.current.setProgress(progress.current);
      } catch {
        if (!disposed) setReady(false);
      }
    }
    requestLoad.current = load;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) load();
    });
    observer.observe(element);
    return () => {
      disposed = true;
      requestLoad.current = null;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [games, controller, progress]);
  return (
    <div
      className="cinematic-world-scene"
      data-ready={ready}
      ref={host}
      aria-hidden="true"
    />
  );
}
