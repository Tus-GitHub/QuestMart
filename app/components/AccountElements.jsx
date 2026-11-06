"use client";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRightIcon,
  ArrowPathIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { checkSession } from "@/redux/user/userSlice";
import { useUI } from "./UIProvider";

export function AccountLoading({ label = "Loading your account…" }) {
  return (
    <div className="account-loading" role="status">
      <span className="account-spinner" />
      {label}
    </div>
  );
}

export function AccountError({ message, onRetry }) {
  return (
    <div className="account-error">
      <p role="alert">{message}</p>
      <button className="button secondary" onClick={onRetry}>
        <ArrowPathIcon />
        Try again
      </button>
    </div>
  );
}

export function AccountGate({
  title,
  description,
  icon: Icon = UserCircleIcon,
}) {
  const { openAuth } = useUI();
  const { sessionChecked, sessionError, sessionChecking } = useSelector(
    (s) => s.user,
  );
  const dispatch = useDispatch();
  if (!sessionChecked && !sessionError)
    return <AccountLoading label="Connecting to your player account…" />;
  return (
    <section className="account-gate reveal-in">
      <div className="account-gate-art" aria-hidden="true">
        <span />
        <Icon />
      </div>
      <div>
        <span className="eyebrow">YOUR SPACE. YOUR STORY.</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {sessionError && (
          <div className="account-session-error">
            <p role="alert">{sessionError}</p>
            <button
              className="text-button"
              disabled={sessionChecking}
              onClick={() => dispatch(checkSession())}
            >
              {sessionChecking ? "Checking…" : "Retry connection"}
            </button>
          </div>
        )}
        <div className="experience-actions">
          <button className="button primary" onClick={() => openAuth("signin")}>
            Sign in
            <ArrowRightIcon />
          </button>
          <button
            className="button secondary"
            onClick={() => openAuth("signup")}
          >
            Create account
          </button>
        </div>
      </div>
    </section>
  );
}
