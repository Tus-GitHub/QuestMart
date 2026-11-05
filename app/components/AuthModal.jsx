"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  signInStart,
  signInSuccess,
  signInFailure,
} from "@/redux/user/userSlice";
import { api } from "@/lib/client-api.mjs";
import { ArrowRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import Dialog from "./Dialog";

export default function AuthModal({ initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dispatch = useDispatch();
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "signup") {
        if (values.password !== values.confirmPassword)
          throw new Error("Your passwords don’t match.");
        await api("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setMode("signin");
        setNotice("Account created. Sign in to start your next quest.");
      } else {
        dispatch(signInStart());
        const data = await api("/api/auth/signin", {
          method: "POST",
          body: JSON.stringify(values),
        });
        dispatch(signInSuccess(data.user));
        onClose();
      }
    } catch (err) {
      setError(err.message);
      if (mode === "signin") dispatch(signInFailure(err.message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      onClose={onClose}
      label={mode === "signin" ? "Sign in" : "Create an account"}
    >
      <div className="auth-art">
        <span className="brand-mark">
          Q<span>↗</span>
        </span>
        <span className="eyebrow">PLAYER ONE. WELCOME.</span>
      </div>
      <div className="dialog-body">
        <h2>
          {mode === "signin"
            ? "Back for another quest?"
            : "Your next chapter starts here."}
        </h2>
        <p className="muted">
          {mode === "signin"
            ? "Sign in to buy, sell, and make room for your next favorite."
            : "Join a marketplace made for people who love to play."}
        </p>
        {notice ? (
          <div className="notice success" role="status">
            {notice}
          </div>
        ) : null}
        <form onSubmit={submit} className="form-stack" key={mode}>
          {mode === "signup" ? (
            <>
              <label>
                Player name
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_-]{3,30}"
                  autoComplete="username"
                  placeholder="Choose your player name"
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            </>
          ) : (
            <label>
              Username or email
              <input
                name="identifier"
                required
                autoComplete="username"
                maxLength={254}
                placeholder="Your player name or email"
              />
            </label>
          )}
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              placeholder="At least 8 characters"
            />
          </label>
          {mode === "signup" ? (
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                placeholder="One more time"
              />
            </label>
          ) : null}
          {error ? (
            <p className="notice error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button primary full" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "signin"
                ? "Let’s play"
                : "Create account"}
            <ArrowRightIcon />
          </button>
        </form>
        <p className="auth-switch">
          {mode === "signin" ? "New around here?" : "Already a player?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setNotice("");
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <div className="form-footnote">
          <ShieldCheckIcon /> Your session is private and secure.
        </div>
      </div>
    </Dialog>
  );
}
