"use client";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  signInStart,
  signInSuccess,
  signInFailure,
} from "@/redux/user/userSlice";
import { api } from "@/lib/client-api.mjs";
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Dialog from "./Dialog";
import DiscoveryMotion from "./DiscoveryMotion";

export default function AuthModal({ initialMode, onClose, motionDisabled }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const heading = useRef(null);
  const dispatch = useDispatch();
  const signup = mode === "signup";

  function switchMode(next) {
    if (busy || mode === next) return;
    setMode(next);
    setError("");
    setNotice("");
    setShowPassword(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (signup) {
        if (values.password !== values.confirmPassword)
          throw new Error("Your passwords don’t match.");
        await api("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setIdentifier(values.username);
        setMode("signin");
        setShowPassword(false);
        setNotice("Account created. Sign in to start your next quest.");
        heading.current?.focus();
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
      if (!signup) dispatch(signInFailure(err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      onClose={onClose}
      label={signup ? "Create an account" : "Sign in"}
      className="auth-dialog"
      wide
    >
      <DiscoveryMotion paused={motionDisabled} className="auth-experience">
        <aside className="auth-universe" aria-hidden="true" data-hero-parallax>
          <div className="auth-grid" />
          <span className="auth-wordmark">
            QUEST<span>MART</span>
            <i>®</i>
          </span>
          <div className="auth-pass-scene">
            <div className="auth-orbit" />
            <div className="auth-player-pass">
              <div className="pass-topline">
                <span>PLAYER ACCESS</span>
                <SparklesIcon />
              </div>
              <span className="pass-symbol">
                Q<span>↗</span>
              </span>
              <div className="pass-lines">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="pass-bottomline">
                <span>YOUR NEXT CHAPTER</span>
                <span>01 / ∞</span>
              </div>
            </div>
            <span className="auth-orbit-dot" />
          </div>
          <div className="auth-pitch">
            <span className="eyebrow">GOOD GAMES. NEW STORIES.</span>
            <h2>
              Every player.
              <br />
              <em>A new possibility.</em>
            </h2>
            <p>
              Find your next obsession. Pass on a favorite.
              <br />
              Make yourself at home.
            </p>
          </div>
          <div className="auth-side-footer">
            <span className="live-dot" /> BUILT FOR THE LOVE OF PLAY
          </div>
        </aside>
        <div className="auth-content">
          <span className="eyebrow auth-kicker">YOUR PLAYER PORTAL</span>
          <div
            className="account-segment auth-mode"
            aria-label="Account access"
          >
            <button
              type="button"
              aria-pressed={!signup}
              disabled={busy}
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={signup}
              disabled={busy}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>
          <div className="auth-form-intro">
            <h2 ref={heading} tabIndex={-1}>
              {signup ? "Join the next quest." : "Welcome back, player."}
            </h2>
            <p>
              {signup
                ? "Your next favorite is out there. Let’s find it."
                : "Your games. Your trades. All right here."}
            </p>
          </div>
          {notice && (
            <div className="notice success" role="status">
              {notice}
            </div>
          )}
          <form
            onSubmit={submit}
            className="form-stack auth-form"
            key={mode}
            aria-busy={busy}
          >
            <fieldset disabled={busy}>
              {signup ? (
                <div className="auth-field-row">
                  <label>
                    Player name
                    <input
                      name="username"
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="[a-zA-Z0-9_-]{3,30}"
                      title="3–30 letters, numbers, underscores or hyphens"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="Your gamer name"
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
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@example.com"
                    />
                  </label>
                </div>
              ) : (
                <label>
                  Username or email
                  <input
                    name="identifier"
                    required
                    maxLength={254}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    defaultValue={identifier}
                    placeholder="Your player name or email"
                  />
                </label>
              )}
              <div className="password-field">
                <label htmlFor="portal-password">Password</label>
                <div className="password-input">
                  <input
                    id="portal-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={signup ? 8 : 1}
                    maxLength={72}
                    autoComplete={signup ? "new-password" : "current-password"}
                    aria-describedby={signup ? "password-hint" : undefined}
                    placeholder={
                      signup
                        ? "Create a strong password"
                        : "Enter your password"
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
                {signup && (
                  <small id="password-hint">
                    At least 8 characters. Use a mix of letters, numbers, and
                    symbols.
                  </small>
                )}
              </div>
              {signup && (
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="One more time"
                  />
                </label>
              )}
            </fieldset>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full auth-submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="account-spinner" /> One moment…
                </>
              ) : (
                <>
                  {signup ? "Create account" : "Let’s play"}
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already part of the crew?" : "New to QuestMart?"}{" "}
            <button
              disabled={busy}
              onClick={() => switchMode(signup ? "signin" : "signup")}
            >
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="form-footnote">
            <ShieldCheckIcon /> Your account. Your own corner of the game.
          </div>
        </div>
      </DiscoveryMotion>
    </Dialog>
  );
}
