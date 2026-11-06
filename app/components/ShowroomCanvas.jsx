"use client";
import { useEffect, useRef, useState } from "react";
import { useUI } from "./UIProvider";

export default function ShowroomCanvas({
  mode,
  images,
  title,
  color,
  controller,
  covered = false,
  onSide,
  onReadyChange,
}) {
  const host = useRef(null),
    callbacks = useRef({ onSide, onReadyChange });
  callbacks.current = { onSide, onReadyChange };
  const { motionDisabled } = useUI();
  const paused = motionDisabled || covered,
    pausedRef = useRef(paused);
  const loadRef = useRef(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    pausedRef.current = paused;
    controller.current?.setPaused(paused);
    if (!paused) loadRef.current?.();
  }, [paused, controller]);
  useEffect(() => {
    let disposed = false,
      loading = false,
      visible = false;
    const element = host.current;
    function readyChange(value) {
      if (!disposed) {
        setReady(value);
        callbacks.current.onReadyChange?.(value);
      }
    }
    async function load() {
      if (
        disposed ||
        loading ||
        controller.current ||
        !visible ||
        pausedRef.current ||
        navigator.connection?.saveData
      )
        return;
      loading = true;
      try {
        const { createShowroom } = await import("@/lib/showroom-scene.mjs");
        if (disposed) return;
        controller.current = createShowroom(element, {
          mode,
          images,
          title,
          color,
          onSide: (value) => callbacks.current.onSide?.(value),
          onReady: () => readyChange(true),
          onUnavailable: () => readyChange(false),
        });
        controller.current.setPaused(pausedRef.current);
      } catch {
        readyChange(false);
      }
    }
    loadRef.current = load;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) load();
    });
    observer.observe(element);
    return () => {
      disposed = true;
      loadRef.current = null;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [mode, images, title, color, controller]);
  return (
    <div
      ref={host}
      className="showroom-canvas"
      data-ready={ready}
      data-motion-off={motionDisabled}
      aria-hidden="true"
    />
  );
}
