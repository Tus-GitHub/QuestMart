"use client";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  ArrowUpRightIcon,
  PencilSquareIcon,
  PhotoIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { money, readable } from "@/lib/client-api.mjs";
import { PLATFORMS, CONDITIONS } from "@/lib/listing-validation.mjs";
import Media from "./Media";
export default function SellerEditor({
  form,
  setForm,
  editing,
  busy,
  uploading,
  error,
  titleInput,
  change,
  upload,
  submit,
  resetEditor,
  username,
}) {
  const checklist = [
    { label: "Game title", done: form.title.trim().length >= 2 },
    {
      label: "Price set",
      done:
        /^\d+(\.\d{1,2})?$/.test(form.price) &&
        Number(form.price) >= 1 &&
        Number(form.price) <= 100000,
    },
    { label: "Copy described", done: form.description.trim().length >= 20 },
    { label: "Photo added", done: form.photos.length > 0 },
  ];
  const complete = checklist.filter((step) => step.done).length;
  return (
    <div className="studio-workspace">
      <section className="studio-editor panel" aria-labelledby="editor-heading">
        <div className="studio-panel-heading">
          <div>
            <span className="eyebrow">
              {editing ? "EDIT MODE" : "NEW LISTING"}
            </span>
            <h2 id="editor-heading">
              {editing ? "Fine-tune your listing." : "Build your next listing."}
            </h2>
          </div>
          <span className="studio-panel-icon">
            <PencilSquareIcon />
          </span>
        </div>
        <div className="editor-progress">
          <span>{complete} of 4 essentials ready</span>
          <div
            role="progressbar"
            aria-label="Listing completeness"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={complete}
          >
            <i style={{ width: complete * 25 + "%" }} />
          </div>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <fieldset disabled={busy} className="studio-fields">
            <legend>
              <span>01</span>The game
            </legend>
            <div className="form-grid">
              <label className="span-two">
                Game title
                <input
                  ref={titleInput}
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
                <select name="platform" value={form.platform} onChange={change}>
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
            </div>
          </fieldset>
          <fieldset disabled={busy} className="studio-fields">
            <legend>
              <span>02</span>Your copy
            </legend>
            <div className="form-grid">
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
                  inputMode="decimal"
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
                  aria-label="Tell players about your copy"
                  aria-describedby="listing-description-hint"
                  value={form.description}
                  onChange={change}
                  required
                  minLength={20}
                  maxLength={3000}
                  placeholder="Condition, original case, and anything the next player should know."
                />
                <span className="field-hint" id="listing-description-hint">
                  At least 20 characters{" "}
                  <span>{form.description.length}/3000</span>
                </span>
              </label>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="studio-fields">
            <legend>
              <span>03</span>Make it real
            </legend>
            <p className="small muted">
              Photos of your actual copy. 1–5 JPEG, PNG or WebP images, up to 3
              MB each.
            </p>
            <div className="photo-thumbs">
              {form.photos.map((url, i) => (
                <div className="photo-thumb" key={url}>
                  <Media
                    src={url}
                    alt={"Listing photo " + (i + 1)}
                    sizes="110px"
                  />
                  {i === 0 ? (
                    <span className="photo-cover-label">COVER</span>
                  ) : null}
                  <button
                    type="button"
                    disabled={uploading || busy}
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
                <span className="upload-glyph">
                  <ArrowUpTrayIcon />
                </span>
                <strong>
                  {uploading ? "Optimizing your photo…" : "Choose a photo"}
                </strong>
                <span>Your first image becomes the cover.</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload listing photo"
                  disabled={uploading || busy}
                  onChange={upload}
                />
              </label>
            ) : null}
          </fieldset>
          {error ? (
            <p className="notice error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="studio-submit">
            <button
              className="button primary"
              disabled={busy || uploading || !form.photos.length}
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Publish listing"}
              <ArrowUpRightIcon />
            </button>
            {editing ? (
              <button
                type="button"
                className="button secondary"
                disabled={busy || uploading}
                onClick={resetEditor}
              >
                Cancel editing
              </button>
            ) : null}
          </div>
          <p className="small muted">
            Be accurate about condition. Keep personal contact details out of
            public listings.
          </p>
        </form>
      </section>
      <aside className="studio-preview-column">
        <div className="studio-preview-panel">
          <div className="preview-section-label">
            <span className="eyebrow">LIVE LISTING PREVIEW</span>
            <span className="preview-draft-label">UNSAVED PREVIEW</span>
          </div>
          <article className="studio-preview-card" data-tilt>
            <span className="card-shine" aria-hidden="true" />
            <div className="studio-preview-art">
              {form.photos[0] ? (
                <Media
                  key={form.photos[0]}
                  src={form.photos[0]}
                  alt="Your listing cover preview"
                  sizes="(max-width:700px) 85vw, 400px"
                />
              ) : (
                <div className="preview-photo-placeholder">
                  <PhotoIcon />
                  <span>Your cover goes here</span>
                </div>
              )}
              <span className="tag">{readable(form.condition)}</span>
            </div>
            <div className="studio-preview-info">
              <span className="eyebrow">
                {form.platform} / {readable(form.format)}
              </span>
              <h3>{form.title || "Your next great listing"}</h3>
              <span className="market-seller">@{username}</span>
              <strong>
                {checklist[1].done
                  ? money(Math.round(Number(form.price) * 100))
                  : "Set your price"}
              </strong>
            </div>
          </article>
          <div className="listing-checklist">
            <h3>Ready for its next player?</h3>
            {checklist.map((step) => (
              <div key={step.label} className={step.done ? "complete" : ""}>
                <CheckCircleIcon />
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          <p className="studio-tip">
            <SparklesIcon />
            <span>
              Clear photos and an honest description help your listing stand
              out.
            </span>
          </p>
        </div>
      </aside>
    </div>
  );
}
