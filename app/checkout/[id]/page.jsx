"use client";
import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useSelector } from "react-redux";
import {
  ShieldCheckIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  LockClosedIcon,
  CreditCardIcon,
  MapPinIcon,
  CubeTransparentIcon,
  ArrowRightIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";
import { api, money, readable } from "@/lib/client-api.mjs";
import Media from "../../components/Media";
import ExperienceSurface, {
  ExperienceHeader,
} from "../../components/ExperienceSurface";
import { AccountError, AccountLoading } from "../../components/AccountElements";
import { useUI } from "../../components/UIProvider";
import "./checkout.css";

function CheckoutReview({ id }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [photo, setPhoto] = useState(0);
  const user = useSelector((state) => state.user.currentUser);
  const { openAuth } = useUI();
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setLoading(true);
    api("/api/listings/" + id, { signal: controller.signal })
      .then((data) => {
        setItem(data.listing);
        setPhoto(0);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);
  if (loading) return <AccountLoading label="Preparing your game review…" />;
  if (error)
    return (
      <section className="checkout-unavailable">
        <div className="checkout-state-icon">
          <CubeTransparentIcon />
        </div>
        <h2>
          {[400, 404].includes(error.status)
            ? "This quest has moved on."
            : "We couldn’t load this copy."}
        </h2>
        <AccountError
          message={error.message}
          onRetry={() => setAttempt((value) => value + 1)}
        />
        <Link className="button primary" href="/marketplace">
          Browse available games
          <ArrowRightIcon />
        </Link>
      </section>
    );
  const ownListing = user?._id === item.seller_id;
  const unavailable = item.status !== "available";
  return (
    <>
      <ol className="checkout-steps" aria-label="Checkout progress">
        <li aria-current="step">
          <span>01</span>
          <div>
            <strong>Review your game</strong>
            <small>You are here</small>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Delivery details</strong>
            <small>Not available yet</small>
          </div>
          <LockClosedIcon />
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Payment</strong>
            <small>Not available yet</small>
          </div>
          <LockClosedIcon />
        </li>
      </ol>
      <div className="checkout-layout">
        <div className="checkout-review-column">
          <section
            className="checkout-game-panel reveal-in"
            aria-labelledby="review-game-title"
          >
            <div className="checkout-panel-heading">
              <span className="eyebrow">THE PLAYER’S COPY</span>
              <span className="checkout-platform">{item.platform}</span>
            </div>
            <div className="checkout-cover">
              <Media
                key={item.photos[photo]}
                src={item.photos[photo]}
                alt={item.title}
                priority
                sizes="(max-width: 760px) 100vw, 55vw"
              />
              <div />
              <span className="checkout-photo-label">
                PHOTO {photo + 1} / {item.photos.length}
              </span>
              <h2 id="review-game-title">{item.title}</h2>
            </div>
            {item.photos.length > 1 && (
              <div className="checkout-thumbs">
                {item.photos.map((url, index) => (
                  <button
                    key={url}
                    aria-label={`Review photo ${index + 1}`}
                    aria-pressed={photo === index}
                    onClick={() => setPhoto(index)}
                  >
                    <Media src={url} alt="" sizes="66px" />
                  </button>
                ))}
              </div>
            )}
            <div className="checkout-game-copy">
              <dl className="checkout-facts">
                <div>
                  <dt>Platform</dt>
                  <dd>{item.platform}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{readable(item.format)}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>{readable(item.condition)}</dd>
                </div>
              </dl>
              <div className="checkout-seller">
                <span className="checkout-seller-avatar" aria-hidden="true">
                  {item.seller_name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <small>LISTED BY</small>
                  <strong>@{item.seller_name}</strong>
                </div>
                <Link
                  href={"/listings/" + id}
                  aria-label={`View listing for ${item.title}`}
                >
                  View listing
                  <ArrowUpRightIcon />
                </Link>
              </div>
              <details className="checkout-description">
                <summary>Read the seller’s description</summary>
                <p>{item.description}</p>
              </details>
            </div>
          </section>
          <section className="checkout-delivery-panel reveal-in">
            <span className="checkout-mini-icon">
              <MapPinIcon />
            </span>
            <div>
              <span className="eyebrow">DELIVERY</span>
              <h3>The next stop: your collection.</h3>
              <p>
                Delivery details will be requested when checkout opens. You
                don’t need to enter an address now.
              </p>
            </div>
            <LockClosedIcon className="checkout-delivery-lock" />
          </section>
        </div>
        <aside
          className="checkout-summary reveal-in"
          aria-labelledby="checkout-summary-title"
        >
          <div className="checkout-summary-top">
            <span className="eyebrow">YOUR NEXT CHAPTER</span>
            <CreditCardIcon aria-hidden="true" />
          </div>
          <h2 id="checkout-summary-title">Review your copy.</h2>
          <p className="checkout-summary-caption">
            One game. A whole new adventure.
          </p>
          <div className="checkout-summary-item">
            <div>
              <Media src={item.photos[0]} alt="" sizes="66px" />
            </div>
            <div>
              <strong>{item.title}</strong>
              <span>
                {item.platform} · {readable(item.format)}
              </span>
              <small>1 physical copy</small>
            </div>
          </div>
          <dl className="checkout-price-breakdown">
            <div>
              <dt>Listed price</dt>
              <dd>{money(item.price_paise)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Not calculated</dd>
            </div>
          </dl>
          <div className="checkout-price">
            <span>ITEM PRICE</span>
            <strong>{money(item.price_paise)}</strong>
            <small>Delivery charges are not included.</small>
          </div>
          <div className="checkout-payment-notice" role="status">
            <span>
              <PauseIcon />
            </span>
            <div>
              <h3>
                {ownListing
                  ? "This is your listing."
                  : unavailable
                    ? item.status === "sold"
                      ? "This copy has a new player."
                      : "This copy is marked as reserved."
                    : "Checkout is getting ready."}
              </h3>
              <p>
                {ownListing
                  ? "You can update this game in your seller studio."
                  : unavailable
                    ? "This copy is not currently available to purchase. Explore the exchange for another game."
                    : "Player payments are not open yet. You can review this copy and keep exploring while payment setup is completed."}
              </p>
            </div>
          </div>
          <button
            className="button secondary full checkout-pay-button"
            disabled
          >
            <LockClosedIcon />
            {ownListing || unavailable
              ? "Purchase unavailable"
              : "Payment coming soon"}
          </button>
          <Link
            className="button primary full"
            href={ownListing ? "/sell" : "/marketplace"}
          >
            {ownListing ? "Open seller studio" : "Keep exploring"}
            <ArrowRightIcon />
          </Link>
          {!user && (
            <button className="checkout-signin" onClick={() => openAuth()}>
              Already a player? <span>Sign in</span>
              <ArrowUpRightIcon />
            </button>
          )}
          <p className="checkout-reassurance">
            <ShieldCheckIcon />
            Viewing this page does not place an order, reserve this copy, or
            charge you.
          </p>
        </aside>
      </div>
      <div className="checkout-bottom-note">
        <CubeTransparentIcon />
        <span>PLAYER TO PLAYER</span>
        <p>
          You’re reviewing a community listing. Purchases made through official
          store links are handled by those stores.
        </p>
      </div>
    </>
  );
}

export default function Checkout({ params }) {
  const { id } = use(params);
  return (
    <ExperienceSurface className="checkout-experience">
      <div className="page-width">
        <Link className="back-link checkout-back" href={"/listings/" + id}>
          <ArrowLeftIcon />
          Back to listing
        </Link>
        <ExperienceHeader
          eyebrow="QUESTMART / CHECKOUT"
          title="A new game."
          accent="Your next chapter."
          description="Take a closer look at the copy you’ve found."
          icon={CubeTransparentIcon}
          orbitLabel="REVIEW / YOUR COPY"
          orbitCaption="GOOD GAMES DESERVE ANOTHER PLAYER."
        />
        <CheckoutReview key={id} id={id} />
      </div>
    </ExperienceSurface>
  );
}
