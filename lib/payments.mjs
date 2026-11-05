import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./http.mjs";

function credentials() {
  const key = process.env.RAZORPAY_KEY_ID,
    secret = process.env.RAZORPAY_KEY_SECRET;
  // Live money is deliberately gated until fulfillment and provider onboarding are complete.
  if (!key?.startsWith("rzp_test_") || !secret)
    throw new ApiError(
      503,
      "Test checkout is being configured. Please try again later.",
    );
  return { key, secret };
}
async function provider(path, options = {}) {
  const { key, secret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(
      502,
      "The payment provider is temporarily unavailable. Please try again.",
    );
  return response.json();
}
export async function createPaymentOrder(order) {
  return provider("orders", {
    method: "POST",
    body: JSON.stringify({
      amount: order.snapshot_price_paise,
      currency: "INR",
      receipt: order.id,
      notes: { questmart_order_id: order.id },
    }),
  });
}
export function paymentKey() {
  return credentials().key;
}
export async function verifyPayment(order, input) {
  const { secret } = credentials();
  if (
    typeof input.paymentId !== "string" ||
    !/^pay_[a-zA-Z0-9]+$/.test(input.paymentId) ||
    typeof input.signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.signature)
  )
    throw new ApiError(400, "Invalid payment confirmation.");
  const expected = createHmac("sha256", secret)
    .update(`${order.provider_order_id}|${input.paymentId}`)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(input.signature, "hex")))
    throw new ApiError(400, "The payment signature could not be verified.");
  const payment = await provider(`payments/${input.paymentId}`);
  if (
    payment.order_id !== order.provider_order_id ||
    payment.amount !== order.snapshot_price_paise ||
    payment.currency !== "INR" ||
    payment.status !== "captured"
  )
    throw new ApiError(
      409,
      "Payment is not captured yet. Please refresh your order shortly.",
    );
  return payment;
}
