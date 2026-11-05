"use client";
import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  PlusIcon,
  ShoppingBagIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import { PLATFORMS, CONDITIONS } from "@/lib/listing-validation.mjs";
import { useUI } from "../components/UIProvider";
import Media from "../components/Media";
import Dialog from "../components/Dialog";
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
  const user = useSelector((s) => s.user.currentUser),
    checked = useSelector((s) => s.user.sessionChecked),
    { openAuth, notify } = useUI();
  const [form, setForm] = useState(empty),
    [items, setItems] = useState([]),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [removing, setRemoving] = useState(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const d = await api("/api/listings?mine=true");
      setItems(d.listings);
      setLoadError("");
    } catch (e) {
      setLoadError(e.message);
    }
  }, [user]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  function change(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
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
      setForm(empty);
      setEditing(null);
      await refresh();
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove() {
    setBusy(true);
    try {
      await api("/api/listings/" + removing.id, { method: "DELETE" });
      notify("Listing removed from the marketplace.");
      setRemoving(null);
      await refresh();
    } catch (err) {
      setError(err.message);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-width">
      <div className="page-heading">
        <span className="eyebrow">GOOD GAMES DESERVE ANOTHER PLAYER</span>
        <h1>
          Make room for your next quest<span className="accent">.</span>
        </h1>
        <p>Your collection. Your prices. Your next adventure.</p>
      </div>
      {!user ? (
        <div className="empty-state" style={{ marginBottom: 70 }}>
          <ShoppingBagIcon />
          <h3>
            {checked ? "Your seller space awaits." : "Checking your session…"}
          </h3>
          <p>Sign in to publish listings and manage your collection.</p>
          {checked ? (
            <button className="button primary" onClick={() => openAuth()}>
              Sign in to sell
              <ArrowUpRightIcon />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="seller-layout">
          <section className="panel">
            <span className="eyebrow">SELLER STUDIO</span>
            <h2 style={{ marginTop: 8 }}>
              {editing
                ? "Fine-tune your listing"
                : "Give a game its next chapter"}
            </h2>
            <form className="form-stack" onSubmit={submit}>
              <div className="form-grid">
                <label className="span-two">
                  Game title
                  <input
                    name="title"
                    value={form.title}
                    onChange={change}
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="e.g. Elden Ring"
                  />
                </label>
                <label>
                  Platform
                  <select
                    name="platform"
                    value={form.platform}
                    onChange={change}
                  >
                    {PLATFORMS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Format
                  <select name="format" value={form.format} onChange={change}>
                    <option value="disc">Physical disc</option>
                    <option value="cartridge">Cartridge</option>
                  </select>
                </label>
                <label>
                  Condition
                  <select
                    name="condition"
                    value={form.condition}
                    onChange={change}
                  >
                    {CONDITIONS.map((v) => (
                      <option key={v} value={v}>
                        {readable(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Your price (₹)
                  <input
                    name="price"
                    value={form.price}
                    onChange={change}
                    required
                    type="number"
                    min="1"
                    max="100000"
                    step=".01"
                    placeholder="1499"
                  />
                </label>
                <label className="span-two">
                  Tell players about your copy
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={change}
                    required
                    minLength={20}
                    maxLength={3000}
                    placeholder="Mention the condition, original case, and anything the next player should know."
                  />
                </label>
              </div>
              <div>
                <label>
                  Photos of your actual copy{" "}
                  <span className="muted small">
                    1–5 images. JPEG, PNG or WebP, up to 3 MB each.
                  </span>
                </label>
                <div className="photo-thumbs">
                  {form.photos.map((url, i) => (
                    <div className="photo-thumb" key={url}>
                      <Media
                        src={url}
                        alt={"Listing photo " + (i + 1)}
                        sizes="80px"
                      />
                      <button
                        type="button"
                        aria-label={"Remove photo " + (i + 1)}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            photos: f.photos.filter((_, index) => index !== i),
                          }))
                        }
                      >
                        <XMarkIcon />
                      </button>
                    </div>
                  ))}
                </div>
                {form.photos.length < 5 ? (
                  <label className="upload-zone">
                    <ArrowUpTrayIcon />
                    {uploading ? "Optimizing your photo…" : "Choose a photo"}
                    <span>Your first photo becomes the cover.</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Upload listing photo"
                      disabled={uploading}
                      onChange={upload}
                    />
                  </label>
                ) : null}
              </div>
              {error ? (
                <p className="notice error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                className="button primary full"
                disabled={busy || uploading || !form.photos.length}
              >
                {busy
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Publish listing"}
                <PlusIcon />
              </button>
              {editing ? (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setEditing(null);
                    setForm(empty);
                    setError("");
                  }}
                >
                  Cancel editing
                </button>
              ) : null}
              <p className="small muted">
                Be accurate about condition. Never include personal contact
                details in public listings.
              </p>
            </form>
          </section>
          <section className="panel">
            <h2>
              Your collection <span className="muted">/ {items.length}</span>
            </h2>
            {loadError ? (
              <div className="notice error">
                {loadError}
                <button onClick={refresh}>Retry</button>
              </div>
            ) : null}
            {!items.length ? (
              <div
                className="empty-state"
                style={{ border: 0, padding: "45px 0" }}
              >
                <ShoppingBagIcon />
                <h3>A fresh start.</h3>
                <p>Your published games will appear here.</p>
              </div>
            ) : (
              items.map((item) => (
                <article className="listing-row" key={item.id}>
                  <Link
                    href={"/listings/" + item.id}
                    className="listing-row-image"
                  >
                    <Media src={item.photos[0]} alt={item.title} sizes="95px" />
                  </Link>
                  <div className="listing-row-content">
                    <h3>{item.title}</h3>
                    <p>
                      {item.platform} · {money(item.price_paise)}
                    </p>
                    <span className="status-pill">{item.status}</span>
                    {item.status === "available" ? (
                      <div className="listing-row-actions">
                        <button onClick={() => edit(item)}>Edit listing</button>
                        <button onClick={() => setRemoving(item)}>
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      )}
      {removing ? (
        <Dialog label="Remove listing" onClose={() => setRemoving(null)}>
          <div className="dialog-body">
            <h2>Remove this listing?</h2>
            <p className="muted">
              {removing.title} will no longer appear in the marketplace.
            </p>
            <div className="preview-actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={remove}
              >
                Remove listing
              </button>
              <button
                className="button secondary"
                onClick={() => setRemoving(null)}
              >
                Keep it listed
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
