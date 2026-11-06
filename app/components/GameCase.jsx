"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Media from "./Media";
import { useUI } from "./UIProvider";

export default function GameCase({
  game,
  interactive = false,
  className = "",
}) {
  const stage = useRef(null),
    object = useRef(null),
    drag = useRef(null),
    frame = useRef(0),
    angle = useRef(-22);
  const [side, setSide] = useState("Front cover");
  const { motionDisabled } = useUI();
  const title = game.name;
  function paint(value) {
    angle.current = value;
    object.current?.style.setProperty("--case-turn", `${value}deg`);
  }
  function describe() {
    const value = ((angle.current % 360) + 360) % 360;
    setSide(
      value > 105 && value < 255
        ? "Back of case"
        : value > 65 && value < 295
          ? "Case spine"
          : "Front cover",
    );
  }
  function turn(amount) {
    paint(angle.current + amount);
    describe();
  }
  function release(event) {
    if (!drag.current) return;
    drag.current = null;
    stage.current?.removeAttribute("data-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    describe();
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <div
      className={`game-case ${interactive ? "game-case-interactive" : ""} ${className}`}
      data-motion-off={motionDisabled}
    >
      <div
        className="game-case-stage"
        ref={stage}
        onPointerDown={
          interactive
            ? (event) => {
                if (event.button !== 0) return;
                drag.current = { x: event.clientX, angle: angle.current };
                event.currentTarget.setPointerCapture(event.pointerId);
                stage.current.dataset.dragging = "true";
              }
            : undefined
        }
        onPointerMove={
          interactive
            ? (event) => {
                if (!drag.current) return;
                const value =
                  drag.current.angle + (event.clientX - drag.current.x) * 0.8;
                cancelAnimationFrame(frame.current);
                frame.current = requestAnimationFrame(() => paint(value));
              }
            : undefined
        }
        onPointerUp={interactive ? release : undefined}
        onPointerCancel={interactive ? release : undefined}
      >
        <div className="game-case-object" ref={object}>
          <div
            className={`game-case-front ${game.cover ? "" : "game-case-designed"}`}
          >
            <div className="case-front-art">
              <Media
                src={game.cover || game.image}
                alt={`${title} cover`}
                sizes="(max-width: 700px) 180px, 300px"
                draggable={false}
                priority={interactive}
              />
            </div>
            {!game.cover ? (
              <strong className="case-front-title">{title}</strong>
            ) : null}
            <div className="case-specular" />
            <span className="case-edition">QUESTMART / DISCOVER</span>
          </div>
          <div className="game-case-spine" aria-hidden="true">
            <b>Q↗</b>
            <span>{title}</span>
          </div>
          <div className="game-case-edge" aria-hidden="true" />
          <div className="game-case-back" aria-hidden="true">
            <div className="case-back-art">
              <Media
                src={game.hero || game.image}
                alt=""
                sizes="300px"
                draggable={false}
              />
            </div>
            <span className="eyebrow">INSIDE THE WORLD</span>
            <strong>{title}</strong>
            <p>{game.tagline || `Discover ${title}.`}</p>
            <span className="case-back-genre">
              {game.genre} / {game.year || "DISCOVER"}
            </span>
            <div className="case-back-stripes" />
          </div>
          <div className="game-case-top" aria-hidden="true" />
        </div>
        <div className="case-ground" aria-hidden="true" />
      </div>
      {interactive ? (
        <div className="case-controls">
          <div>
            <span>DRAG TO ROTATE</span>
            <output aria-live="polite">{side}</output>
          </div>
          <div className="case-control-buttons">
            <button
              className="icon-button"
              onClick={() => turn(-60)}
              aria-label="Rotate game case left"
            >
              <ChevronLeftIcon />
            </button>
            <button
              className="icon-button"
              onClick={() => {
                paint(-22);
                describe();
              }}
              aria-label="Reset game case view"
            >
              <ArrowPathIcon />
            </button>
            <button
              className="icon-button"
              onClick={() => turn(60)}
              aria-label="Rotate game case right"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
