"use client";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  HeartIcon,
  CubeIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import Media from "./Media";
import DiscoveryMotion from "./DiscoveryMotion";
import { useUI } from "./UIProvider";
import { money, readable } from "@/lib/client-api.mjs";

function PreviewLayout({
  title,
  image,
  eyebrow,
  tagline,
  description,
  facts,
  platforms,
  save,
  footer,
  onClose,
}) {
  const { motionDisabled } = useUI();
  return (
    <Dialog
      onClose={onClose}
      label={title}
      wide
      className="game-dialog"
      footer={footer}
    >
      <DiscoveryMotion paused={motionDisabled} className="preview-motion">
        <div className="preview-visual" data-hero-parallax>
          <div className="preview-visual-image">
            <Media
              src={image}
              alt={title}
              sizes="(max-width: 700px) 100vw, 900px"
              priority
              draggable={false}
            />
          </div>
          <div className="preview-visual-shade" />
          <div className="preview-reticle" aria-hidden="true" />
          <span className="preview-coordinate">QUESTMART / QUICK LOOK</span>
          <div className="preview-title">
            <span className="tag">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{tagline}</p>
          </div>
          {save}
        </div>
        <div className="preview-content">
          <div className="preview-section-label">
            <span className="eyebrow">THE GAME BRIEF</span>
            <span aria-hidden="true">01 / EXPLORE</span>
          </div>
          <p className="preview-description">{description}</p>
          <dl className="preview-facts">
            {facts.map(({ label, value, Icon }) => (
              <div key={label}>
                <dt>
                  <Icon />
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {platforms?.length ? (
            <div className="preview-platforms">
              <span className="eyebrow">PLATFORMS</span>
              <div className="platform-tags">
                {platforms.map((platform) => (
                  <span key={platform}>{platform}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DiscoveryMotion>
    </Dialog>
  );
}

export default function GamePreview({ game, onClose }) {
  const { saved, toggleSaved } = useUI();
  return (
    <PreviewLayout
      title={game.name}
      image={game.hero || game.image}
      eyebrow={game.genre + " / " + (game.year || "DISCOVER")}
      tagline={game.tagline}
      description={game.description}
      platforms={game.platforms}
      onClose={onClose}
      facts={[
        { label: "Genre", value: game.genre, Icon: CubeIcon },
        {
          label: "Release",
          value: game.year || "See store",
          Icon: CalendarDaysIcon,
        },
        {
          label: "New-game store",
          value: "Steam · PC",
          Icon: ComputerDesktopIcon,
        },
      ]}
      save={
        <button
          className={
            "icon-button preview-save " +
            (saved.includes(game.id) ? "saved" : "")
          }
          aria-label="Save game"
          aria-pressed={saved.includes(game.id)}
          onClick={() => toggleSaved(game.id)}
        >
          <HeartIcon />
        </button>
      }
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
                href={"/marketplace?q=" + encodeURIComponent(game.name)}
                onClick={onClose}
              >
                Player listings
                <ArrowUpRightIcon />
              </Link>
              <a
                className="button primary"
                href={game.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Buy new on Steam
                <ArrowUpRightIcon />
              </a>
            </div>
          </div>
          <p className="preview-disclosure">
            New purchases are completed and fulfilled on Steam. Player listings
            are separate offers on QuestMart.
          </p>
        </>
      }
    />
  );
}

export function ListingPreview({ item, onClose }) {
  return (
    <PreviewLayout
      title={item.title}
      image={item.photos[0]}
      eyebrow={"PLAYER LISTING / " + item.platform}
      tagline={"Listed by @" + item.seller_name}
      description={item.description}
      onClose={onClose}
      facts={[
        { label: "Platform", value: item.platform, Icon: ComputerDesktopIcon },
        { label: "Condition", value: readable(item.condition), Icon: CubeIcon },
        { label: "Format", value: readable(item.format), Icon: CubeIcon },
      ]}
      footer={
        <>
          <div className="preview-purchase">
            <div className="preview-price">
              <span>SELLER’S ASKING PRICE</span>
              <strong>{money(item.price_paise)}</strong>
            </div>
            <Link
              className="button primary"
              href={"/listings/" + item.id}
              onClick={onClose}
            >
              View listing
              <ArrowUpRightIcon />
            </Link>
          </div>
          <p className="preview-disclosure">
            A physical copy from another player. Review all photos and details
            before checkout.
          </p>
        </>
      }
    />
  );
}
