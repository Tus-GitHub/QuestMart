"use client";
import Link from "next/link";
import { ArrowUpRightIcon, HeartIcon } from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import Media from "./Media";
import { useUI } from "./UIProvider";
export default function GamePreview({ game, onClose }) {
  const { saved, toggleSaved } = useUI();
  return (
    <Dialog onClose={onClose} label={game.name} wide>
      <div className="preview-art">
        <Media src={game.hero} alt={game.name} sizes="800px" />
        <div className="preview-art-shade" />
        <span className="tag">
          {game.genre} / {game.year}
        </span>
      </div>
      <div className="dialog-body">
        <div className="preview-heading">
          <div>
            <span className="eyebrow">{game.tagline}</span>
            <h2>{game.name}</h2>
          </div>
          <button
            className={`icon-button ${saved.includes(game.id) ? "saved" : ""}`}
            aria-label="Save game"
            aria-pressed={saved.includes(game.id)}
            onClick={() => toggleSaved(game.id)}
          >
            <HeartIcon />
          </button>
        </div>
        <p className="muted">{game.description}</p>
        <div className="platform-tags">
          {game.platforms.map((platform) => (
            <span key={platform}>{platform}</span>
          ))}
        </div>
        <div className="preview-actions">
          <Link
            className="button primary"
            href={`/marketplace?q=${encodeURIComponent(game.name)}`}
            onClick={onClose}
          >
            Find a pre-owned copy
            <ArrowUpRightIcon />
          </Link>
          <a
            href={game.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Game details ↗
          </a>
        </div>
        <p className="small muted">
          A game from our discovery library. Prices and availability depend on
          seller listings.
        </p>
      </div>
    </Dialog>
  );
}
