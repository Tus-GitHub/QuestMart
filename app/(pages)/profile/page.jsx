"use client";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useUI } from "../../components/UIProvider";
import { api } from "@/lib/client-api.mjs";
export default function Profile() {
  const user = useSelector((s) => s.user.currentUser),
    { openAuth } = useUI(),
    [stats, setStats] = useState(null);
  useEffect(() => {
    if (!user) return;
    const c = new AbortController();
    Promise.all([
      api("/api/listings?mine=true", { signal: c.signal }),
      api("/api/orders", { signal: c.signal }),
    ])
      .then(([l, o]) =>
        setStats({
          listed: l.listings.length,
          sold: o.orders.filter(
            (v) => v.seller_id === user._id && v.payment_status === "paid",
          ).length,
          bought: o.orders.filter(
            (v) => v.buyer_id === user._id && v.payment_status === "paid",
          ).length,
        }),
      )
      .catch(() => {});
    return () => c.abort();
  }, [user]);
  return (
    <div className="page-width" style={{ paddingBottom: 70 }}>
      <div className="page-heading">
        <span className="eyebrow">PLAYER HUB</span>
        <h1>{user ? "Hey, " + user.username + "." : "Welcome, player."}</h1>
        <p>Your collection. Your adventures. All in one place.</p>
      </div>
      {!user ? (
        <div className="empty-state">
          <UserCircleIcon />
          <h3>Make yourself at home.</h3>
          <p>Sign in to access your player profile.</p>
          <button className="button primary" onClick={() => openAuth()}>
            Sign in
          </button>
        </div>
      ) : (
        <>
          <div className="panel">
            <span className="eyebrow">YOUR ACCOUNT</span>
            <h2 style={{ margin: "12px 0" }}>@{user.username}</h2>
            <p className="muted">{user.email}</p>
            <p className="small muted" style={{ marginTop: 10 }}>
              Player since{" "}
              {new Date(user.createdAt).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="dashboard-stats">
            {[
              ["Games listed", stats?.listed],
              ["Games sold", stats?.sold],
              ["Games purchased", stats?.bought],
            ].map(([name, value]) => (
              <div key={name}>
                <strong>{value ?? "—"}</strong>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <div className="hero-actions">
            <Link href="/sell" className="button primary">
              Seller studio
              <ArrowUpRightIcon />
            </Link>
            <Link href="/orders" className="button secondary">
              Orders & sales
              <ArrowUpRightIcon />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
