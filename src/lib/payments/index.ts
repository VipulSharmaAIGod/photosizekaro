import "server-only";
import { mockProvider } from "./mock";
import { razorpayProvider } from "./razorpay";
import type { PaymentProvider } from "./types";

let cached: PaymentProvider | null = null;

/**
 * Picks the payment provider from env:
 *  - RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET → Razorpay (test or live depending on key prefix)
 *  - otherwise → mock mode (clearly labelled in the UI), unless PAYMENTS_DISABLE_MOCK=1.
 *    Safety: whenever NODE_ENV=production (next start / Vercel / Render) mock mode is OFF unless
 *    ALLOW_MOCK_PAYMENTS=true is set explicitly, so a missing key can never turn into free unlocks on a live site.
 */
export function activeProvider(): PaymentProvider {
  if (cached) return cached;
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  cached = id && secret ? razorpayProvider(id, secret) : mockProvider;
  return cached;
}

export function mockAllowed() {
  if (activeProvider().name !== "mock") return false;
  if (process.env.PAYMENTS_DISABLE_MOCK === "1") return false;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") return false;
  return true;
}

/** True when a real gateway is configured, or mock mode is explicitly allowed. */
export function paymentsAvailable() {
  return activeProvider().name !== "mock" || mockAllowed();
}

export type { PaymentProvider } from "./types";
