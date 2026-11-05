"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { LockClosedIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useUI } from "../components/UIProvider";
export default function AdminAccess({ status }) {
  const { openAuth } = useUI();
  const router = useRouter();
  const user = useSelector((state) => state.user.currentUser);
  useEffect(() => {
    if (user?.role === "admin" && status === 401) router.refresh();
  }, [user, status, router]);
  return (
    <div className="admin-access page-width">
      <div className="admin-access-emblem">
        <LockClosedIcon />
      </div>
      <span className="eyebrow">QUESTMART / CONTROL ROOM</span>
      <h1>
        {status === 401
          ? "For the people behind the play."
          : status === 403
            ? "Administrator access only."
            : "Control room temporarily unavailable."}
      </h1>
      <p>
        {status === 401
          ? "Sign in with your administrator account to manage the marketplace."
          : status === 403
            ? "Your account does not have permission to open this dashboard."
            : "We couldn’t verify access. Retry when the connection is available."}
      </p>
      <div className="admin-access-actions">
        {status === 401 ? (
          <button className="button primary" onClick={() => openAuth()}>
            Sign in to admin <ArrowRightIcon />
          </button>
        ) : status !== 403 ? (
          <button className="button primary" onClick={() => router.refresh()}>
            Retry connection
          </button>
        ) : null}
        <Link className="button secondary" href="/">
          Back to storefront
        </Link>
      </div>
    </div>
  );
}
