"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRightIcon, HeartIcon } from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import GameCase from "./GameCase";
import Media from "./Media";
import { useUI } from "./UIProvider";

function sourceBox(element) {
  if (!element?.isConnected) return null;
  const box = element.getBoundingClientRect();
  return box.width > 0 &&
    box.height > 0 &&
    box.bottom > 0 &&
    box.top < window.innerHeight
    ? box
    : null;
}

export default function GameWorldPreview({ game, origin, onClose }) {
  const { saved, toggleSaved, motionDisabled } = useUI();
  const flight = useRef(null),
    animation = useRef(null),
    openingFrame = useRef(0),
    closing = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const open = useCallback(() => {
    openingFrame.current = requestAnimationFrame(() => {
      const target = flight.current;
      if (!target || motionDisabled) return;
      const from = sourceBox(origin),
        to = target.getBoundingClientRect();
      const start = from
        ? `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`
        : "translateY(40px) scale(.85)";
      animation.current = target.animate(
        [
          { transform: start, opacity: from ? 1 : 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 760, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    });
  }, [origin, motionDisabled]);
  useEffect(
    () => () => {
      cancelAnimationFrame(openingFrame.current);
      animation.current?.cancel();
    },
    [],
  );

  async function close() {
    if (closing.current) return;
    closing.current = true;
    cancelAnimationFrame(openingFrame.current);
    animation.current?.cancel();
    if (motionDisabled || !flight.current) {
      onClose();
      return;
    }
    setLeaving(true);
    const target = flight.current,
      to = sourceBox(origin),
      from = target.getBoundingClientRect();
    const end = to
      ? `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`
      : "translateY(30px) scale(.94)";
    animation.current = target.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: end, opacity: to ? 0.6 : 0 },
      ],
      { duration: 340, easing: "cubic-bezier(.4,0,.8,.5)", fill: "forwards" },
    );
    await animation.current.finished.catch(() => {});
    onClose();
  }

  return (
    <Dialog
      label={game.name}
      wide
      className={`world-preview ${leaving ? "world-preview-leaving" : ""}`}
      onOpen={open}
      onClose={close}
      footer={
        <>
          <div className="preview-purchase">
            <div className="preview-price">
              <span>STEAM REFERENCE PRICE</span>
              <strong>{game.price || "Check store price"}</strong>
            </div>
            <div className="preview-purchase-actions">
              <Link
                className="button secondary"
                href={`/marketplace?q=${encodeURIComponent(game.name)}`}
                onClick={onClose}
              >
                Player listings <ArrowUpRightIcon />
              </Link>
              <a
                className="button primary"
                href={game.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Buy new on Steam <ArrowUpRightIcon />
              </a>
            </div>
          </div>
          <p className="preview-disclosure">
            New purchases are completed and fulfilled on Steam. Player listings
            are separate offers on QuestMart.
          </p>
        </>
      }
    >
      <div className="world-preview-scene">
        <Media
          src={game.hero || game.image}
          alt=""
          sizes="(max-width: 700px) 100vw, 1000px"
        />
        <div />
      </div>
      <div className="world-preview-topline">
        <span className="eyebrow">QUESTMART / INSIDE THE WORLD</span>
        <button
          className={`icon-button ${saved.includes(game.id) ? "saved" : ""}`}
          aria-label={`Save ${game.name}`}
          aria-pressed={saved.includes(game.id)}
          onClick={() => toggleSaved(game.id)}
        >
          <HeartIcon />
        </button>
      </div>
      <div className="world-preview-layout">
        <div className="world-case-flight" ref={flight}>
          <GameCase game={game} interactive />
        </div>
        <div className="world-preview-brief">
          <span className="world-preview-genre">
            {game.genre} / {game.year || "DISCOVER"}
          </span>
          <h2>{game.name}</h2>
          {game.tagline ? (
            <p className="world-preview-tagline">{game.tagline}</p>
          ) : null}
          <p className="world-preview-description">
            {game.description ||
              `Explore ${game.name}, see the current store offer, or find a copy from another player.`}
          </p>
          <div className="world-preview-platforms">
            <span className="eyebrow">PLATFORMS</span>
            <div className="platform-tags">
              {game.platforms.map((platform) => (
                <span key={platform}>{platform}</span>
              ))}
            </div>
          </div>
          <span className="world-preview-caption">
            A closer look at your next adventure.
          </span>
        </div>
      </div>
    </Dialog>
  );
}
