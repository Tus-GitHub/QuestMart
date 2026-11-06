"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  PlusIcon,
  ShoppingBagIcon,
  ArrowUpRightIcon,
  CubeIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PhotoIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/lib/client-api.mjs";
import { useUI } from "../components/UIProvider";
import SellerEditor from "../components/SellerEditor";
import SellerInventory from "../components/SellerInventory";
import Dialog from "../components/Dialog";
import ExperienceSurface, {
  ExperienceHeader,
} from "../components/ExperienceSurface";
const empty = {
  title: "",
  platform: "PS5",
  format: "disc",
  condition: "good",
  price: "",
  description: "",
  photos: [],
};

export default function Sell() {
  const userId = useSelector((state) => state.user.currentUser?._id);
  return <SellerStudio key={userId || "guest"} />;
}

function SellerStudio() {
  const user = useSelector((s) => s.user.currentUser),
    checked = useSelector((s) => s.user.sessionChecked),
    { openAuth, notify, motionDisabled } = useUI();
  const [form, setForm] = useState(empty),
    [items, setItems] = useState([]),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [removing, setRemoving] = useState(null),
    [removeError, setRemoveError] = useState(""),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  const titleInput = useRef(null);
  const refresh = useCallback(
    async (signal) => {
      if (!user) return;
      setLoading(true);
      try {
        const d = await api("/api/listings?mine=true&page=" + page, { signal });
        setItems(d.listings);
        setMore(d.hasMore);
        setLoadError("");
      } catch (e) {
        if (!signal?.aborted) setLoadError(e.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [user, page],
  );
  useEffect(() => {
    const c = new AbortController();
    refresh(c.signal);
    return () => c.abort();
  }, [refresh]);
  function change(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }
  function focusEditor() {
    titleInput.current?.scrollIntoView({
      behavior: motionDisabled ? "instant" : "smooth",
      block: "center",
    });
    titleInput.current?.focus({ preventScroll: true });
  }
  function resetEditor() {
    setForm(empty);
    setEditing(null);
    setError("");
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError("");
    if (file.size > 3000000) {
      setError("Keep each photo under 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("photo", file);
      const data = await api("/api/uploads", { method: "POST", body });
      setForm((f) => ({ ...f, photos: [...f.photos, data.url].slice(0, 5) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (busy || uploading) return;
    setError("");
    if (!/^\d+(\.\d{1,2})?$/.test(form.price)) {
      setError("Enter a price with at most two decimal places.");
      return;
    }
    setBusy(true);
    try {
      await api(editing ? "/api/listings/" + editing : "/api/listings", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          pricePaise: Math.round(Number(form.price) * 100),
        }),
      });
      notify(editing ? "Listing updated." : "Your game is on the marketplace.");
      const wasEditing = Boolean(editing);
      resetEditor();
      if (!wasEditing && page !== 1) setPage(1);
      else await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(item) {
    setEditing(item.id);
    setForm({
      ...item,
      price: String(item.price_paise / 100),
      photos: item.photos,
    });
    setError("");
    focusEditor();
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    setRemoveError("");
    try {
      await api("/api/listings/" + removing.id, { method: "DELETE" });
      notify("Listing removed from the marketplace.");
      if (editing === removing.id) resetEditor();
      setRemoving(null);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else await refresh();
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const stats = [
    { label: "Listed games", value: items.length, Icon: CubeIcon },
    {
      label: "Available",
      value: items.filter((item) => item.status === "available").length,
      Icon: ShoppingBagIcon,
    },
    {
      label: "Reserved",
      value: items.filter((item) => item.status === "reserved").length,
      Icon: ClockIcon,
    },
    {
      label: "Sold",
      value: items.filter((item) => item.status === "sold").length,
      Icon: CheckCircleIcon,
    },
  ];
  return (
    <ExperienceSurface className="seller-experience">
      <div className="page-width">
        <ExperienceHeader
          studio
          eyebrow="YOUR SELLER STUDIO"
          title="Played it?"
          accent="Pass it on."
          description={
            user
              ? "Welcome back, @" +
                user.username +
                ". Turn your finished adventures into someone’s next favorite."
              : "Your games have more stories to tell. Build your collection, create a listing, and find their next player."
          }
        >
          {user ? (
            <>
              <button
                className="button primary"
                onClick={() => {
                  resetEditor();
                  focusEditor();
                }}
                disabled={busy || uploading}
              >
                Create a listing
                <PlusIcon />
              </button>
              <a className="button glass" href="#seller-collection">
                Your collection
                <ArrowUpRightIcon />
              </a>
            </>
          ) : (
            <Link className="button glass" href="/marketplace">
              Explore the marketplace
              <ArrowUpRightIcon />
            </Link>
          )}
        </ExperienceHeader>
        {!user ? (
          <section className="seller-access surface-empty">
            <div className="empty-orbit">
              <CubeIcon />
            </div>
            <span className="eyebrow">READY, PLAYER ONE?</span>
            <h2>
              {checked ? "Your studio is waiting." : "Checking your session…"}
            </h2>
            <p>
              Sign in to upload photos, publish your games, and manage your
              listings in one place.
            </p>
            {checked ? (
              <button className="button primary" onClick={() => openAuth()}>
                Sign in to sell
                <ArrowUpRightIcon />
              </button>
            ) : null}
            <div className="studio-steps">
              <span>
                <PhotoIcon /> Show your copy
              </span>
              <span>
                <PencilSquareIcon /> Tell its story
              </span>
              <span>
                <ShoppingBagIcon /> Find its next player
              </span>
            </div>
          </section>
        ) : (
          <>
            <div className="studio-overview-heading">
              <span className="eyebrow">INVENTORY SNAPSHOT</span>
              <span>
                {page > 1 || more
                  ? "Current page · Page " + page
                  : "Your collection at a glance"}
              </span>
            </div>
            <div className="studio-stats" aria-label="Inventory summary">
              {stats.map(({ label, value, Icon }) => (
                <div className="studio-stat" key={label}>
                  <span>
                    <Icon />
                    {label}
                  </span>
                  <strong>{loading || loadError ? "—" : value}</strong>
                  <div className="stat-track" aria-hidden="true">
                    <i
                      style={{
                        width: items.length
                          ? Math.max(6, (value / items.length) * 100) + "%"
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <SellerEditor
              form={form}
              setForm={setForm}
              editing={editing}
              busy={busy}
              uploading={uploading}
              error={error}
              titleInput={titleInput}
              change={change}
              upload={upload}
              submit={submit}
              resetEditor={resetEditor}
              username={user.username}
            />
            <SellerInventory
              items={items}
              loading={loading}
              error={loadError}
              onRetry={refresh}
              page={page}
              onPageChange={setPage}
              more={more}
              disabled={busy || uploading}
              onEdit={edit}
              onRemove={(item) => {
                setRemoving(item);
                setRemoveError("");
              }}
            />
          </>
        )}
      </div>
      {removing ? (
        <Dialog
          label="Remove listing"
          className="studio-remove-dialog"
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
        >
          <div className="dialog-body">
            <span className="eyebrow">MANAGE YOUR COLLECTION</span>
            <h2>Remove this listing?</h2>
            <p className="muted">
              {removing.title} will no longer appear in the marketplace.
            </p>
            {removeError ? (
              <p className="notice error" role="alert">
                {removeError}
              </p>
            ) : null}
            <div className="preview-actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={remove}
              >
                {busy ? "Removing…" : "Remove listing"}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setRemoving(null)}
              >
                Keep it listed
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </ExperienceSurface>
  );
}
