"use client";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  UserCircleIcon,
  CubeTransparentIcon,
  ShoppingBagIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import ExperienceSurface, {
  ExperienceHeader,
} from "@/app/components/ExperienceSurface";
import { AccountGate, AccountError } from "@/app/components/AccountElements";
import { api } from "@/lib/client-api.mjs";

function PlayerHub({ user }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setLoading(true);
    api("/api/profile", { signal: controller.signal })
      .then((data) => setStats(data.stats))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const joined = new Date(user.createdAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const metrics = [
    {
      key: "listed",
      label: "Games listed",
      note: "Across your inventory",
      icon: CubeTransparentIcon,
    },
    {
      key: "bought",
      label: "Games purchased",
      note: "Payment confirmed",
      icon: ShoppingBagIcon,
    },
    {
      key: "sold",
      label: "Games sold",
      note: "Payment confirmed",
      icon: ArrowTrendingUpIcon,
    },
  ];
  return (
    <>
      <section className="player-overview">
        <div className="player-identity reveal-in" data-tilt>
          <div className="identity-top">
            <span className="eyebrow">QUESTMART / PLAYER ID</span>
            <span className="identity-chip">
              <span className="live-dot" />
              SIGNED IN
            </span>
          </div>
          <div className="identity-main">
            <div className="player-avatar" aria-hidden="true">
              {user.username.slice(0, 2).toUpperCase()}
              <span />
            </div>
            <div>
              <span className="muted">Good to have you here,</span>
              <h2>{user.username}</h2>
              <span className="player-role">
                {user.role === "admin" ? "Store admin" : "QuestMart player"}
              </span>
            </div>
          </div>
          <dl className="identity-facts">
            <div>
              <dt>
                <EnvelopeIcon />
                Email
              </dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>
                <CalendarDaysIcon />
                Member since
              </dt>
              <dd>{joined}</dd>
            </div>
          </dl>
          <div className="identity-bottom">
            <span className="identity-barcode" aria-hidden="true" />
            <span>ONE ACCOUNT. ENDLESS POSSIBILITIES.</span>
            <ShieldCheckIcon aria-hidden="true" />
          </div>
        </div>
        <div className="player-welcome reveal-in">
          <span className="eyebrow">
            <SparklesIcon /> READY FOR WHAT’S NEXT
          </span>
          <h2>
            Make room for
            <br />
            <em>your next favorite.</em>
          </h2>
          <p>
            Your player hub keeps your listings and orders together. Pick up
            where you left off.
          </p>
          <Link className="button primary" href="/marketplace">
            Explore the exchange
            <ArrowUpRightIcon />
          </Link>
          <div className="player-welcome-note">
            <span className="live-dot" />A fresh chapter starts with a great
            game.
          </div>
        </div>
      </section>
      <section
        className="player-stats-section"
        aria-labelledby="player-stats-heading"
        aria-busy={loading}
      >
        <div className="account-section-heading">
          <div>
            <span className="eyebrow">YOUR ACTIVITY</span>
            <h2 id="player-stats-heading">The collection, in numbers.</h2>
          </div>
          <span className="account-caption">All-time activity</span>
        </div>
        {error && (
          <AccountError
            message={error}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}
        <div className="player-stats">
          {metrics.map(({ key, label, note, icon: Icon }, index) => (
            <div
              key={key}
              className="player-stat reveal-in"
              style={{ "--reveal-delay": `${index * 70}ms` }}
            >
              <div>
                <span>{label}</span>
                <Icon aria-hidden="true" />
              </div>
              <strong>
                {loading ? (
                  <span className="stat-skeleton" aria-label="Loading" />
                ) : (
                  (stats?.[key] ?? "—")
                )}
              </strong>
              <span className="stat-note">{note}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="player-next" aria-labelledby="next-move-heading">
        <div className="account-section-heading">
          <div>
            <span className="eyebrow">PICK YOUR NEXT MOVE</span>
            <h2 id="next-move-heading">Jump straight in.</h2>
          </div>
          <BoltIcon aria-hidden="true" />
        </div>
        <div className="player-shortcuts">
          <Link href="/sell" className="player-shortcut reveal-in" data-tilt>
            <span className="shortcut-icon">
              <CubeTransparentIcon />
            </span>
            <span className="shortcut-index">01 / CREATE</span>
            <h3>Your seller studio</h3>
            <p>List a game. Manage your collection. Find its next player.</p>
            <span className="shortcut-link">
              Open studio
              <ArrowUpRightIcon />
            </span>
          </Link>
          <Link href="/orders" className="player-shortcut reveal-in" data-tilt>
            <span className="shortcut-icon violet">
              <ShoppingBagIcon />
            </span>
            <span className="shortcut-index">02 / TRACK</span>
            <h3>Orders & sales</h3>
            <p>See purchases, sales, and payment details in one place.</p>
            <span className="shortcut-link">
              View orders
              {stats && <span className="shortcut-count">{stats.orders}</span>}
              <ArrowUpRightIcon />
            </span>
          </Link>
          <Link
            href={user.role === "admin" ? "/admin" : "/"}
            className="player-shortcut reveal-in"
            data-tilt
          >
            <span className="shortcut-icon blue">
              {user.role === "admin" ? <ShieldCheckIcon /> : <SparklesIcon />}
            </span>
            <span className="shortcut-index">
              03 / {user.role === "admin" ? "MANAGE" : "DISCOVER"}
            </span>
            <h3>
              {user.role === "admin" ? "Store control" : "Find your next game"}
            </h3>
            <p>
              {user.role === "admin"
                ? "Manage store activity and keep the community running."
                : "Explore the catalog and discover your next obsession."}
            </p>
            <span className="shortcut-link">
              {user.role === "admin" ? "Open admin" : "Explore games"}
              <ArrowUpRightIcon />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}

export default function Profile() {
  const user = useSelector((state) => state.user.currentUser);
  return (
    <ExperienceSurface className="account-experience">
      <div className="page-width">
        <ExperienceHeader
          eyebrow="THE PLAYER HUB"
          title="Your world."
          accent="Ready to play."
          description="A home for your collection, your trades, and whatever comes next."
          icon={UserCircleIcon}
          orbitLabel="PLAYER / CONNECTED"
          orbitCaption="YOUR GAMES. YOUR OWN UNIVERSE."
        >
          <Link className="button secondary" href="/orders">
            Orders & sales
            <ArrowUpRightIcon />
          </Link>
        </ExperienceHeader>
        {user ? (
          <PlayerHub key={user._id} user={user} />
        ) : (
          <AccountGate
            title="Your player hub awaits."
            description="Sign in to see your collection, manage your listings, and follow your orders."
          />
        )}
      </div>
    </ExperienceSurface>
  );
}
