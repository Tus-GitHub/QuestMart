"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api.mjs";
import { useUI } from "./UIProvider";
import { useDispatch } from "react-redux";
import { signOutUserSuccess } from "@/redux/user/userSlice";
import "../account-email.css";
const copy = {
  forgot: [
    "Respawn your access.",
    "Enter your account email. We’ll send a link to choose a new password.",
    "Send reset link",
  ],
  resend: [
    "One last checkpoint.",
    "Get a fresh verification link for your player account.",
    "Send verification link",
  ],
  verify: [
    "Activate your account.",
    "Confirm your email to start your next adventure.",
    "Verify my email",
  ],
  reset: [
    "A fresh start.",
    "Choose a new password for your QuestMart account.",
    "Update password",
  ],
};
export default function AccountEmailPage({ action }) {
  const [token, setToken] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const { openAuth } = useUI(),
    dispatch = useDispatch();
  const [heading, note, button] = copy[action];
  const tokenAction = action === "verify" || action === "reset";
  const capturedLink = useRef({ action: null, token: "" });
  useEffect(() => {
    if (tokenAction) {
      if (capturedLink.current.action !== action) {
        capturedLink.current = {
          action,
          token: new URLSearchParams(location.hash.slice(1)).get("token") || "",
        };
      }
      setToken(capturedLink.current.token);
      // Run after Next's navigation/scroll effects so its initial hash does not
      // overwrite the scrubbed URL. Keep the framework's navigation metadata.
      const scrub = () => {
        history.replaceState(history.state, "", location.pathname);
      };
      scrub();
      const timer = setTimeout(scrub, 0);
      setReady(true);
      return () => clearTimeout(timer);
    }
    setReady(true);
  }, [tokenAction, action]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      const result = await api(`/api/auth/email/${action}`, {
        method: "POST",
        body: JSON.stringify({ ...body, ...(tokenAction ? { token } : {}) }),
      });
      if (action === "reset") dispatch(signOutUserSuccess());
      setMessage(result.message);
      setDone(true);
      setToken("");
      capturedLink.current.token = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-email-page page-width">
      <div className="account-email-art" aria-hidden="true">
        <i />
        <i />
        <span>Q↗</span>
      </div>
      <div className="account-email-panel">
        <span className="eyebrow">QUESTMART / PLAYER ACCESS</span>
        <h1>{heading}</h1>
        <p>{note}</p>
        {!done && tokenAction && ready && !token ? (
          <div className="notice error">
            This link is missing or invalid. Request a fresh email below.
          </div>
        ) : null}
        {!done ? (
          <form className="form-stack" onSubmit={submit} aria-busy={busy}>
            <fieldset disabled={busy || !ready || (tokenAction && !token)}>
              {!tokenAction ? (
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </label>
              ) : null}
              {action === "reset" ? (
                <>
                  <label>
                    New password
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      maxLength={72}
                      autoComplete="new-password"
                    />
                    <small>At least 6 characters.</small>
                  </label>
                  <label>
                    Confirm new password
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      minLength={6}
                      maxLength={72}
                      autoComplete="new-password"
                    />
                  </label>
                </>
              ) : null}
              <button
                className="button primary full"
                disabled={busy || !ready || (tokenAction && !token)}
              >
                {busy ? "One moment…" : button}
              </button>
            </fieldset>
          </form>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="notice success" role="status">
            {message}
          </p>
        ) : null}
        {done ? (
          <button
            className="button primary full"
            onClick={() => openAuth("signin")}
          >
            Back to sign in ↗
          </button>
        ) : null}
        <div className="account-email-links">
          {tokenAction ? (
            <Link
              href={
                action === "reset" || action === "forgot"
                  ? "/forgot-password"
                  : "/resend-verification"
              }
            >
              Request a new link
            </Link>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDone(false);
                setMessage("");
                setError("");
              }}
            >
              Request a new link
            </button>
          )}
          <Link href="/">Back to QuestMart ↗</Link>
        </div>
      </div>
    </section>
  );
}
