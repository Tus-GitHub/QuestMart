"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { worlds } from "@/data/worlds.mjs";
import { chapterPosition, sampleJourney } from "@/lib/journey.mjs";
import Media from "./Media";
import { MotionToggle } from "./ExperienceSurface";
import { useUI } from "./UIProvider";
import CinematicWorlds from "./CinematicWorlds";

export default function WorldJourney({ games, onPreview, onPortal, covered }) {
  const [story, setStory] = useState({ chapter: 0, beat: 0 });
  const host = useRef(null),
    engine = useRef(null),
    progress = useRef(0),
    current = useRef(story);
  const { motionDisabled, motionReady } = useUI();
  const wasPinned = useRef(false),
    previousMotion = useRef(motionDisabled);
  const paused = motionDisabled || covered;
  const world = worlds[story.chapter],
    game = games[story.chapter],
    beat = world.beats[story.beat];
  const paint = useCallback((value) => {
    const sample = sampleJourney(value);
    progress.current = sample.progress;
    host.current?.style.setProperty("--journey-progress", sample.progress);
    host.current?.style.setProperty("--journey-phase", sample.phase);
    engine.current?.setProgress(sample.progress);
    if (
      sample.chapter !== current.current.chapter ||
      sample.beat !== current.current.beat
    ) {
      current.current = { chapter: sample.chapter, beat: sample.beat };
      setStory(current.current);
    }
  }, []);
  function change(index) {
    const value = chapterPosition((index + games.length) % games.length);
    const element = host.current,
      box = element.getBoundingClientRect();
    const distance = box.height - element.firstElementChild.offsetHeight;
    if (!motionDisabled && distance > 1) {
      window.scrollTo({
        top: window.scrollY + box.top + distance * value,
        behavior: "smooth",
      });
    } else paint(value);
  }
  useEffect(() => {
    const changed = previousMotion.current !== motionDisabled;
    previousMotion.current = motionDisabled;
    if (!changed || !motionReady || !wasPinned.current) return;
    const element = host.current,
      box = element.getBoundingClientRect();
    const distance = Math.max(
      0,
      box.height - element.firstElementChild.offsetHeight,
    );
    // Preserve the current chapter when the visitor pauses or resumes the journey.
    window.scrollTo({
      top: window.scrollY + box.top + (motionDisabled ? 0 : distance * progress.current),
      behavior: "instant",
    });
  }, [motionDisabled, motionReady]);
  useEffect(() => {
    const element = host.current;
    let frame = 0,
      visible = false;
    function update() {
      frame = 0;
      if (!visible || paused || document.hidden) return;
      const box = element.getBoundingClientRect();
      wasPinned.current = box.top <= 1 && box.bottom >= window.innerHeight - 1;
      const distance = box.height - element.firstElementChild.offsetHeight;
      if (distance > 1) paint(-box.top / distance);
    }
    function requestUpdate() {
      if (!frame && visible && !paused) frame = requestAnimationFrame(update);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      element.dataset.visible = String(visible && !document.hidden);
      requestUpdate();
    });
    function visibility() {
      element.dataset.visible = String(visible && !document.hidden);
      requestUpdate();
    }
    observer.observe(element);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paused, paint]);
  return (
    <section
      ref={host}
      className="world-journey"
      aria-label="Journey through game worlds"
      data-static={motionReady && motionDisabled}
      data-paused={paused}
      data-theme={world.theme}
      style={{ "--world-tint": world.tint }}
    >
      <div className="journey-screen">
        <div className="journey-backdrops" aria-hidden="true">
          {games.map((item, index) => (
            <div key={item.id} data-active={index === story.chapter}>
              <Media
                src={item.hero}
                alt=""
                priority={index === 0}
                sizes="100vw"
              />
            </div>
          ))}
        </div>
        <CinematicWorlds
          games={games}
          paused={paused}
          controller={engine}
          progress={progress}
        />
        <div className="journey-shade" aria-hidden="true" />
        <div className="journey-top page-width">
          <span>
            <i /> WORLDS WORTH GETTING LOST IN
          </span>
          <MotionToggle />
        </div>
        <div className="journey-world-name" aria-hidden="true">
          {world.label}
        </div>
        <div className="journey-story page-width">
          <div className="journey-copy" key={`${story.chapter}-${story.beat}`}>
            <span className="journey-cue">
              <i /> {beat.cue}
            </span>
            <h1>
              {beat.heading.map((line, index) => (
                <span key={line}>
                  <b style={{ "--line": index }}>{line}</b>
                </span>
              ))}
            </h1>
            <p>{beat.note}</p>
          </div>
          <div className="journey-actions">
            <Link className="button primary" href="#discover">
              Find your next game <ArrowUpRightIcon />
            </Link>
            <button className="journey-portal" onClick={() => onPortal(game)}>
              <SparklesIcon /> Enter the portal
            </button>
          </div>
        </div>
        <aside className="journey-game">
          <span>{world.genre}</span>
          <button
            aria-label={`Preview ${game.name}`}
            onClick={(event) =>
              onPreview(
                game,
                event.currentTarget.querySelector(".journey-cover"),
              )
            }
          >
            <span className="journey-cover">
              <Media src={game.cover || game.image} alt="" sizes="64px" />
            </span>
            <span>
              <small>FEATURED WORLD</small>
              <strong>{game.name}</strong>
              <em>
                Explore this game <ArrowUpRightIcon />
              </em>
            </span>
          </button>
        </aside>
        <div className="journey-bottom page-width">
          <nav className="journey-chapters" aria-label="Choose a game world">
            {worlds.map((item, index) => (
              <button
                key={item.theme}
                onClick={() => change(index)}
                aria-label={`Show ${item.name} world`}
                aria-pressed={index === story.chapter}
              >
                <span>0{index + 1}</span>
                <b>{item.short}</b>
                <i />
              </button>
            ))}
          </nav>
          <div className="journey-arrows">
            <button
              className="icon-button"
              onClick={() => change(story.chapter - 1)}
              aria-label="Previous featured game"
            >
              <ChevronLeftIcon />
            </button>
            <button
              className="icon-button"
              onClick={() => change(story.chapter + 1)}
              aria-label="Next featured game"
            >
              <ChevronRightIcon />
            </button>
          </div>
          <span className="journey-scroll">
            <ArrowDownIcon /> SCROLL TO EXPLORE
          </span>
        </div>
        <span className="journey-credit">
          Original 3D environments · Game art © respective publishers
        </span>
        <div className="journey-total-progress" aria-hidden="true">
          <span />
        </div>
        <span className="sr-only" aria-live="polite">
          Featured world: {game.name}
        </span>
      </div>
    </section>
  );
}
