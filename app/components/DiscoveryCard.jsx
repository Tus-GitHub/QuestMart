"use client";

import { memo } from "react";
import {
  ArrowUpRightIcon,
  HeartIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import Media from "./Media";

function DiscoveryCard({ game, index, saved, onPreview, onSave }) {
  return (
    <article
      className="game-card reveal-in"
      data-tilt
      style={{
        animationDelay: Math.min(index, 7) * 45 + "ms",
        "--game-color": game.color || "#c1ef76",
      }}
    >
      <span className="card-shine" aria-hidden="true" />
      <button
        className="game-card-image"
        onClick={(event) => onPreview(game, event.currentTarget)}
        aria-label={"Preview " + game.name}
      >
        <Media src={game.image} alt={game.name} draggable={false} />
        <span className="preview-hover">
          <PlayIcon /> Quick look
        </span>
        <span className="game-card-year">{game.year}</span>
      </button>
      <button
        className={"save-game " + (saved ? "saved" : "")}
        aria-label={"Save " + game.name}
        aria-pressed={saved}
        onClick={() => onSave(game.id)}
      >
        <HeartIcon />
      </button>
      <div className="game-card-info">
        <span className="eyebrow">{game.genre}</span>
        <button
          onClick={(event) =>
            onPreview(
              game,
              event.currentTarget
                .closest(".game-card")
                .querySelector(".game-card-image"),
            )
          }
        >
          <h3>{game.name}</h3>
          <ArrowUpRightIcon />
        </button>
        <span className="game-platforms">
          {game.platforms.slice(0, 3).join(" · ")}
          {game.platforms.length > 3 ? " + more" : ""}
        </span>
        <a
          className="store-buy"
          href={game.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span>
            {game.price || "View store price"}
            <small>Buy new on Steam</small>
          </span>
          <ArrowUpRightIcon />
        </a>
      </div>
    </article>
  );
}

export default memo(DiscoveryCard);
