"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "./UIProvider";

function visibleBox(element) {
  if (!element?.isConnected) return null;
  const box = element.getBoundingClientRect();
  return box.width > 0 &&
    box.height > 0 &&
    box.bottom > 0 &&
    box.top < innerHeight
    ? box
    : null;
}
export default function useCinematicDialog(origin, onClose) {
  const { motionDisabled } = useUI();
  const flight = useRef(null),
    animation = useRef(null),
    frame = useRef(0),
    closing = useRef(false),
    alive = useRef(true);
  const [leaving, setLeaving] = useState(false);
  const open = useCallback(() => {
    frame.current = requestAnimationFrame(() => {
      if (!flight.current || motionDisabled) return;
      const from = visibleBox(origin),
        to = flight.current.getBoundingClientRect();
      animation.current = flight.current.animate(
        [
          {
            transform: from
              ? `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`
              : "translateY(40px) scale(.9)",
            opacity: 0.45,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: 780, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    });
  }, [origin, motionDisabled]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelAnimationFrame(frame.current);
      animation.current?.cancel();
    };
  }, []);
  async function close() {
    if (closing.current) return;
    closing.current = true;
    cancelAnimationFrame(frame.current);
    animation.current?.cancel();
    if (motionDisabled || !flight.current) {
      onClose();
      return;
    }
    setLeaving(true);
    const from = flight.current.getBoundingClientRect(),
      to = visibleBox(origin);
    animation.current = flight.current.animate(
      [
        { transform: "none", opacity: 1 },
        {
          transform: to
            ? `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})`
            : "translateY(20px) scale(.94)",
          opacity: 0,
        },
      ],
      { duration: 320, easing: "cubic-bezier(.4,0,.8,.5)", fill: "forwards" },
    );
    await animation.current.finished.catch(() => {});
    if (alive.current) onClose();
  }
  return { flight, open, close, leaving };
}
