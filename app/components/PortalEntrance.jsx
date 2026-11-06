"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import Media from "./Media";
import { useUI } from "./UIProvider";

export default function PortalEntrance({ game, onClose, onEnter }) {
  const host = useRef(null);
  const engine = useRef(null);
  const callbacks = useRef({ onEnter });
  const { motionDisabled } = useUI();
  const [status, setStatus] = useState("loading");
  callbacks.current.onEnter = onEnter;

  useEffect(() => {
    let disposed = false;
    let fallbackTimer;
    function fallback() {
      if (disposed) return;
      setStatus("fallback");
      fallbackTimer = setTimeout(() => callbacks.current.onEnter(), 1800);
    }
    async function load() {
      if (motionDisabled || navigator.connection?.saveData) {
        setStatus("still");
        return;
      }
      try {
        const { createPortalScene } = await import("@/lib/portal-scene.mjs");
        if (disposed) return;
        engine.current = createPortalScene(host.current, {
          onFinish: () => callbacks.current.onEnter(),
          onUnavailable: fallback,
        });
        setStatus("flying");
      } catch {
        fallback();
      }
    }
    load();
    return () => {
      disposed = true;
      clearTimeout(fallbackTimer);
      engine.current?.dispose();
      engine.current = null;
    };
  }, [motionDisabled]);

  return (
    <Dialog
      label="Enter the QuestMart portal"
      className="portal-dialog"
      onClose={onClose}
    >
      <div className="portal-experience" data-status={status}>
        <div className="portal-destination">
          <Media src={game.hero} alt="" sizes="100vw" priority />
        </div>
        <div className="portal-fallback-ring" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="portal-engine" ref={host} aria-hidden="true" />
        <div className="portal-heading">
          <span className="eyebrow">QUESTMART / THE NEXT DIMENSION</span>
          <h2>
            Your next world
            <br />
            <em>is waiting.</em>
          </h2>
        </div>
        <div className="portal-departure">
          <span role="status">
            {status === "still"
              ? "Your next adventure starts here."
              : "Travelling to the game vault…"}
          </span>
          <button className="button glass" onClick={onEnter}>
            {status === "still" ? "Explore the vault" : "Skip to games"}
            <ArrowRightIcon />
          </button>
        </div>
        <div className="portal-flight-track" aria-hidden="true">
          <span />
        </div>
      </div>
    </Dialog>
  );
}
