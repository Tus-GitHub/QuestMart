"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  ArrowLeftIcon,
  ShoppingBagIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { money, readable } from "@/lib/client-api.mjs";
import Media from "./Media";
export default function SellerInventory({
  items,
  loading,
  error,
  onRetry,
  page,
  onPageChange,
  more,
  disabled,
  onEdit,
  onRemove,
}) {
  const [status, setStatus] = useState("all");
  const visibleItems = items.filter(
    (item) => status === "all" || item.status === status,
  );
  return (
    <section
      className="studio-collection"
      id="seller-collection"
      aria-labelledby="collection-heading"
    >
      <div className="surface-section-heading">
        <div>
          <span className="eyebrow">YOUR INVENTORY</span>
          <h2 id="collection-heading">
            The collection<span className="accent">.</span>
          </h2>
        </div>
        <Link className="text-link" href="/marketplace">
          View marketplace
          <ArrowUpRightIcon />
        </Link>
      </div>
      <div className="collection-toolbar">
        <div className="platform-switcher" aria-label="Filter your collection">
          {["all", "available", "reserved", "sold"].map((value) => (
            <button
              key={value}
              className={status === value ? "active" : ""}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {readable(value)}
              <span>
                {value === "all"
                  ? items.length
                  : items.filter((item) => item.status === value).length}
              </span>
            </button>
          ))}
        </div>
        <span className="small muted">Page {page}</span>
      </div>
      {error ? (
        <div className="notice error" role="alert">
          {error}
          <button className="text-link" onClick={() => onRetry()}>
            Retry
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="collection-grid">
          {[1, 2].map((n) => (
            <div key={n} className="skeleton" />
          ))}
        </div>
      ) : error ? null : !visibleItems.length ? (
        <div className="surface-empty compact">
          <ShoppingBagIcon />
          <h3>
            {items.length
              ? "No " + status + " games on this page."
              : "Your next chapter starts with one game."}
          </h3>
          <p>
            {items.length
              ? "Choose another status or collection page to find your games."
              : "Create your first listing above. Your published games will appear here."}
          </p>
        </div>
      ) : (
        <div className="collection-grid">
          {visibleItems.map((item, index) => (
            <article
              key={item.id}
              className="collection-card reveal-in"
              style={{ animationDelay: Math.min(index, 7) * 35 + "ms" }}
            >
              <Link href={"/listings/" + item.id} className="collection-cover">
                <Media src={item.photos[0]} alt={item.title} sizes="140px" />
              </Link>
              <div className="collection-card-content">
                <span className={"status-pill " + item.status}>
                  {readable(item.status)}
                </span>
                <Link href={"/listings/" + item.id}>
                  <h3>{item.title}</h3>
                </Link>
                <p>
                  {item.platform} · {readable(item.condition)}
                </p>
                <strong>{money(item.price_paise)}</strong>
                {item.moderation_status === "hidden" ? (
                  <p className="moderation-note">
                    Hidden by moderation: {item.moderation_reason}
                  </p>
                ) : null}
                <div className="collection-card-actions">
                  <Link href={"/listings/" + item.id}>
                    View
                    <ArrowUpRightIcon />
                  </Link>
                  {item.status === "available" ? (
                    <>
                      <button disabled={disabled} onClick={() => onEdit(item)}>
                        <PencilSquareIcon />
                        Edit listing
                      </button>
                      <button
                        className="remove-listing"
                        disabled={disabled}
                        onClick={() => {
                          onRemove(item);
                        }}
                        aria-label={"Remove " + item.title}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !error && (page > 1 || more) ? (
        <nav className="surface-pagination" aria-label="Collection pages">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => onPageChange((p) => p - 1)}
          >
            <ArrowLeftIcon />
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button secondary"
            disabled={!more}
            onClick={() => onPageChange((p) => p + 1)}
          >
            Next
            <ArrowUpRightIcon />
          </button>
        </nav>
      ) : null}
    </section>
  );
}
