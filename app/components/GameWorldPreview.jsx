"use client";
import Link from "next/link";
import { ArrowUpRightIcon, HeartIcon } from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import GameInspection from "./GameInspection";
import useCinematicDialog from "./useCinematicDialog";
import { MotionToggle } from "./ExperienceSurface";
import Media from "./Media";
import { useUI } from "./UIProvider";
import "../inspection.css";

export default function GameWorldPreview({ game, origin, onClose }) {
  const { saved, toggleSaved } = useUI();
  const { flight, open, close, leaving } = useCinematicDialog(origin, onClose);
  return (
    <Dialog
      label={game.name}
      wide
      className={`inspection-dialog ${leaving ? "inspection-leaving" : ""}`}
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
      <div className="inspection-backdrop" aria-hidden="true">
        <Media src={game.hero || game.image} alt="" sizes="100vw" />
        <div />
      </div>
      <div className="inspection-topline">
        <span>QUESTMART / INSIDE THE WORLD</span>
        <MotionToggle />
      </div>
      <div className="inspection-layout">
        <div className="inspection-flight" ref={flight}>
          <GameInspection game={game} leaving={leaving} />
        </div>
        <div className="inspection-brief">
          <span className="inspection-eyebrow">
            {game.genre} / {game.year || "DISCOVER"}
          </span>
          <h2>{game.name}</h2>
          {game.tagline ? (
            <p className="inspection-tagline">{game.tagline}</p>
          ) : null}
          <p className="inspection-description">
            {game.description ||
              `Explore ${game.name}, see the current store offer, or find a copy from another player.`}
          </p>
          <div className="inspection-platforms">
            <span className="eyebrow">CHOOSE YOUR WORLD</span>
            <div className="platform-tags">
              {game.platforms.map((platform) => (
                <span key={platform}>{platform}</span>
              ))}
            </div>
          </div>
          <button
            className={`inspection-save ${saved.includes(game.id) ? "saved" : ""}`}
            aria-label={`Save ${game.name}`}
            aria-pressed={saved.includes(game.id)}
            onClick={() => toggleSaved(game.id)}
          >
            <HeartIcon />{" "}
            {saved.includes(game.id)
              ? "In your collection"
              : "Save for your next adventure"}
          </button>
          <div className="inspection-chapter">
            <span>01 / DISCOVER</span>
            <i />
            <span>YOUR NEXT STORY</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
