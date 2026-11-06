"use client";

import { useEffect, useRef, useState } from "react";

// Keep the artwork visible before the optional GPU scene loads, and on devices
// where WebGL, data-saving settings, or reduced motion call for a static view.
function ControllerArtwork() {
  return (
    <svg className="scene-fallback" viewBox="0 0 600 400" fill="none">
      <ellipse
        cx="300"
        cy="225"
        rx="240"
        ry="83"
        stroke="#c1ef76"
        strokeOpacity=".25"
        transform="rotate(-18 300 225)"
      />
      <ellipse
        cx="300"
        cy="208"
        rx="222"
        ry="102"
        stroke="#8d9cff"
        strokeOpacity=".25"
        transform="rotate(25 300 208)"
      />
      <g transform="translate(115 103) rotate(-9 180 100)">
        <path
          d="M76 32C36 29 26 66 13 121L3 167C-6 209 29 226 58 191L92 154H272L307 191C336 226 371 209 362 167L352 121C339 66 329 29 289 32L244 41H121L76 32Z"
          fill="#101722"
          stroke="#c1ef76"
          strokeWidth="2"
        />
        <path
          d="M85 48H277C310 48 329 78 333 113C337 135 326 145 301 140L264 126H99L62 140C37 145 26 135 30 113C34 78 53 48 85 48Z"
          fill="#1e2a36"
          stroke="#465b66"
        />
        <circle
          cx="125"
          cy="135"
          r="26"
          fill="#080f16"
          stroke="#c1ef76"
          strokeWidth="3"
        />
        <circle
          cx="239"
          cy="135"
          r="26"
          fill="#080f16"
          stroke="#8d9cff"
          strokeWidth="3"
        />
        <path
          d="M71 65V105M51 85H91"
          stroke="#a9bdc9"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <circle cx="288" cy="66" r="9" fill="#c1ef76" />
        <circle cx="308" cy="87" r="9" fill="#8d9cff" />
        <circle cx="268" cy="87" r="9" fill="#72dde8" />
        <circle cx="288" cy="108" r="9" fill="#d79cdb" />
        <rect
          x="144"
          y="57"
          width="77"
          height="47"
          rx="10"
          fill="#0d151e"
          stroke="#435b63"
        />
        <circle cx="182" cy="80" r="12" stroke="#c1ef76" strokeWidth="3" />
        <path d="M188 85L199 96" stroke="#c1ef76" strokeWidth="3" />
      </g>
    </svg>
  );
}

export default function HeroScene({ paused }) {
  const host = useRef(null);
  const engine = useRef(null);
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState("static");

  useEffect(() => {
    pausedRef.current = paused;
    engine.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const element = host.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let loading = false;
    let failed = false;
    let visible = false;
    let timer;

    async function load() {
      if (
        disposed ||
        loading ||
        failed ||
        !visible ||
        preference.matches ||
        engine.current ||
        navigator.connection?.saveData
      )
        return;
      loading = true;
      try {
        const { createHeroScene } = await import("@/lib/hero-scene.mjs");
        if (disposed || preference.matches || !visible) return;
        engine.current = createHeroScene(element, {
          paused: pausedRef.current,
          onUnavailable: () => {
            if (!disposed) setStatus("static");
          },
        });
        setStatus("ready");
      } catch {
        failed = true;
        if (!disposed) setStatus("static");
      } finally {
        loading = false;
      }
    }
    function configure() {
      clearTimeout(timer);
      if (preference.matches) {
        engine.current?.dispose();
        engine.current = null;
        setStatus("static");
      } else {
        // Let the heading, navigation, and main artwork paint first.
        timer = setTimeout(load, 180);
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) configure();
    });
    observer.observe(element);
    preference.addEventListener("change", configure);
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      preference.removeEventListener("change", configure);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  return (
    <div className="hero-scene" data-scene={status} aria-hidden="true">
      <div className="scene-aura" />
      <div className="scene-stage" ref={host}>
        <ControllerArtwork />
      </div>
      <div className="scene-coordinate">
        <span>QM / PLAYER ONE</span>
        <span>01 — ∞</span>
      </div>
      <div className="scene-caption">
        <span className="scene-signal" />
        <span className="scene-pointer-hint">
          {status === "ready" && !paused
            ? "MOVE YOUR CURSOR. CHANGE YOUR PERSPECTIVE."
            : "MADE FOR YOUR NEXT ADVENTURE."}
        </span>
        <span className="scene-touch-hint">
          YOUR NEXT ADVENTURE STARTS HERE.
        </span>
      </div>
    </div>
  );
}
