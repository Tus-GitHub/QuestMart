"use client";
import Link from "next/link";
import { useEffect, useState, use } from "react";
import { ShieldCheckIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { api, money } from "@/lib/client-api.mjs";
import Media from "../../components/Media";
export default function Checkout({ params }) {
  const { id } = use(params),
    [item, setItem] = useState(null),
    [error, setError] = useState("");
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
      <Link className="back-link" href={"/listings/" + id}>
        <ArrowLeftIcon /> Back to listing
      </Link>
      <div className="page-heading">
        <span className="eyebrow">ONE STEP CLOSER TO YOUR NEXT ADVENTURE</span>
        <h1>Your checkout.</h1>
      </div>
      {error ? (
        <p className="notice error">{error}</p>
      ) : item ? (
        <div className="seller-layout">
          <section className="panel">
            <h2>Payment setup in progress</h2>
            <p className="muted" style={{ marginTop: 15 }}>
              We’re connecting secure checkout. You can explore games and
              publish listings now. Purchases will open once payment testing is
              complete.
            </p>
            <div className="notice">
              <ShieldCheckIcon /> No payment has been taken and this copy has
              not been reserved.
            </div>
            <Link className="button primary" href="/marketplace">
              Keep exploring
            </Link>
          </section>
          <aside className="panel">
            <div className="listing-row">
              <div className="listing-row-image">
                <Media src={item.photos[0]} alt={item.title} sizes="95px" />
              </div>
              <div className="listing-row-content">
                <h3>{item.title}</h3>
                <p>{item.platform}</p>
                <strong className="accent">{money(item.price_paise)}</strong>
              </div>
            </div>
            <p className="small muted">Sold by @{item.seller_name}</p>
          </aside>
        </div>
      ) : (
        <div className="skeleton" />
      )}
    </div>
  );
}
