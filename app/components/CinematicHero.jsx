"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Media from "./Media";
import { MotionToggle } from "./ExperienceSurface";
import { useUI } from "./UIProvider";
import CinematicWorlds from "./CinematicWorlds";

const worlds = [
  {
    lines: ["RISE.", "WANDER.", "BECOME."],
    label: "THE LANDS BETWEEN",
    note: "Some worlds stay with you.",
    tint: "#d9c184",
    atmosphere: "embers",
  },
  {
    lines: ["AFTER DARK.", "ANYTHING", "IS POSSIBLE."],
    label: "NIGHT CITY",
    note: "Find your edge. Rewrite your story.",
    tint: "#c9f65e",
    atmosphere: "neon",
  },
  {
    lines: ["NO MAP.", "NO LIMITS.", "JUST YOU."],
    label: "THE AMERICAN FRONTIER",
    note: "Take the long way home.",
    tint: "#ffad82",
    atmosphere: "dust",
  },
];

export default function CinematicHero({ games, onPreview, onPortal, covered }) {
  const [scene, setScene] = useState({ index: 0, previous: null, serial: 0 });
  const host = useRef(null);
  const swipe = useRef(null);
  const engine = useRef(null);
  const sceneIndex = useRef(0);
  const { motionDisabled } = useUI();
  const paused = motionDisabled || covered;
  const game = games[scene.index];
  const world = worlds[scene.index];

  function change(index) {
    if (!motionDisabled && host.current) {
      const box = host.current.getBoundingClientRect();
      const distance = Math.max(
        0,
        box.height - host.current.firstElementChild.offsetHeight,
      );
      const inset =
        parseFloat(getComputedStyle(host.current.firstElementChild).top) || 0;
      if (distance > 0) {
        window.scrollTo({
          top: window.scrollY + box.top - inset + (distance * index) / 2,
          behavior: "smooth",
        });
        return;
      }
    }
    sceneIndex.current = index;
    engine.current?.setProgress(index);
    setScene((previous) =>
      previous.index === index
        ? previous
        : { index, previous: previous.index, serial: previous.serial + 1 },
    );
  }

  useEffect(() => {
    const element = host.current;
    let frame = 0;
    let visible = false;
    function update() {
      frame = 0;
      if (!visible || paused) return;
      const box = element.getBoundingClientRect();
      const distance = box.height - element.firstElementChild.offsetHeight;
      if (distance <= 0) return;
      const inset =
        parseFloat(getComputedStyle(element.firstElementChild).top) || 0;
      const progress = Math.max(
        0,
        Math.min(1, (inset - box.top) / Math.max(1, distance)),
      );
      element.style.setProperty("--cinema-scroll", progress.toFixed(4));
      engine.current?.setProgress(progress * 2);
      const index = Math.round(progress * 2);
      if (sceneIndex.current !== index) {
        sceneIndex.current = index;
        setScene((previous) => ({
          index,
          previous: previous.index,
          serial: previous.serial + 1,
        }));
      }
    }
    function requestUpdate() {
      if (!frame && visible && !paused) frame = requestAnimationFrame(update);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      element.dataset.visible = String(visible && !document.hidden);
      requestUpdate();
    });
    const visibility = () => {
      element.dataset.visible = String(visible && !document.hidden);
    };
    observer.observe(element);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    document.addEventListener("visibilitychange", visibility);
    if (paused) element.style.setProperty("--cinema-scroll", "0");
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paused]);

  return (
    <section
      ref={host}
      className="cinema-journey"
      aria-label="Featured game worlds"
      aria-roledescription="carousel"
      data-motion-disabled={motionDisabled}
      data-paused={paused}
      data-atmosphere={world.atmosphere}
      style={{ "--world-tint": world.tint }}
    >
      <div
        className="cinematic-hero"
        onPointerDown={(event) => {
          if (
            event.pointerType === "touch" &&
            !event.target.closest("button,a")
          )
            swipe.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (
            start &&
            Math.abs(event.clientX - start.x) > 55 &&
            Math.abs(event.clientY - start.y) < 45
          )
            change((scene.index + (event.clientX < start.x ? 1 : 2)) % 3);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <div className="cinema-worlds" aria-hidden="true">
          {games.map((item, index) => (
            <div
              key={item.id}
              className="cinema-world"
              data-active={index === scene.index}
              data-previous={index === scene.previous}
            >
              <div className="cinema-camera">
                <Media
                  src={item.hero}
                  alt=""
                  priority={index === 0}
                  sizes="100vw"
                />
              </div>
            </div>
          ))}
        </div>
        <CinematicWorlds games={games} paused={paused} controller={engine} />
        <div className="cinema-shade" aria-hidden="true" />
        <div className="cinema-atmosphere" aria-hidden="true">
          <div className="cinema-mist" />
          {Array.from({ length: 18 }, (_, i) => (
            <i
              key={i}
              style={{
                "--i": i,
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 19 + 7) % 95}%`,
              }}
            />
          ))}
        </div>
        <div className="cinema-topline page-width">
          <span>QUESTMART / WORLDS WORTH PLAYING</span>
          <MotionToggle />
        </div>
        <div className="cinema-content page-width">
          <div className="cinema-copy" key={scene.serial}>
            <div className="cinema-kicker">
              <span /> WORLD 0{scene.index + 1} <i /> {world.label}
            </div>
            <h1 aria-label={world.lines.join(" ")}>
              {world.lines.map((line, index) => (
                <span key={line}>
                  <b style={{ "--line": index }}>{line}</b>
                </span>
              ))}
            </h1>
            <p>
              {world.note}
              <br />
              Discover new games. Trade the ones you love.
            </p>
            <div className="cinema-actions">
              <button
                className="button primary cinema-portal-button"
                onClick={() => onPortal(game)}
              >
                <SparklesIcon /> Enter the portal <ArrowUpRightIcon />
              </button>
              <Link className="cinema-direct-link" href="#discover">
                Explore games <ArrowDownIcon />
              </Link>
            </div>
          </div>
          <div className="cinema-dossier">
            <span className="cinema-dossier-label">
              NOW EXPLORING / 0{scene.index + 1}
            </span>
            <button
              className="cinema-feature"
              onClick={(event) =>
                onPreview(
                  game,
                  event.currentTarget.querySelector(".cinema-feature-cover"),
                )
              }
              aria-label={`Preview ${game.name}`}
            >
              <span className="cinema-feature-cover">
                <Media src={game.cover || game.image} alt="" sizes="110px" />
              </span>
              <span>
                <small>
                  {game.genre} / {game.year}
                </small>
                <strong>{game.name}</strong>
                <em>
                  Step inside this game <ArrowUpRightIcon />
                </em>
              </span>
            </button>
            <span className="cinema-art-credit">
              Game artwork © its respective publisher
            </span>
          </div>
        </div>
        <div className="cinema-bottom page-width">
          <span className="cinema-scroll-hint" aria-hidden="true">
            <ArrowDownIcon /> SCROLL TO TRAVEL
          </span>
          <div className="cinema-chapters" aria-label="Choose a game world">
            {games.map((item, index) => (
              <button
                key={item.id}
                onClick={() => change(index)}
                aria-label={`Show ${item.name} world`}
                aria-pressed={index === scene.index}
              >
                <span>0{index + 1}</span>
                <b>{item.name}</b>
                <i />
              </button>
            ))}
          </div>
          <div className="cinema-nav">
            <button
              className="icon-button"
              onClick={() => change((scene.index + 2) % 3)}
              aria-label="Previous featured game"
            >
              <ChevronLeftIcon />
            </button>
            <button
              className="icon-button"
              onClick={() => change((scene.index + 1) % 3)}
              aria-label="Next featured game"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
        <span className="sr-only" aria-live="polite">
          Featured world: {game.name}
        </span>
      </div>
    </section>
  );
}
