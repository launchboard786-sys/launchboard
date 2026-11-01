import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";

const API = "https://api.razorpay.com/v1";

function authHeader() {
  const token = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64");
  return `Basic ${token}`;
}

export async function createOrder(params: { amountPaise: number; currency: string; receipt: string }) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt.slice(0, 40),
      notes: { paymentId: params.receipt },
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string; amount: number; currency: string; status: string };
}

export function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Checkout callback signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = config.razorpay.keySecret) {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = config.razorpay.webhookSecret) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Fetch an order to learn the amount actually paid (used after a client callback). */
export async function fetchOrder(orderId: string) {
  const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`Razorpay fetch order failed: ${res.status}`);
  return (await res.json()) as { id: string; amount: number; amount_paid: number; status: string };
}
