"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  Squares2X2Icon,
  UsersIcon,
  RectangleStackIcon,
  ShoppingBagIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpRightIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CubeTransparentIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import { signInSuccess, signOutUserSuccess } from "@/redux/user/userSlice";
import { useUI } from "../components/UIProvider";
import Dialog from "../components/Dialog";
import Media from "../components/Media";
import ExperienceSurface, {
  MotionToggle,
} from "../components/ExperienceSurface";

const sections = [
  ["overview", "Overview", Squares2X2Icon, "Your marketplace, at a glance."],
  ["users", "Players", UsersIcon, "Manage accounts and administrator access."],
  [
    "listings",
    "Listings",
    RectangleStackIcon,
    "Keep the player marketplace in good shape.",
  ],
  [
    "orders",
    "Orders",
    ShoppingBagIcon,
    "Review transactions and their fulfillment status.",
  ],
  [
    "activity",
    "Activity log",
    ClockIcon,
    "A record of who changed what, and why.",
  ],
  [
    "security",
    "Security",
    ShieldCheckIcon,
    "Protect your account and active sessions.",
  ],
];
const filters = {
  users: ["all", "active", "suspended", "admin"],
  listings: [
    "all",
    "visible",
    "hidden",
    "available",
    "reserved",
    "sold",
    "removed",
  ],
  orders: ["all", "pending", "confirmed", "completed", "cancelled"],
  activity: ["all", "user", "listing", "order", "security"],
};
const actionLabels = {
  suspend: "Suspend account",
  reactivate: "Reactivate account",
  promote: "Make administrator",
  demote: "Remove admin access",
  hide: "Hide listing",
  restore: "Restore visibility",
  cancel: "Cancel unpaid order",
  complete: "Mark completed",
};
function date(value, time = false) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
function Badge({ value }) {
  return (
    <span className={`admin-badge badge-${value}`}>
      {readable(value?.replaceAll("_", " "))}
    </span>
  );
}
function Empty({
  text = "Nothing here yet.",
  detail = "New records will appear here as your marketplace grows.",
}) {
  return (
    <div className="admin-empty">
      <RectangleStackIcon />
      <h3>{text}</h3>
      <p>{detail}</p>
    </div>
  );
}
function exportRows(section, rows) {
  const fields = {
    users: ["id", "username", "email", "role", "account_status", "created_at"],
    listings: [
      "id",
      "title",
      "seller_name",
      "platform",
      "price_paise",
      "status",
      "moderation_status",
    ],
    orders: [
      "id",
      "snapshot_title",
      "buyer_name",
      "seller_name",
      "snapshot_price_paise",
      "status",
      "payment_status",
    ],
    activity: [
      "id",
      "actor_name",
      "action",
      "entity_id",
      "reason",
      "created_at",
    ],
  }[section];
  const escape = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = [fields, ...rows.map((row) => fields.map((field) => row[field]))]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `questmart-${section}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminConsole({ initialUser }) {
  const detailRevision = useRef(0);
  const [user, setUser] = useState(initialUser),
    [section, setSection] = useState(
      initialUser.passwordChangeRequired ? "security" : "overview",
    );
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [confirmation, setConfirmation] = useState(null),
    [detail, setDetail] = useState(null);
  const router = useRouter(),
    dispatch = useDispatch(),
    { notify } = useUI();
  const currentUser = useSelector((state) => state.user.currentUser),
    checked = useSelector((state) => state.user.sessionChecked);
  useEffect(() => {
    if (checked && currentUser?.role !== "admin") router.refresh();
  }, [checked, currentUser, router]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const timer = setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({
            q: search,
            filter,
            page: String(page),
          });
          const result = await api(`/api/admin/${section}?${params}`, {
            signal: controller.signal,
          });
          if (!controller.signal.aborted) setData(result);
        } catch (err) {
          if (!controller.signal.aborted) {
            setError(err.message);
            if (err.status === 401) dispatch(signOutUserSuccess());
            if ([401, 403, 428].includes(err.status)) router.refresh();
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [section, search, filter, page, revision, router, dispatch]);
  function navigate(next) {
    setSection(next);
    setSearch("");
    setFilter("all");
    setPage(1);
    setData(null);
  }
  function action(item, kind) {
    setConfirmation({ item, action: kind, section });
  }
  async function viewOrder(item) {
    const requestRevision = ++detailRevision.current;
    setDetail({ type: "order", item: null, error: "" });
    try {
      const response = await api(`/api/admin/orders/${item.id}`);
      if (detailRevision.current === requestRevision)
        setDetail({ type: "order", item: response.item });
    } catch (err) {
      if (detailRevision.current === requestRevision)
        setDetail({ type: "order", error: err.message });
    }
  }
  const selected = sections.find(([id]) => id === section);
  return (
    <ExperienceSurface className="admin-experience">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span className="admin-brand-icon">
              <ShieldCheckIcon />
            </span>
            <div>
              <strong>Control room</strong>
              <small>QUESTMART ADMIN</small>
            </div>
          </div>
          <span className="admin-nav-label">WORKSPACE</span>
          <nav aria-label="Admin sections">
            {sections.map(([id, label, Icon]) => (
              <button
                key={id}
                className={section === id ? "active" : ""}
                aria-current={section === id ? "page" : undefined}
                disabled={user.passwordChangeRequired && id !== "security"}
                onClick={() => navigate(id)}
              >
                <Icon />
                <span>{label}</span>
                {id === section ? <span className="admin-nav-dot" /> : null}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-bottom">
            <div className="admin-identity">
              <span>{user.username.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{user.username}</strong>
                <small>Administrator</small>
              </div>
            </div>
            <Link href="/">
              Open storefront <ArrowUpRightIcon />
            </Link>
          </div>
        </aside>
        <section className="admin-workspace">
          <div className="admin-breadcrumb">
            <span>WORKSPACE</span>
            <span>/</span>
            <span>{selected[1]}</span>
            <span className="admin-protected">
              <ShieldCheckIcon /> Protected session
            </span>
            <MotionToggle className="admin-motion-toggle" />
          </div>
          <header
            className="admin-heading admin-command-header"
            data-hero-parallax
          >
            <div className="experience-grid" aria-hidden="true" />
            <div className="admin-command-copy">
              <span className="eyebrow">
                <span className="live-dot" /> YOUR MARKETPLACE. YOUR MISSION.
              </span>
              <h1>
                {section === "overview" ? (
                  <>
                    Keep the game
                    <br />
                    <em>going.</em>
                  </>
                ) : (
                  <>
                    {selected[1]}
                    <span className="accent">.</span>
                  </>
                )}
              </h1>
              <p>{selected[3]}</p>
              <button
                className="button secondary admin-refresh"
                aria-label="Refresh admin data"
                onClick={() => setRevision((v) => v + 1)}
                disabled={loading}
              >
                <ArrowPathIcon className={loading ? "admin-spin" : ""} />
                Refresh
              </button>
            </div>
            <div className="admin-command-art" aria-hidden="true">
              <div className="admin-command-ring" />
              <div className="admin-command-ring ring-two" />
              <div className="admin-command-core">
                <ShieldCheckIcon />
                <span>QUEST / CONTROL</span>
              </div>
              <span className="admin-command-caption">
                BUILT FOR THE PEOPLE BEHIND THE PLAY
              </span>
            </div>
          </header>
          {error ? (
            <div className="admin-error" role="alert">
              {error}
              <button onClick={() => setRevision((v) => v + 1)}>
                Try again
              </button>
            </div>
          ) : null}
          {section === "security" ? (
            <Security
              user={user}
              onSuccess={(updated) => {
                setUser(updated);
                dispatch(signInSuccess(updated));
                notify(
                  "Password updated. Other sessions have been signed out.",
                );
                navigate("overview");
                router.refresh();
              }}
            />
          ) : (
            <>
              {section !== "overview" ? (
                <div className="admin-toolbar">
                  <label className="admin-search">
                    <MagnifyingGlassIcon />
                    <input
                      aria-label={`Search ${selected[1].toLowerCase()}`}
                      placeholder={
                        section === "orders"
                          ? "Search game, player or order ID…"
                          : "Search " + selected[1].toLowerCase() + "…"
                      }
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label className="admin-filter">
                    <span className="sr-only">Filter {selected[1]}</span>
                    <select
                      aria-label={`Filter ${selected[1].toLowerCase()}`}
                      value={filter}
                      onChange={(event) => {
                        setFilter(event.target.value);
                        setPage(1);
                      }}
                    >
                      {filters[section].map((value) => (
                        <option key={value} value={value}>
                          {value === "all" ? "All records" : readable(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    disabled={!data?.rows?.length || loading}
                    onClick={() => exportRows(section, data.rows)}
                  >
                    <ArrowDownTrayIcon />
                    Export this page
                  </button>
                </div>
              ) : null}
              {loading ? (
                <div className="admin-loading" role="status">
                  <span className="admin-spinner" />
                  Loading {selected[1].toLowerCase()}…
                </div>
              ) : data ? (
                section === "overview" ? (
                  <Overview data={data} navigate={navigate} />
                ) : (
                  <>
                    <div className="admin-panel admin-records">
                      <div className="admin-panel-heading">
                        <h2>{selected[1]}</h2>
                        <span>
                          {data.total.toLocaleString()}{" "}
                          {data.total === 1 ? "record" : "records"}
                        </span>
                      </div>
                      {!data.rows.length ? (
                        <Empty
                          text={
                            search || filter !== "all"
                              ? "No matching records."
                              : "Nothing here yet."
                          }
                          detail={
                            search || filter !== "all"
                              ? "Try a different search or reset the filter."
                              : undefined
                          }
                        />
                      ) : (
                        <RecordTable
                          section={section}
                          rows={data.rows}
                          actorId={user._id}
                          action={action}
                          viewOrder={viewOrder}
                          setDetail={setDetail}
                        />
                      )}
                      {!data.rows.length && (search || filter !== "all") ? (
                        <div className="admin-reset-search">
                          <button
                            className="button secondary"
                            onClick={() => {
                              setSearch("");
                              setFilter("all");
                              setPage(1);
                            }}
                          >
                            Clear search and filters
                          </button>
                        </div>
                      ) : null}
                      <div className="admin-pagination">
                        <span>
                          Page {data.page} of {data.pages}
                        </span>
                        <div>
                          <button
                            className="icon-button"
                            aria-label="Previous admin page"
                            disabled={data.page <= 1}
                            onClick={() => setPage(data.page - 1)}
                          >
                            <ChevronLeftIcon />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Next admin page"
                            disabled={data.page >= data.pages}
                            onClick={() => setPage(data.page + 1)}
                          >
                            <ChevronRightIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )
              ) : null}
            </>
          )}
          <p className="admin-footnote">
            QUESTMART OPERATIONS{" "}
            <span>
              Times shown in India Standard Time · Changes are recorded in the
              activity log
            </span>
          </p>
        </section>
        {confirmation ? (
          <ConfirmAction
            value={confirmation}
            onClose={() => setConfirmation(null)}
            onSuccess={() => {
              setConfirmation(null);
              setRevision((v) => v + 1);
              notify("Change saved and recorded in the activity log.");
            }}
          />
        ) : null}
        {detail ? (
          <DetailDialog
            detail={detail}
            onClose={() => {
              detailRevision.current++;
              setDetail(null);
            }}
          />
        ) : null}
      </div>
    </ExperienceSurface>
  );
}

function Overview({ data, navigate }) {
  const counts = data.counts,
    max = Math.max(
      1,
      ...data.trend.map((day) => day.users + day.listings + day.orders),
    );
  return (
    <div className="admin-overview">
      <div className="admin-stats">
        {[
          [
            "Players",
            counts.users,
            UsersIcon,
            `${counts.suspended_users} suspended`,
            "users",
          ],
          [
            "Available listings",
            counts.available_listings,
            RectangleStackIcon,
            `${counts.hidden_listings} hidden by moderation`,
            "listings",
          ],
          [
            "Orders",
            counts.orders,
            ShoppingBagIcon,
            `${counts.pending_orders} awaiting payment`,
            "orders",
          ],
          [
            "Paid order volume",
            money(Number(counts.paid_volume)),
            ShieldCheckIcon,
            "Test mode · not store revenue",
            "orders",
          ],
        ].map(([title, value, Icon, note, section], index) => (
          <button
            className="admin-stat"
            data-tilt
            style={{ "--admin-delay": `${index * 55}ms` }}
            key={title}
            onClick={() => navigate(section)}
          >
            <div>
              <span>{title}</span>
              <Icon />
            </div>
            <strong
              className={
                String(value).length > 7 ? "admin-stat-long" : undefined
              }
            >
              {value}
            </strong>
            <small>
              {note}
              <ArrowUpRightIcon />
            </small>
          </button>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="eyebrow">MARKETPLACE PULSE</span>
              <h2>Activity over time</h2>
            </div>
            <span>Last 14 days</span>
          </div>
          <div className="admin-chart-legend">
            <span>
              <i className="chart-users" />
              Players
            </span>
            <span>
              <i className="chart-listings" />
              Listings
            </span>
            <span>
              <i className="chart-orders" />
              Orders
            </span>
          </div>
          <div
            className="admin-chart"
            role="img"
            aria-label="Stacked bars showing registrations, new listings and orders in the last 14 days. Exact values are in the data table below."
          >
            {data.trend.map((day) => (
              <div
                className="admin-chart-column"
                key={day.day}
                title={`${day.day}: ${day.users} players, ${day.listings} listings, ${day.orders} orders`}
              >
                <div className="admin-chart-stack">
                  <span
                    className="chart-orders"
                    style={{ height: `${(day.orders / max) * 100}%` }}
                  />
                  <span
                    className="chart-listings"
                    style={{ height: `${(day.listings / max) * 100}%` }}
                  />
                  <span
                    className="chart-users"
                    style={{ height: `${(day.users / max) * 100}%` }}
                  />
                </div>
                <small>{day.day.slice(-2)}</small>
              </div>
            ))}
          </div>
          <details className="admin-chart-data">
            <summary>View exact daily figures</summary>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Players</th>
                    <th>Listings</th>
                    <th>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((day) => (
                    <tr key={day.day}>
                      <td>{day.day}</td>
                      <td>{day.users}</td>
                      <td>{day.listings}</td>
                      <td>{day.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="admin-panel admin-health">
          <div className="admin-panel-heading">
            <div>
              <span className="eyebrow">SERVICE STATUS</span>
              <h2>Connected systems</h2>
            </div>
            <CubeTransparentIcon
              className="admin-service-icon"
              aria-hidden="true"
            />
          </div>
          {[
            ["PostgreSQL", data.services.database],
            ["New-game checkout", data.services.newGames],
            ["Listing photos", data.services.uploads],
            ["Player payments", data.services.payments],
          ].map(([title, status]) => (
            <div className="admin-service" key={title}>
              <span>
                <i
                  className={
                    title === "Player payments" || status === "Not configured"
                      ? "service-pending"
                      : "service-ready"
                  }
                />
                {title}
              </span>
              <strong>{status}</strong>
            </div>
          ))}
          <p>
            Steam purchases happen outside QuestMart and are not counted as
            QuestMart orders.
          </p>
        </section>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow">LATEST ACTIONS</span>
            <h2>Recent activity</h2>
          </div>
          <button className="text-link" onClick={() => navigate("activity")}>
            View activity log <ArrowUpRightIcon />
          </button>
        </div>
        {data.recent.length ? (
          <div className="admin-timeline">
            {data.recent.map((item) => (
              <div key={item.id}>
                <span className="admin-timeline-icon">
                  <CheckCircleIcon />
                </span>
                <div>
                  <strong>
                    {item.action.replaceAll(".", " / ").replaceAll("_", " ")}
                  </strong>
                  <p>{item.reason}</p>
                  <small>
                    {item.actor_name} · {date(item.created_at, true)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            text="A clean slate."
            detail="Moderation and security actions will appear here as you make them."
          />
        )}
      </section>
    </div>
  );
}

function RecordTable({ section, rows, actorId, action, viewOrder, setDetail }) {
  const headings = {
    users: ["Player", "Access", "Status", "Joined", "Actions"],
    listings: [
      "Game / seller",
      "Price",
      "Availability",
      "Moderation",
      "Actions",
    ],
    orders: ["Order / game", "Players", "Amount", "Status", "Actions"],
    activity: ["Action", "Administrator", "Reason", "Time", "Details"],
  }[section];
  return (
    <div className="admin-table-wrap">
      <table
        className="admin-table"
        role="table"
        aria-label={`${section} records`}
      >
        <thead>
          <tr role="row">
            {headings.map((heading) => (
              <th scope="col" role="columnheader" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} role="row">
              {section === "users" ? (
                <>
                  <td role="cell" data-label={headings[0]}>
                    <div className="admin-player-cell">
                      <span>{item.username.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>
                          {item.username}
                          {item.id === actorId ? " (you)" : ""}
                        </strong>
                        <small>{item.email}</small>
                        <small>{item.listing_count} listings</small>
                      </div>
                    </div>
                  </td>
                  <td role="cell" data-label={headings[1]}>
                    <Badge value={item.role} />
                  </td>
                  <td role="cell" data-label={headings[2]}>
                    <Badge value={item.account_status} />
                  </td>
                  <td role="cell" data-label={headings[3]}>
                    {date(item.created_at)}
                  </td>
                  <td role="cell" data-label={headings[4]}>
                    <div className="admin-row-actions">
                      <button
                        disabled={item.id === actorId}
                        onClick={() =>
                          action(
                            item,
                            item.account_status === "active"
                              ? "suspend"
                              : "reactivate",
                          )
                        }
                      >
                        {item.account_status === "active"
                          ? "Suspend"
                          : "Reactivate"}
                      </button>
                      <button
                        disabled={item.id === actorId}
                        onClick={() =>
                          action(
                            item,
                            item.role === "admin" ? "demote" : "promote",
                          )
                        }
                      >
                        {item.role === "admin" ? "Remove admin" : "Make admin"}
                      </button>
                    </div>
                  </td>
                </>
              ) : null}
              {section === "listings" ? (
                <>
                  <td role="cell" data-label={headings[0]}>
                    <div className="admin-game-cell">
                      <div className="admin-game-thumb">
                        <Media src={item.photos?.[0]} alt="" sizes="52px" />
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {item.platform} · {item.seller_name}
                        </small>
                        <small>
                          {readable(item.condition)} · {readable(item.format)}
                        </small>
                        {item.seller_status === "suspended" ? (
                          <Badge value="suspended" />
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td role="cell" data-label={headings[1]}>
                    {money(item.price_paise)}
                  </td>
                  <td role="cell" data-label={headings[2]}>
                    <Badge value={item.status} />
                  </td>
                  <td role="cell" data-label={headings[3]}>
                    <Badge value={item.moderation_status} />
                  </td>
                  <td role="cell" data-label={headings[4]}>
                    <div className="admin-row-actions">
                      <button
                        onClick={() => setDetail({ type: "listing", item })}
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() =>
                          action(
                            item,
                            item.moderation_status === "hidden"
                              ? "restore"
                              : "hide",
                          )
                        }
                      >
                        {item.moderation_status === "hidden"
                          ? "Restore"
                          : "Hide"}
                      </button>
                    </div>
                  </td>
                </>
              ) : null}
              {section === "orders" ? (
                <>
                  <td role="cell" data-label={headings[0]}>
                    <strong>{item.snapshot_title}</strong>
                    <small className="admin-mono">{item.id.slice(0, 8)}</small>
                    <small>{date(item.created_at)}</small>
                  </td>
                  <td role="cell" data-label={headings[1]}>
                    <strong>{item.buyer_name}</strong>
                    <small>Seller: {item.seller_name}</small>
                  </td>
                  <td role="cell" data-label={headings[2]}>
                    {money(item.snapshot_price_paise)}
                    <small>{item.payment_mode} mode</small>
                  </td>
                  <td role="cell" data-label={headings[3]}>
                    <Badge value={item.status} />
                    <small>Payment: {item.payment_status}</small>
                  </td>
                  <td role="cell" data-label={headings[4]}>
                    <div className="admin-row-actions">
                      <button onClick={() => viewOrder(item)}>
                        View order
                      </button>
                      {item.status === "pending" &&
                      item.payment_status === "pending" ? (
                        <button onClick={() => action(item, "cancel")}>
                          Cancel unpaid
                        </button>
                      ) : null}
                      {item.status === "confirmed" &&
                      item.payment_status === "paid" ? (
                        <button onClick={() => action(item, "complete")}>
                          Complete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </>
              ) : null}
              {section === "activity" ? (
                <>
                  <td role="cell" data-label={headings[0]}>
                    <strong>
                      {item.action.replaceAll(".", " / ").replaceAll("_", " ")}
                    </strong>
                    <small className="admin-mono">
                      {item.entity_id.slice(0, 8)}
                    </small>
                  </td>
                  <td role="cell" data-label={headings[1]}>
                    {item.actor_name}
                  </td>
                  <td
                    role="cell"
                    data-label={headings[2]}
                    className="admin-reason"
                  >
                    {item.reason}
                  </td>
                  <td role="cell" data-label={headings[3]}>
                    {date(item.created_at, true)}
                  </td>
                  <td role="cell" data-label={headings[4]}>
                    <button
                      className="text-link"
                      onClick={() => setDetail({ type: "activity", item })}
                    >
                      View change
                    </button>
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfirmAction({ value, onClose, onSuccess }) {
  const [reason, setReason] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const label = actionLabels[value.action],
    roleChange = ["promote", "demote"].includes(value.action);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/${value.section}/${value.item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: value.action,
          reason,
          ...(roleChange ? { password } : {}),
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      label={label}
      className="admin-confirm-dialog"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="admin-dialog-actions">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Go back
          </button>
          <button
            form="admin-confirm-action"
            type="submit"
            className="button primary"
            disabled={busy}
          >
            {busy ? "Saving…" : label}
          </button>
        </div>
      }
    >
      <form
        id="admin-confirm-action"
        className="dialog-body form-stack"
        onSubmit={submit}
        aria-busy={busy}
      >
        <div className="admin-confirm-emblem" aria-hidden="true">
          <ShieldCheckIcon />
        </div>
        <span className="eyebrow">CONFIRM ADMINISTRATOR ACTION</span>
        <h2>{label}</h2>
        <p className="muted">
          {value.item.username || value.item.title || value.item.snapshot_title}
        </p>
        <p className="small muted">
          {value.action === "suspend"
            ? "This player will be signed out and their listings hidden until the account is reactivated."
            : value.action === "hide"
              ? "The listing will disappear from public browsing. Existing order records stay intact."
              : value.action === "restore"
                ? "This clears the moderation hold. Removed or sold listings stay unavailable."
                : roleChange
                  ? "This changes access to the administrator dashboard and signs the player out."
                  : value.action === "cancel"
                    ? "Only an unpaid order without a provider reservation can be cancelled here. Its reserved copy will become available again."
                    : "This change will be recorded with your account and reason."}
        </p>
        <label>
          Reason
          <textarea
            disabled={busy}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
            maxLength={500}
            rows={3}
            placeholder="Explain why this change is needed…"
          />
        </label>
        {roleChange ? (
          <label>
            Your current password
            <input
              disabled={busy}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        ) : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="admin-confirm-footnote">
          <ClockIcon />
          Your account, reason, and this change will be recorded.
        </p>
      </form>
    </Dialog>
  );
}

function DetailDialog({ detail, onClose }) {
  const item = detail.item;
  const title =
    item?.title ||
    item?.snapshot_title ||
    item?.action?.replaceAll(".", " / ") ||
    "Record details";
  const cover = item?.photos?.[0] || item?.snapshot_photo;
  return (
    <Dialog
      wide
      className="admin-inspector"
      label={
        detail.type === "order"
          ? "Order details"
          : detail.type === "listing"
            ? "Inspect listing"
            : "Audit details"
      }
      onClose={onClose}
      footer={
        <div className="admin-inspector-footer">
          <span>
            <ShieldCheckIcon />
            ADMIN / RECORD REVIEW
          </span>
          <button className="button secondary" onClick={onClose}>
            Done reviewing
          </button>
        </div>
      }
    >
      <div className={`admin-inspect-hero ${cover ? "has-cover" : ""}`}>
        {cover ? (
          <Media src={cover} alt="" sizes="(max-width:700px) 100vw, 820px" />
        ) : (
          <CubeTransparentIcon aria-hidden="true" />
        )}
        <div className="admin-inspect-shade" />
        <span className="eyebrow">
          {detail.type.toUpperCase()} / {item ? item.id.slice(0, 8) : "REVIEW"}
        </span>
        <h2>{title}</h2>
      </div>
      <div className="dialog-body admin-detail">
        {detail.error ? (
          <p role="alert">{detail.error}</p>
        ) : !item ? (
          <p role="status">Loading order…</p>
        ) : (
          <>
            {detail.type === "listing" ? (
              <>
                <div className="admin-photo-grid">
                  {item.photos.map((photo) => (
                    <div key={photo}>
                      <Media src={photo} alt={item.title} sizes="250px" />
                    </div>
                  ))}
                </div>
                <p>{item.description}</p>
                <div className="admin-detail-facts">
                  <span>
                    Seller<strong>{item.seller_name}</strong>
                  </span>
                  <span>
                    Price<strong>{money(item.price_paise)}</strong>
                  </span>
                  <span>
                    Platform<strong>{item.platform}</strong>
                  </span>
                  <span>
                    Condition<strong>{readable(item.condition)}</strong>
                  </span>
                </div>
                <Badge value={item.moderation_status} />
                <p className="muted">
                  {item.moderation_reason || "No moderation reason recorded."}
                </p>
              </>
            ) : detail.type === "order" ? (
              <>
                <div className="admin-detail-facts">
                  <span>
                    Buyer<strong>{item.buyer_name}</strong>
                    <small>{item.buyer_email}</small>
                  </span>
                  <span>
                    Seller<strong>{item.seller_name}</strong>
                    <small>{item.seller_email}</small>
                  </span>
                  <span>
                    Amount<strong>{money(item.snapshot_price_paise)}</strong>
                  </span>
                  <span>
                    Payment
                    <strong>
                      {item.payment_status} / {item.payment_mode}
                    </strong>
                  </span>
                  <span>
                    Provider order
                    <strong>{item.provider_order_id || "Not created"}</strong>
                  </span>
                  <span>
                    Placed<strong>{date(item.created_at, true)}</strong>
                  </span>
                </div>
                <Badge value={item.status} />
                <h3>Delivery details</h3>
                {item.shipping_address ? (
                  <address>
                    {Object.entries(item.shipping_address).map(
                      ([key, value]) => (
                        <div key={key}>
                          <small>{readable(key)}: </small>
                          {String(value)}
                        </div>
                      ),
                    )}
                  </address>
                ) : (
                  <p className="muted">No delivery address collected.</p>
                )}
                <p className="small muted">Full order ID: {item.id}</p>
              </>
            ) : (
              <>
                <p>{item.reason}</p>
                <p className="muted">
                  {item.actor_name} · {date(item.created_at, true)}
                </p>
                <div className="admin-audit-diff">
                  <div>
                    <h3>Before</h3>
                    <pre>{JSON.stringify(item.before_state, null, 2)}</pre>
                  </div>
                  <div>
                    <h3>After</h3>
                    <pre>{JSON.stringify(item.after_state, null, 2)}</pre>
                  </div>
                </div>
                <p className="small muted">
                  Target: {item.entity_type} / {item.entity_id}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

function Security({ user, onSuccess }) {
  const [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [confirmPassword, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api("/api/admin/security", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrent("");
      setNew("");
      setConfirm("");
      onSuccess(response.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-security-grid">
      <section className="admin-panel admin-security-form">
        <span className="admin-security-icon">
          <LockClosedIcon />
        </span>
        <span className="eyebrow">ACCOUNT SECURITY</span>
        <h2>
          {user.passwordChangeRequired
            ? "Make this account yours."
            : "Change your password."}
        </h2>
        <p>
          {user.passwordChangeRequired
            ? "Replace the initial setup password to unlock the control room. Choose a password that only you know."
            : "Updating your password signs out all other sessions. This session stays active."}
        </p>
        <form className="form-stack" onSubmit={submit} aria-busy={busy}>
          <button
            className="admin-password-toggle"
            type="button"
            aria-pressed={showPasswords}
            disabled={busy}
            onClick={() => setShowPasswords((value) => !value)}
          >
            {showPasswords ? <EyeSlashIcon /> : <EyeIcon />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
          <label>
            Current password
            <input
              type={showPasswords ? "text" : "password"}
              disabled={busy}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrent(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type={showPasswords ? "text" : "password"}
              disabled={busy}
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              value={newPassword}
              onChange={(event) => setNew(event.target.value)}
              required
            />
            <small>
              At least 6 characters. Digits are accepted.
            </small>
          </label>
          <label>
            Confirm new password
            <input
              type={showPasswords ? "text" : "password"}
              disabled={busy}
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              value={confirmPassword}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button primary" disabled={busy}>
            {busy ? "Updating password…" : "Update password"}
            <ShieldCheckIcon />
          </button>
        </form>
      </section>
      <section className="admin-panel admin-security-notes">
        <div className="admin-security-art" aria-hidden="true">
          <span />
          <ShieldCheckIcon />
        </div>
        <span className="eyebrow">BUILT-IN PROTECTION</span>
        <h2>Your access, protected.</h2>
        {[
          [
            "Administrator access",
            "Your permissions are checked on every action in the control room.",
          ],
          [
            "Session revocation",
            "Password, role and suspension changes invalidate older sessions.",
          ],
          [
            "Recorded actions",
            "Moderation changes include your identity, time and a reason.",
          ],
          [
            "Payment integrity",
            "Payments and refunds cannot be fabricated from the dashboard.",
          ],
        ].map(([title, text]) => (
          <div key={title}>
            <CheckCircleIcon />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
