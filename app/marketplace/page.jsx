"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ArrowUpRightIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import { PLATFORMS } from "@/lib/listing-validation.mjs";
import Media from "../components/Media";
export default function Marketplace() {
  const [q, setQ] = useState(""),
    [platform, setPlatform] = useState(""),
    [sort, setSort] = useState("newest"),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") || "");
    setPlatform(p.get("platform") || "");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
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
  return (
    <div className="page-width">
      <div className="page-heading">
        <span className="eyebrow">FROM ONE PLAYER TO THE NEXT</span>
        <h1>
          Find your next adventure<span className="accent">.</span>
        </h1>
        <p>Real copies. Real players. A new story for every game.</p>
      </div>
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
        </label>
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
      </div>
      {error ? (
        <div className="notice error" role="alert">
          {error}{" "}
          <button
            className="text-link"
            onClick={() => setRevision(revision + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="game-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton" />
          ))}
        </div>
      ) : !items.length && !error ? (
        <div className="empty-state">
          <ShoppingBagIcon />
          <h3>The next great listing could be yours.</h3>
          <p>
            {q || platform
              ? "No copies match these filters yet. Try a different game or platform."
              : "Players haven’t listed any games yet. Give your favorites a second adventure."}
          </p>
          <Link className="button primary" href="/sell">
            List a game
            <ArrowUpRightIcon />
          </Link>
        </div>
      ) : (
        <div className="game-grid">
          {items.map((item) => (
            <Link
              className="game-card reveal-in"
              key={item.id}
              href={"/listings/" + item.id}
            >
              <div className="game-card-image">
                <Media src={item.photos[0]} alt={item.title} />
                <span className="game-card-year">
                  {readable(item.condition)}
                </span>
              </div>
              <div className="game-card-info">
                <span className="eyebrow">
                  {item.platform} · {item.format}
                </span>
                <h3 style={{ marginTop: 8 }}>{item.title}</h3>
                <div className="listing-price">
                  <strong>{money(item.price_paise)}</strong>
                  <ArrowUpRightIcon />
                </div>
                <span className="game-platforms">
                  Listed by @{item.seller_name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div
        className="section"
        style={{ display: "flex", justifyContent: "center", gap: 15 }}
      >
        {page > 1 ? (
          <button
            className="button secondary"
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
        ) : null}
        {more ? (
          <button
            className="button secondary"
            onClick={() => setPage(page + 1)}
          >
            Next page
            <ArrowUpRightIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}
