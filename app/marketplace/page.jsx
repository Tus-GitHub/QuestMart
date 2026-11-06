"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ArrowUpRightIcon,
  ShoppingBagIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  PlusIcon,
  EyeIcon,
  ArrowLeftIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import { PLATFORMS } from "@/lib/listing-validation.mjs";
import Media from "../components/Media";
import ExperienceSurface, {
  ExperienceHeader,
} from "../components/ExperienceSurface";
import { ListingPreview } from "../components/GamePreview";

export default function Marketplace() {
  const [q, setQ] = useState(""),
    [platform, setPlatform] = useState(""),
    [sort, setSort] = useState("newest"),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") || "");
    setPlatform(PLATFORMS.includes(p.get("platform")) ? p.get("platform") : "");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      setError("");
      try {
        const p = new URLSearchParams({
          q,
          platform,
          sort,
          page: String(page),
        });
        const data = await api("/api/listings?" + p, {
          signal: controller.signal,
        });
        setItems(data.listings);
        setMore(data.hasMore);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, platform, sort, page, revision]);
  function clearFilters() {
    setQ("");
    setPlatform("");
    setSort("newest");
    setPage(1);
  }
  const filtered = Boolean(q || platform || sort !== "newest");
  return (
    <ExperienceSurface className="market-experience">
      <div className="page-width">
        <ExperienceHeader
          eyebrow="THE PLAYER EXCHANGE"
          title="Great games."
          accent="Next players."
          description="Discover physical games from other players. Find your platform, meet your next favorite, and keep the adventure going."
        >
          <a href="#market-inventory" className="button primary">
            Explore listings
            <ArrowUpRightIcon />
          </a>
          <Link href="/sell" className="button glass">
            List a game
            <PlusIcon />
          </Link>
        </ExperienceHeader>
        <div className="exchange-strip">
          <span>
            <CubeIcon /> Physical copies
          </span>
          <span>
            <ShoppingBagIcon /> Player-owned games
          </span>
          <Link href="/#discover">
            Looking for new games?
            <ArrowUpRightIcon />
          </Link>
        </div>
        <section
          className="market-inventory"
          id="market-inventory"
          aria-label="Player listings"
        >
          <div className="surface-section-heading">
            <div>
              <span className="eyebrow">FIND YOUR NEXT QUEST</span>
              <h2>
                The trading floor<span className="accent">.</span>
              </h2>
            </div>
            <span className="surface-code">QM / MARKETPLACE</span>
          </div>
          <div className="market-console">
            <div className="market-filters">
              <label className="search-field">
                <MagnifyingGlassIcon />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search player listings…"
                  aria-label="Search listings"
                />
                <span className="search-key" aria-hidden="true">
                  FIND
                </span>
              </label>
              <label className="market-select">
                <span>Platform</span>
                <select
                  aria-label="Platform"
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All platforms</option>
                  {PLATFORMS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="market-select">
                <span>Sort by</span>
                <select
                  aria-label="Sort listings"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">Recently listed</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </label>
            </div>
            <div
              className="platform-switcher"
              aria-label="Quick platform filters"
            >
              {["", "PS5", "Xbox Series X", "Nintendo Switch", "PC"].map(
                (p) => (
                  <button
                    key={p}
                    aria-pressed={platform === p}
                    className={platform === p ? "active" : ""}
                    onClick={() => {
                      setPlatform(p);
                      setPage(1);
                    }}
                  >
                    {p || "All platforms"}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="market-results-bar">
            <span role="status">
              {loading
                ? "Finding your next adventure…"
                : error
                  ? "Listings unavailable"
                  : items.length +
                    (items.length === 1 ? " copy" : " copies") +
                    " on this page · Page " +
                    page}
            </span>
            {filtered ? (
              <button className="text-link" onClick={clearFilters}>
                <XMarkIcon />
                Reset filters
              </button>
            ) : (
              <span>
                <AdjustmentsHorizontalIcon /> Curated by the community
              </span>
            )}
          </div>
          {error ? (
            <div className="notice error" role="alert">
              {error}
              <button
                className="text-link"
                onClick={() => setRevision((r) => r + 1)}
              >
                Try again
              </button>
            </div>
          ) : null}
          {loading ? (
            <div
              className="game-grid market-card-grid"
              aria-label="Loading listings"
            >
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton market-skeleton" />
              ))}
            </div>
          ) : error ? null : !items.length ? (
            <div className="surface-empty">
              <div className="empty-orbit">
                <ShoppingBagIcon />
              </div>
              <span className="eyebrow">ROOM FOR ANOTHER ADVENTURE</span>
              <h3>
                {filtered
                  ? "No games in this orbit. Yet."
                  : "Be the first player on the trading floor."}
              </h3>
              <p>
                {filtered
                  ? "Try a different title or platform, or clear your filters to explore every listing."
                  : "Give your finished games a new home. Your listing could be someone’s next favorite."}
              </p>
              <div className="experience-actions">
                {filtered ? (
                  <button className="button secondary" onClick={clearFilters}>
                    Clear filters
                    <XMarkIcon />
                  </button>
                ) : null}
                <Link className="button primary" href="/sell">
                  List a game
                  <PlusIcon />
                </Link>
              </div>
            </div>
          ) : (
            <div className="game-grid market-card-grid" aria-busy={loading}>
              {items.map((item, index) => (
                <article
                  className="game-card market-card reveal-in"
                  data-tilt
                  key={item.id}
                  style={{
                    animationDelay: Math.min(index, 7) * 45 + "ms",
                    "--game-color": "#c1ef76",
                  }}
                >
                  <span className="card-shine" aria-hidden="true" />
                  <Link
                    className="game-card-image"
                    href={"/listings/" + item.id}
                    aria-label={"View " + item.title}
                  >
                    <Media
                      src={item.photos[0]}
                      alt={item.title}
                      draggable={false}
                    />
                    <span className="game-card-year">
                      {readable(item.condition)}
                    </span>
                    <span className="market-format">
                      {readable(item.format)}
                    </span>
                  </Link>
                  <button
                    className="market-quick-look"
                    aria-label={"Quick look at " + item.title}
                    onClick={() => setSelected(item)}
                  >
                    <EyeIcon />
                    <span>Quick look</span>
                  </button>
                  <div className="game-card-info">
                    <span className="eyebrow">
                      {item.platform} / PLAYER LISTING
                    </span>
                    <Link
                      className="market-card-title"
                      href={"/listings/" + item.id}
                    >
                      <h3>{item.title}</h3>
                      <ArrowUpRightIcon />
                    </Link>
                    <span className="market-seller">
                      <span className="seller-avatar" aria-hidden="true">
                        {item.seller_name.slice(0, 1).toUpperCase()}
                      </span>
                      @{item.seller_name}
                    </span>
                    <div className="market-card-bottom">
                      <strong>{money(item.price_paise)}</strong>
                      <Link
                        href={"/listings/" + item.id}
                        aria-label={"View listing for " + item.title}
                      >
                        View listing
                        <ArrowUpRightIcon />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!error && !loading && (page > 1 || more) ? (
            <nav className="surface-pagination" aria-label="Marketplace pages">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ArrowLeftIcon />
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button secondary"
                disabled={!more}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ArrowUpRightIcon />
              </button>
            </nav>
          ) : null}
        </section>
      </div>
      {selected ? (
        <ListingPreview item={selected} onClose={() => setSelected(null)} />
      ) : null}
    </ExperienceSurface>
  );
}
