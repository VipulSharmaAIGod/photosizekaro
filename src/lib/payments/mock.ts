import "server-only";
import { randomBytes } from "node:crypto";
import { hmacHex, safeEqual, signingSecret } from "../crypto";
import type { PaymentInfo, PaymentProvider } from "./types";

/**
 * Local mock gateway used when no Razorpay keys are configured.
 * It mirrors Razorpay's flow (order → checkout → signature verify) so the whole
 * purchase path can be tested without money. Tokens it issues are marked mode:"mock"
 * and are rejected automatically once real keys are configured.
 */
const mockSecret = () => "mock:" + signingSecret();
const orders = new Map<string, { amountPaise: number; notes: Record<string, string>; createdAt: number }>();
const payments = new Map<string, PaymentInfo>();

export const mockProvider: PaymentProvider = {
  name: "mock",
  mode: "mock",
  publicConfig: () => ({}),
  async createOrder(input) {
    const orderId = "order_mock_" + randomBytes(7).toString("hex");
    orders.set(orderId, { amountPaise: input.amountPaise, notes: input.notes, createdAt: Math.floor(Date.now() / 1000) });
    return { orderId, amountPaise: input.amountPaise, currency: "INR" };
  },
  async verifyPayment({ orderId, paymentId, signature }) {
    return safeEqual(hmacHex(mockSecret(), `${orderId}|${paymentId}`), signature || "");
  },
  verifyWebhook(rawBody, signature) {
    return !!signature && safeEqual(hmacHex(mockSecret(), rawBody), signature);
  },
  async fetchPayment(paymentId) {
    return payments.get(paymentId) || null;
  },
};

/** Simulates the customer completing payment in the (mock) checkout. */
export function mockCompletePayment(orderId: string) {
  const o = orders.get(orderId);
  if (!/^order_mock_[a-f0-9]{14}$/.test(orderId)) return null;
  const paymentId = "pay_mock" + randomBytes(6).toString("hex");
  payments.set(paymentId, {
    id: paymentId,
    orderId,
    status: "captured",
    amountPaise: o?.amountPaise ?? 0,
    createdAt: Math.floor(Date.now() / 1000),
    notes: o?.notes ?? {},
  });
  return { paymentId, signature: hmacHex(mockSecret(), `${orderId}|${paymentId}`) };
}
