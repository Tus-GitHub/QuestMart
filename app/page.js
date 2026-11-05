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
import DiscoveryMotion from "./components/DiscoveryMotion";

export default function Discover() {
  const [slide, setSlide] = useState(0),
    [paused, setPaused] = useState(false),
    [selected, setSelected] = useState(null),
    [genre, setGenre] = useState("All games"),
    [search, setSearch] = useState(""),
    [onlySaved, setOnlySaved] = useState(false),
    [reducedMotion, setReducedMotion] = useState(false);
  const [library, setLibrary] = useState({
      results: catalog,
      count: null,
      hasMore: false,
    }),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [catalogError, setCatalogError] = useState(""),
    [retry, setRetry] = useState(0);
  const { saved, toggleSaved } = useUI();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCatalogError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          search,
          genre,
        });
        const response = await fetch(`/api/games?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("The catalog couldn’t be loaded. Please retry.");
        const data = await response.json();
        if (!Array.isArray(data.results))
          throw new Error("The catalog couldn’t be loaded. Please retry.");
        setLibrary(data);
        setCatalogError(data.message || "");
      } catch (error) {
        if (!controller.signal.aborted) setCatalogError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, genre, retry]);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = setInterval(() => setSlide((value) => (value + 1) % 3), 7000);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, slide]);
  const hero = catalog[slide];
  const games = library.results.filter(
    (game) => !onlySaved || saved.includes(game.id),
  );
  return (
    <DiscoveryMotion>
      <div className={"discover-page " + (paused ? "motion-paused" : "")}>
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
          <div className="hero-orbit" aria-hidden="true" />
          <div className="hero-coordinate" aria-hidden="true">
            QM / DISCOVERY SYSTEM — 0{slide + 1}
          </div>
          <div className="hero-content page-width">
            <div className="eyebrow hero-eyebrow">
              <span className="live-dot" /> THE NEXT LEVEL IS YOURS
            </div>
            <h1>
              PLAY IT.
              <br />
              <em>PASS IT ON.</em>
            </h1>
            <p>
              Discover new releases. Find your next obsession.
              <br className="desktop-only" /> Buy new, trade favorites, and keep
              playing.
            </p>
            <div className="hero-actions">
              <Link href="/#discover" className="button primary">
                Explore all games
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
                New games + player listings
              </span>
              <span>
                <ArrowPathIcon />
                Discover. Play. Repeat.
              </span>
            </div>
          </div>
          <div className="hero-dossier" key={hero.id + "-dossier"}>
            <span className="eyebrow">FEATURED WORLD / 0{slide + 1}</span>
            <h2>{hero.name}</h2>
            <p>{hero.tagline}</p>
            <button
              className="dossier-launch"
              onClick={() => setSelected(hero)}
            >
              <span>
                <PlayIcon />
              </span>{" "}
              Explore this world <ArrowUpRightIcon />
            </button>
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
            className="hero-selector page-width"
            aria-label="Choose featured game"
          >
            {catalog.slice(0, 3).map((game, index) => (
              <button
                key={game.id}
                className={slide === index ? "active" : ""}
                aria-pressed={slide === index}
                onClick={() => setSlide(index)}
              >
                <Media src={game.image} alt="" sizes="180px" />
                <span>
                  <small>
                    0{index + 1} / {game.genre}
                  </small>
                  <strong>{game.name}</strong>
                </span>
                <ArrowUpRightIcon />
              </button>
            ))}
          </div>
          <div
            className="hero-progress"
            key={hero.slug}
            style={{
              animationPlayState:
                paused || reducedMotion ? "paused" : "running",
            }}
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
        <section className="worlds-section section page-width" data-reveal>
          <div className="section-heading">
            <div>
              <span className="eyebrow">SIDE QUESTS ENCOURAGED</span>
              <h2>
                Choose your world<span className="accent">.</span>
              </h2>
            </div>
            <span className="worlds-caption">
              Different moods. Endless possibilities.
            </span>
          </div>
          <div className="worlds-grid">
            {[
              [catalog[0], "Get beautifully lost", "Open-world adventures"],
              [catalog[1], "Break the rules", "Stories after dark"],
              [catalog[6], "Chase the horizon", "One more race"],
            ].map(([game, title, label], index) => (
              <button
                className="world-card"
                key={game.id}
                data-tilt
                onClick={() => setSelected(game)}
              >
                <Media
                  src={game.hero || game.image}
                  alt=""
                  sizes="(max-width: 700px) 85vw, 33vw"
                />
                <span className="world-index">WORLD / 0{index + 1}</span>
                <span className="world-copy">
                  <small>{label}</small>
                  <strong>{title}</strong>
                  <span>
                    Discover the game <ArrowUpRightIcon />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="section page-width" id="discover" data-reveal>
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIND YOUR NEXT OBSESSION</span>
              <h2>
                A world worth getting lost in<span className="accent">.</span>
              </h2>
            </div>
            <Link className="text-link" href="/marketplace">
              Browse player listings
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
                  onClick={() => {
                    setGenre(value);
                    setPage(1);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="library-tools">
              <button
                className={"icon-button " + (onlySaved ? "saved" : "")}
                aria-label="Show saved games on this page"
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
          </div>
          <div className="catalog-status" aria-live="polite">
            <span>
              {loading
                ? "Searching the game universe…"
                : library.count !== null
                  ? `${library.count.toLocaleString()} ${library.fallback ? "featured picks" : "store results"} · Page ${page}`
                  : "Featured picks"}
            </span>
            <span>
              New PC games on Steam ·{" "}
              <Link href="/marketplace">Console & player listings ↗</Link>
            </span>
          </div>
          {catalogError ? (
            <div className="catalog-notice" role="status">
              {catalogError}
              <button
                className="text-link"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry catalog
              </button>
            </div>
          ) : null}
          <div
            className={"game-grid " + (loading ? "catalog-loading" : "")}
            aria-busy={loading}
          >
            {games.map((game, index) => (
              <article
                className="game-card reveal-in"
                data-tilt
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
            ))}
          </div>
          {!games.length && !loading ? (
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
                  setPage(1);
                }}
              >
                Reset filters
              </button>
            </div>
          ) : null}
          <div className="catalog-pagination">
            <button
              className="button secondary"
              disabled={page === 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeftIcon /> Previous
            </button>
            <span>Page {page}</span>
            <button
              className="button secondary"
              disabled={!library.hasMore || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next games <ChevronRightIcon />
            </button>
          </div>
          <p className="catalog-attribution">
            Catalog and reference prices from{" "}
            <a
              href="https://store.steampowered.com/"
              target="_blank"
              rel="noreferrer"
            >
              Steam
            </a>
            . New-game purchases open Steam and are fulfilled there. Prices and
            availability are confirmed by the store.
          </p>
        </section>
        <section className="sell-banner page-width" data-reveal>
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
        <section className="section page-width how-section" data-reveal>
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
    </DiscoveryMotion>
  );
}
