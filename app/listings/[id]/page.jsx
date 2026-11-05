"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import Media from "../../components/Media";
import { useUI } from "../../components/UIProvider";
export default function Listing({ params }) {
  const { id } = use(params),
    user = useSelector((s) => s.user.currentUser),
    { openAuth } = useUI();
  const [item, setItem] = useState(null),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    api("/api/listings/" + id, { signal: c.signal })
      .then((d) => setItem(d.listing))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [id]);
  return (
    <div className="page-width">
      <Link href="/marketplace" className="back-link">
        <ArrowLeftIcon /> Back to marketplace
      </Link>
      {error ? (
        <div className="empty-state" style={{ marginBlock: 50 }}>
          <h2>That quest has moved on.</h2>
          <p>{error}</p>
          <Link className="button primary" href="/marketplace">
            Browse available games
          </Link>
        </div>
      ) : !item ? (
        <div className="skeleton" style={{ height: 400, marginBlock: 30 }} />
      ) : (
        <div className="listing-detail">
          <div>
            <div className="listing-gallery">
              <Media
                src={item.photos[photo]}
                alt={item.title}
                priority
                sizes="(max-width:700px) 100vw, 55vw"
              />
            </div>
            <div className="photo-thumbs">
              {item.photos.map((url, index) => (
                <button
                  className="photo-thumb"
                  key={url}
                  aria-label={"View photo " + (index + 1)}
                  aria-pressed={photo === index}
                  onClick={() => setPhoto(index)}
                >
                  <Media src={url} alt="" sizes="80px" />
                </button>
              ))}
            </div>
          </div>
          <div className="listing-copy">
            <span className="eyebrow">PLAYER-TO-PLAYER · {item.platform}</span>
            <h1>{item.title}</h1>
            <span className="status-pill">{item.status}</span>
            <div className="price-large">{money(item.price_paise)}</div>
            <p>{item.description}</p>
            <div className="detail-meta">
              <div>
                <small>PLATFORM</small>
                <strong>{item.platform}</strong>
              </div>
              <div>
                <small>CONDITION</small>
                <strong>{readable(item.condition)}</strong>
              </div>
              <div>
                <small>FORMAT</small>
                <strong>{readable(item.format)}</strong>
              </div>
            </div>
            <p>
              Listed by{" "}
              <strong style={{ color: "var(--text)" }}>
                @{item.seller_name}
              </strong>
            </p>
            <div style={{ marginTop: 25 }}>
              {user ? (
                user._id === item.seller_id ? (
                  <Link href="/sell" className="button secondary full">
                    Manage your listing
                    <ArrowUpRightIcon />
                  </Link>
                ) : item.status === "sold" ? (
                  <button className="button secondary full" disabled>
                    This copy has found its next player
                  </button>
                ) : (
                  <Link
                    href={"/checkout/" + id}
                    className="button primary full"
                  >
                    Continue to checkout
                    <ArrowUpRightIcon />
                  </Link>
                )
              ) : (
                <button
                  className="button primary full"
                  onClick={() => openAuth()}
                >
                  Sign in to buy
                  <ArrowUpRightIcon />
                </button>
              )}
            </div>
            <div className="form-footnote">
              <ShieldCheckIcon /> Review your item and delivery details before
              payment.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
