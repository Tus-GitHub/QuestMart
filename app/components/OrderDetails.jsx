"use client";
import {
  CheckCircleIcon,
  ClockIcon,
  CubeTransparentIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { money, readable } from "@/lib/client-api.mjs";
import { orderDate, orderStatus } from "@/lib/order-display.mjs";
import Dialog from "./Dialog";
import Media from "./Media";

export function OrderBadge({ order }) {
  const status = orderStatus(order);
  return (
    <span className={`order-badge ${status.tone}`}>
      <span />
      {status.label}
    </span>
  );
}

export default function OrderDetails({ order, userId, onClose }) {
  const purchase = order.buyer_id === userId;
  const address = order.shipping_address;
  const status = orderStatus(order);
  return (
    <Dialog
      label={`Order details: ${order.snapshot_title}`}
      onClose={onClose}
      className="order-detail-dialog"
      wide
      footer={
        <div className="order-detail-footer">
          <span>
            <ShieldCheckIcon />
            {order.payment_mode === "test"
              ? "Test order · no real charge"
              : "Your order record"}
          </span>
          <button className="button secondary" onClick={onClose}>
            Back to orders
          </button>
        </div>
      }
    >
      <div className="order-detail-hero">
        <Media
          src={order.snapshot_photo}
          alt=""
          sizes="(max-width: 700px) 100vw, 720px"
        />
        <div />
        <span className="eyebrow">
          QUESTMART / {purchase ? "PURCHASE" : "SALE"}
        </span>
        <h2>{order.snapshot_title}</h2>
        <p>
          {order.snapshot_platform} · {readable(order.snapshot_format)} ·{" "}
          {readable(order.snapshot_condition)}
        </p>
      </div>
      <div className="order-detail-body">
        <div className={`order-state-panel ${status.tone}`}>
          <span className="order-state-icon">
            {order.status === "confirmed" || order.status === "completed" ? (
              <CheckCircleIcon />
            ) : (
              <ClockIcon />
            )}
          </span>
          <div>
            <OrderBadge order={order} />
            <p>{status.description}</p>
          </div>
        </div>
        <dl className="order-facts">
          <div>
            <dt>Order total</dt>
            <dd className="order-total">{money(order.snapshot_price_paise)}</dd>
          </div>
          <div>
            <dt>Payment status</dt>
            <dd>
              {readable(order.payment_status)}
              {order.payment_mode === "test" && (
                <span className="test-mode-tag">TEST MODE</span>
              )}
            </dd>
          </div>
          <div>
            <dt>{purchase ? "Seller" : "Buyer"}</dt>
            <dd>@{purchase ? order.seller_name : order.buyer_name}</dd>
          </div>
          <div>
            <dt>Placed on</dt>
            <dd>{orderDate(order.created_at, true)} IST</dd>
          </div>
        </dl>
        <div className="order-reference">
          <span>ORDER ID</span>
          <code>{order.id}</code>
        </div>
        <section className="order-delivery">
          <h3>
            <MapPinIcon />
            Delivery details
          </h3>
          {address ? (
            <address>
              <strong>{address.name}</strong>
              <span>{address.address}</span>
              <span>
                {address.city}, {address.state} {address.postalCode}
              </span>
              <span>{address.phone}</span>
            </address>
          ) : (
            <p>No delivery address is attached to this order.</p>
          )}
        </section>
        <div className="order-record-note">
          <CubeTransparentIcon />
          <p>
            These are the item details saved when the order was placed. Delivery
            tracking is not available here yet.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
