"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowUpRightIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useUI } from "./UIProvider";
import { api } from "@/lib/client-api.mjs";
import { signOutUserSuccess } from "@/redux/user/userSlice";

export default function SiteHeader() {
  const path = usePathname(),
    { openAuth, notify } = useUI(),
    dispatch = useDispatch();
  const user = useSelector((state) => state.user.currentUser);
  const [open, setOpen] = useState(false);
  async function logout() {
    try {
      await api("/api/auth/signout", { method: "POST" });
      dispatch(signOutUserSuccess());
      setOpen(false);
    } catch (error) {
      notify(error.message);
    }
  }
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="wordmark" href="/" aria-label="QuestMart home">
          <span className="brand-symbol">
            Q<span>↗</span>
          </span>
          quest<span>mart</span>
          <i>®</i>
        </Link>
        <nav
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Main navigation"
        >
          {[
            ["/", "Discover"],
            ["/#discover", "Buy new"],
            ["/marketplace", "Player market"],
            ["/sell", "Sell a game"],
            ["/orders", "My orders"],
            ...(user?.role === "admin" ? [["/admin", "Admin"]] : []),
          ].map(([href, label]) => (
            <Link
              key={href}
              className={path === href ? "active" : ""}
              href={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <Link className="player-pill" href="/profile">
                <span>{user.username[0].toUpperCase()}</span>
                <b>{user.username}</b>
              </Link>
              <button
                className="icon-button"
                onClick={logout}
                aria-label="Sign out"
              >
                <ArrowRightOnRectangleIcon />
              </button>
            </>
          ) : (
            <button className="button nav-signin" onClick={() => openAuth()}>
              Sign in
              <ArrowUpRightIcon />
            </button>
          )}
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <XMarkIcon /> : <Bars3Icon />}
          </button>
        </div>
      </div>
    </header>
  );
}
