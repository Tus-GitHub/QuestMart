"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { api, money } from "@/lib/client-api.mjs";
import { useUI } from "../components/UIProvider";
import Media from "../components/Media";
export default function Orders() {
  const user = useSelector((s) => s.user.currentUser),
    { openAuth } = useUI();
  const [orders, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!user) return;
    const c = new AbortController();
    setLoading(true);
    api("/api/orders", { signal: c.signal })
      .then((d) => setOrders(d.orders))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [user]);
  return (
    <div className="page-width" style={{ paddingBottom: 70 }}>
      <div className="page-heading">
        <span className="eyebrow">YOUR ADVENTURES, ALL IN ONE PLACE</span>
        <h1>
          Orders & sales<span className="accent">.</span>
        </h1>
        <p>
          Keep track of the games coming your way and the ones you’ve passed on.
        </p>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      {!user ? (
        <div className="empty-state">
          <ShoppingBagIcon />
          <h3>Your next chapter is waiting.</h3>
          <p>Sign in to view your purchases and sales.</p>
          <button className="button primary" onClick={() => openAuth()}>
            Sign in
          </button>
        </div>
      ) : loading ? (
        <div className="skeleton" />
      ) : !orders.length ? (
        <div className="empty-state">
          <ShoppingBagIcon />
          <h3>No orders yet. Plenty of adventures ahead.</h3>
          <p>Your purchases and sales will appear here.</p>
          <Link className="button primary" href="/marketplace">
            Explore the marketplace
          </Link>
        </div>
      ) : (
        orders.map((order) => (
          <article key={order.id} className="panel order-card">
            <div className="listing-row">
              <div className="listing-row-image">
                <Media
                  src={order.snapshot_photo}
                  alt={order.snapshot_title}
                  sizes="95px"
                />
              </div>
              <div className="listing-row-content">
                <span className="eyebrow">
                  {order.buyer_id === user._id ? "PURCHASE" : "SALE"} ·{" "}
                  {new Date(order.created_at).toLocaleDateString("en-IN")}
                </span>
                <h3 style={{ marginTop: 8 }}>{order.snapshot_title}</h3>
                <p>
                  {order.snapshot_platform} ·{" "}
                  {money(order.snapshot_price_paise)}
                </p>
              </div>
              <span className={"status-pill " + order.status}>
                {order.status}
              </span>
            </div>
            <p className="small muted">
              Order {order.id.slice(0, 8).toUpperCase()} · Test payment ·{" "}
              {order.payment_status}
            </p>
          </article>
        ))
      )}
    </div>
  );
}
