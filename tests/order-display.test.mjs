import test from "node:test";
import assert from "node:assert/strict";
import { filterOrders, orderDate, orderStatus } from "../lib/order-display.mjs";

const orders = [
  {
    id: "abc-123",
    buyer_id: "me",
    seller_id: "seller",
    seller_name: "ranger",
    buyer_name: "myself",
    snapshot_title: "Elden Ring",
    snapshot_platform: "PS5",
    status: "confirmed",
    payment_status: "paid",
  },
  {
    id: "def-456",
    buyer_id: "buyer",
    seller_id: "me",
    buyer_name: "pixel",
    seller_name: "myself",
    snapshot_title: "Hades",
    snapshot_platform: "Nintendo Switch",
    status: "cancelled",
    payment_status: "refunded",
  },
];
test("order filters combine role, status and case-insensitive game, player or ID search", () => {
  assert.equal(
    filterOrders(orders, { scope: "purchases", query: " RANGER " }, "me")[0].id,
    "abc-123",
  );
  assert.equal(
    filterOrders(
      orders,
      { scope: "sales", status: "cancelled", query: "pixel" },
      "me",
    )[0].id,
    "def-456",
  );
  assert.equal(filterOrders(orders, { query: "PS5" }, "me").length, 1);
  assert.equal(filterOrders(orders, { query: "DEF-456" }, "me").length, 1);
  assert.equal(
    filterOrders(orders, { scope: "sales", query: "Elden" }, "me").length,
    0,
  );
  assert.equal(filterOrders(orders, { status: "pending" }, "me").length, 0);
  assert.equal(filterOrders(orders, { query: "   " }, "me").length, 2);
  assert.deepEqual(filterOrders([], {}, "me"), []);
});
test("status labels never imply fulfillment for a pending or unknown order", () => {
  assert.equal(orderStatus({ status: "pending" }).label, "Payment pending");
  assert.equal(
    orderStatus({ status: "cancelled", payment_status: "refunded" }).label,
    "Cancelled",
  );
  assert.equal(
    orderStatus({ status: "future-status" }).label,
    "Status unavailable",
  );
});
test("order dates use the same India timezone in server and client rendering", () => {
  assert.match(orderDate("2026-11-05T23:30:00Z"), /6 Nov 2026/);
  assert.equal(orderDate("not-a-date"), "Date unavailable");
});
