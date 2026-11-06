"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  ShoppingBagIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ReceiptPercentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import {
  filterOrders,
  ORDER_STATUSES,
  orderDate,
} from "@/lib/order-display.mjs";
import ExperienceSurface, {
  ExperienceHeader,
} from "../components/ExperienceSurface";
import {
  AccountGate,
  AccountError,
  AccountLoading,
} from "../components/AccountElements";
import OrderDetails, { OrderBadge } from "../components/OrderDetails";
import Media from "../components/Media";

function OrderHistory({ user }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api("/api/orders", { signal: controller.signal })
      .then((data) => setOrders(data.orders))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const purchases = orders.filter(
    (order) => order.buyer_id === user._id,
  ).length;
  const sales = orders.length - purchases;
  const filtered = filterOrders(orders, { scope, status, query }, user._id);
  const hasFilters =
    scope !== "all" || status !== "all" || Boolean(query.trim());
  function clearFilters() {
    setScope("all");
    setStatus("all");
    setQuery("");
  }
  return (
    <section className="order-history" aria-labelledby="history-heading">
      <div className="account-section-heading">
        <div>
          <span className="eyebrow">YOUR EXCHANGE ACTIVITY</span>
          <h2 id="history-heading">Every game has a story.</h2>
        </div>
        <span className="account-caption">
          {orders.length === 100
            ? "Your latest 100 orders"
            : "Your recent activity"}
        </span>
      </div>
      {loading ? (
        <AccountLoading label="Syncing your orders…" />
      ) : error ? (
        <AccountError
          message={error}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : orders.length === 0 ? (
        <div className="account-gate order-empty reveal-in">
          <div className="account-gate-art" aria-hidden="true">
            <span />
            <ShoppingBagIcon />
          </div>
          <div>
            <span className="eyebrow">A FRESH INVENTORY</span>
            <h2>Your next story starts here.</h2>
            <p>
              Purchases and sales will appear here when you place or receive a
              QuestMart order. Games bought on an external store stay with that
              store.
            </p>
            <Link className="button primary" href="/marketplace">
              Explore the exchange
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="order-overview-strip">
            <div>
              <span className="order-overview-icon">
                <ReceiptPercentIcon />
              </span>
              <span>
                <strong>{orders.length}</strong> recent orders
              </span>
            </div>
            <div>
              <ArrowDownLeftIcon />
              <span>
                <strong>{purchases}</strong> purchases
              </span>
            </div>
            <div>
              <ArrowUpRightIcon />
              <span>
                <strong>{sales}</strong> sales
              </span>
            </div>
          </div>
          <div className="order-toolbar">
            <div className="account-segment order-tabs" aria-label="Order type">
              {[
                ["all", "All orders", orders.length],
                ["purchases", "Purchases", purchases],
                ["sales", "Sales", sales],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <div className="order-search-row">
              <label className="order-search">
                <span className="sr-only">Search orders</span>
                <MagnifyingGlassIcon aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Game, player, or order ID…"
                />
              </label>
              <label className="order-status-select">
                <span className="sr-only">Order status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {Object.entries(ORDER_STATUSES).map(([value, state]) => (
                    <option key={value} value={value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="order-results-line">
            <p role="status">
              {filtered.length} {filtered.length === 1 ? "order" : "orders"}
              {hasFilters
                ? " matching your filters"
                : " in your recent activity"}
            </p>
            {hasFilters && (
              <button className="text-button" onClick={clearFilters}>
                Clear filters
                <XMarkIcon />
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="order-no-results">
              <MagnifyingGlassIcon />
              <h3>No matching orders.</h3>
              <p>Try another game name, player, or order status.</p>
              <button className="button secondary" onClick={clearFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="order-feed">
              {filtered.map((order, index) => {
                const purchase = order.buyer_id === user._id;
                return (
                  <article
                    className="history-card"
                    data-tilt
                    key={order.id}
                    style={{ "--entry-delay": `${Math.min(index, 5) * 45}ms` }}
                  >
                    <div className="history-art">
                      <Media
                        src={order.snapshot_photo}
                        alt=""
                        sizes="(max-width: 600px) 84px, 145px"
                      />
                      <span>{order.snapshot_platform}</span>
                    </div>
                    <div className="history-info">
                      <div className="history-meta">
                        <span
                          className={purchase ? "purchase-label" : "sale-label"}
                        >
                          {purchase ? (
                            <ArrowDownLeftIcon />
                          ) : (
                            <ArrowUpRightIcon />
                          )}
                          {purchase ? "PURCHASE" : "SALE"}
                        </span>
                        <span>{orderDate(order.created_at)}</span>
                      </div>
                      <h3>{order.snapshot_title}</h3>
                      <p>
                        {readable(order.snapshot_format)} ·{" "}
                        {readable(order.snapshot_condition)}{" "}
                        <span>
                          · {purchase ? "from" : "to"} @
                          {purchase ? order.seller_name : order.buyer_name}
                        </span>
                      </p>
                      <div className="history-bottom">
                        <OrderBadge order={order} />
                        <span className="history-id">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="history-action">
                      <strong>{money(order.snapshot_price_paise)}</strong>
                      <span>
                        {order.payment_mode === "test"
                          ? "Test payment"
                          : "Payment"}{" "}
                        · {readable(order.payment_status)}
                      </span>
                      <button
                        className="button secondary"
                        onClick={() => setSelected(order)}
                        aria-label={`View order for ${order.snapshot_title}`}
                      >
                        View order
                        <ArrowUpRightIcon />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div className="order-history-note">
            <ShoppingBagIcon />
            <p>
              This history covers orders placed on QuestMart. Purchases made
              through official store links are managed by those stores.
            </p>
          </div>
        </>
      )}
      {selected && (
        <OrderDetails
          order={selected}
          userId={user._id}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

export default function Orders() {
  const user = useSelector((state) => state.user.currentUser);
  return (
    <ExperienceSurface className="account-experience orders-experience">
      <div className="page-width">
        <ExperienceHeader
          eyebrow="THE ORDER LOG"
          title="Good games."
          accent="Great exchanges."
          description="From the first click to the next chapter. Your purchases and sales, all in one place."
          icon={ShoppingBagIcon}
          orbitLabel="ORDERS / CONNECTED"
          orbitCaption="EVERY EXCHANGE. A NEW CHAPTER."
        >
          <Link className="button secondary" href="/marketplace">
            Find your next game
            <ArrowUpRightIcon />
          </Link>
        </ExperienceHeader>
        {user ? (
          <OrderHistory key={user._id} user={user} />
        ) : (
          <AccountGate
            title="Your order log awaits."
            description="Sign in to view your purchases, sales, and the details behind every exchange."
            icon={ShoppingBagIcon}
          />
        )}
      </div>
    </ExperienceSurface>
  );
}
