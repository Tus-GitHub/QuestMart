"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRightIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { catalog, genres } from "@/data/catalog.mjs";
import { useUI } from "./components/UIProvider";
import Media from "./components/Media";
import GamePreview from "./components/GamePreview";

export default function Discover() {
  const [slide, setSlide] = useState(0),
    [paused, setPaused] = useState(false),
    [selected, setSelected] = useState(null),
    [genre, setGenre] = useState("All games"),
    [search, setSearch] = useState(""),
    [onlySaved, setOnlySaved] = useState(false);
  const { saved, toggleSaved } = useUI();
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || motion.matches) return;
    const timer = setInterval(() => setSlide((value) => (value + 1) % 3), 7000);
    return () => clearInterval(timer);
  }, [paused]);
  const hero = catalog[slide];
  const games = catalog.filter(
    (game) =>
      (genre === "All games" || game.genre === genre) &&
      game.name.toLowerCase().includes(search.toLowerCase()) &&
      (!onlySaved || saved.includes(game.id)),
  );
  return (
    <div className="discover-page">
      <section
        className="hero-section"
        aria-label="Featured games"
        aria-roledescription="carousel"
      >
        <div className="hero-image" key={hero.id}>
          <Media src={hero.hero} alt="" priority sizes="100vw" />
        </div>
        <div className="hero-gradient" />
        <div className="hero-grid" />
        <div className="hero-content page-width">
          <div className="eyebrow hero-eyebrow">
            <span className="live-dot" /> MADE FOR YOUR NEXT ADVENTURE
          </div>
          <h1>
            New worlds.
            <br />
            Same <em>love of play.</em>
          </h1>
          <p>
            Your next favorite is waiting on someone’s shelf.
            <br className="desktop-only" /> Discover, trade, and keep the
            adventure going.
          </p>
          <div className="hero-actions">
            <Link href="/marketplace" className="button primary">
              Explore marketplace
              <ArrowUpRightIcon />
            </Link>
            <Link href="/sell" className="button glass">
              Sell your games
              <ArrowRightIcon />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <ShieldCheckIcon />
              Player-to-player
            </span>
            <span>
              <ArrowPathIcon />
              Pre-owned. Replayed.
            </span>
          </div>
        </div>
        <div className="hero-bottom page-width">
          <button className="featured-game" onClick={() => setSelected(hero)}>
            <span className="tiny-cover">
              <Media src={hero.image} alt="" sizes="80px" />
            </span>
            <span>
              <small>IN THE SPOTLIGHT</small>
              <strong>{hero.name}</strong>
            </span>
            <ArrowUpRightIcon />
          </button>
          <div className="slide-controls">
            <span className="slide-number">
              0{slide + 1}
              <i> / 03</i>
            </span>
            <button
              className="icon-button"
              aria-label="Previous featured game"
              onClick={() => setSlide((slide + 2) % 3)}
            >
              <ChevronLeftIcon />
            </button>
            <button
              className="icon-button"
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <button
              className="icon-button"
              aria-label="Next featured game"
              onClick={() => setSlide((slide + 1) % 3)}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
        <div
          className="hero-progress"
          key={hero.slug}
          style={{ animationPlayState: paused ? "paused" : "running" }}
        />
      </section>
      <div className="platform-strip">
        <div className="page-width">
          <span>
            YOUR PLATFORM.
            <br />
            <b>YOUR PLAYGROUND.</b>
          </span>
          {[
            ["PS5", "PlayStation"],
            ["Xbox Series X", "Xbox"],
            ["Nintendo Switch", "Nintendo Switch"],
            ["PC", "PC gaming"],
          ].map(([platform, label]) => (
            <Link
              href={"/marketplace?platform=" + encodeURIComponent(platform)}
              key={platform}
            >
              <span className="platform-glyph">
                {platform === "PS5"
                  ? "△○×□"
                  : platform === "Xbox Series X"
                    ? "X"
                    : platform === "PC"
                      ? "⌘"
                      : "◧"}
              </span>
              {label}
              <ArrowUpRightIcon />
            </Link>
          ))}
        </div>
      </div>
      <section className="section page-width" id="discover">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR NEXT OBSESSION</span>
            <h2>
              A world worth getting lost in<span className="accent">.</span>
            </h2>
          </div>
          <Link className="text-link" href="/marketplace">
            Shop player listings
            <ArrowUpRightIcon />
          </Link>
        </div>
        <div className="library-toolbar">
          <div className="genre-tabs" aria-label="Game genres">
            {genres.map((value) => (
              <button
                key={value}
                className={genre === value ? "active" : ""}
                aria-pressed={genre === value}
                onClick={() => setGenre(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="library-tools">
            <button
              className={"icon-button " + (onlySaved ? "saved" : "")}
              aria-label="Show saved games"
              aria-pressed={onlySaved}
              onClick={() => setOnlySaved(!onlySaved)}
            >
              <HeartIcon />
            </button>
            <label className="search-field">
              <MagnifyingGlassIcon />
              <input
                aria-label="Search game library"
                placeholder="Find a game…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="game-grid">
          {games.map((game, index) => (
            <article
              className="game-card reveal-in"
              key={game.id}
              style={{
                animationDelay: Math.min(index, 7) * 45 + "ms",
                "--game-color": game.color,
              }}
            >
              <button
                className="game-card-image"
                onClick={() => setSelected(game)}
                aria-label={"Preview " + game.name}
              >
                <Media src={game.image} alt={game.name} />
                <span className="preview-hover">
                  <PlayIcon /> Quick look
                </span>
                <span className="game-card-year">{game.year}</span>
              </button>
              <button
                className={
                  "save-game " + (saved.includes(game.id) ? "saved" : "")
                }
                aria-label={"Save " + game.name}
                aria-pressed={saved.includes(game.id)}
                onClick={() => toggleSaved(game.id)}
              >
                <HeartIcon />
              </button>
              <div className="game-card-info">
                <span className="eyebrow">{game.genre}</span>
                <button onClick={() => setSelected(game)}>
                  <h3>{game.name}</h3>
                  <ArrowUpRightIcon />
                </button>
                <span className="game-platforms">
                  {game.platforms.slice(0, 3).join(" · ")}
                  {game.platforms.length > 3 ? " + more" : ""}
                </span>
              </div>
            </article>
          ))}
        </div>
        {!games.length ? (
          <div className="empty-state">
            <MagnifyingGlassIcon />
            <h3>No games in this quest.</h3>
            <p>Try another search or explore a different genre.</p>
            <button
              className="button secondary"
              onClick={() => {
                setGenre("All games");
                setSearch("");
                setOnlySaved(false);
              }}
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </section>
      <section className="sell-banner page-width">
        <div className="sell-banner-decoration" aria-hidden="true">
          <span>↗</span>
          <span>+</span>
          <span>○</span>
        </div>
        <div>
          <span className="eyebrow">FINISHED IT? PASS IT ON.</span>
          <h2>
            Your shelf.
            <br />
            Someone else’s next adventure.
          </h2>
          <p>Turn the games you’ve loved into your next great story.</p>
          <Link href="/sell" className="button primary">
            List your first game
            <ArrowUpRightIcon />
          </Link>
        </div>
        <div className="banner-stack" aria-hidden="true">
          {[catalog[3], catalog[0], catalog[1]].map((game) => (
            <div key={game.id}>
              <Media src={game.image} alt="" sizes="360px" />
            </div>
          ))}
        </div>
      </section>
      <section className="section page-width how-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LESS FRICTION. MORE PLAY.</span>
            <h2>From shelf to next level.</h2>
          </div>
        </div>
        <div className="steps-grid">
          {[
            [
              "01",
              "Find your next quest",
              "Explore games, compare player listings, and choose your platform.",
              MagnifyingGlassIcon,
            ],
            [
              "02",
              "Make it yours",
              "See the actual copy, its condition, and the seller’s price before checkout.",
              ShieldCheckIcon,
            ],
            [
              "03",
              "Keep the game going",
              "Play it. Love it. Pass it on when you’re ready for something new.",
              CubeIcon,
            ],
          ].map(([n, title, body, Icon]) => (
            <div className="step-card" key={n}>
              <div>
                <Icon />
                <span>{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      {selected ? (
        <GamePreview game={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
