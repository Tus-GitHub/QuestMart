"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRightIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { catalog, genres } from "@/data/catalog.mjs";
import { useUI } from "./components/UIProvider";
import Media from "./components/Media";
import GamePreview from "./components/GamePreview";
import DiscoveryMotion from "./components/DiscoveryMotion";
import DiscoveryCard from "./components/DiscoveryCard";
import WorldJourney from "./components/WorldJourney";
import PortalEntrance from "./components/PortalEntrance";
import GameVault from "./components/GameVault";
import "./cinematic.css";
import "./world-journey.css";

const featuredGames = catalog.slice(0, 3);

export default function Discover() {
  const [selected, setSelected] = useState(null),
    [genre, setGenre] = useState("All games"),
    [search, setSearch] = useState(""),
    [onlySaved, setOnlySaved] = useState(false);
  const [library, setLibrary] = useState({
      results: catalog,
      count: null,
      hasMore: false,
    }),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [catalogError, setCatalogError] = useState(""),
    [retry, setRetry] = useState(0);
  const { saved, toggleSaved, motionDisabled } = useUI();
  const [portal, setPortal] = useState(null);
  const previewOrigin = useRef(null);
  const vaultRequested = useRef(false);
  const openPreview = useCallback((game, element = null) => {
    previewOrigin.current = element;
    setSelected(game);
  }, []);
  function enterVault() {
    vaultRequested.current = true;
    setPortal(null);
  }
  useEffect(() => {
    if (portal || !vaultRequested.current) return;
    vaultRequested.current = false;
    const frame = requestAnimationFrame(() => {
      document.getElementById("game-vault")?.scrollIntoView({
        behavior: motionDisabled ? "auto" : "smooth",
        block: "start",
      });
      document
        .getElementById("game-vault-title")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [portal, motionDisabled]);
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
  const games = library.results.filter(
    (game) => !onlySaved || saved.includes(game.id),
  );
  return (
    <DiscoveryMotion paused={motionDisabled}>
      <div className="discover-page">
        <WorldJourney
          games={featuredGames}
          onPreview={openPreview}
          onPortal={setPortal}
          covered={Boolean(selected || portal)}
        />
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
        <GameVault games={featuredGames} onPreview={openPreview} />
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
              <DiscoveryCard
                key={game.id}
                game={game}
                index={index}
                saved={saved.includes(game.id)}
                onPreview={openPreview}
                onSave={toggleSaved}
              />
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
        {portal ? (
          <PortalEntrance
            game={portal}
            onClose={() => setPortal(null)}
            onEnter={enterVault}
          />
        ) : null}
        {selected ? (
          <GamePreview
            game={selected}
            origin={previewOrigin.current}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>
    </DiscoveryMotion>
  );
}
