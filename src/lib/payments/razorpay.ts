import "server-only";
import { hmacHex, safeEqual } from "../crypto";
import type { CreateOrderInput, CreatedOrder, PaymentInfo, PaymentProvider, VerifyInput } from "./types";

const API = "https://api.razorpay.com/v1";

export function razorpayProvider(keyId: string, keySecret: string): PaymentProvider {
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return {
    name: "razorpay",
    mode: keyId.startsWith("rzp_live_") ? "live" : "test",
    publicConfig: () => ({ keyId }),

    async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { authorization: auth, "content-type": "application/json" },
        body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Razorpay order failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      const o = (await res.json()) as { id: string; amount: number };
      return { orderId: o.id, amountPaise: o.amount, currency: "INR" };
    },

    // https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#verify-payment-signature
    async verifyPayment({ orderId, paymentId, signature }: VerifyInput) {
      if (!orderId || !paymentId || !signature) return false;
      return safeEqual(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
    },

    // https://razorpay.com/docs/webhooks/validate-test/
    verifyWebhook(rawBody: string, signature: string | null) {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret || !signature) return false;
      return safeEqual(hmacHex(secret, rawBody), signature);
    },

    async fetchPayment(paymentId: string): Promise<PaymentInfo | null> {
      if (!/^pay_[A-Za-z0-9]{6,30}$/.test(paymentId)) return null;
      const res = await fetch(`${API}/payments/${paymentId}`, { headers: { authorization: auth }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return null;
      const p = (await res.json()) as { id: string; order_id: string | null; status: string; amount: number; created_at: number; notes: Record<string, string> | unknown[] };
      return { id: p.id, orderId: p.order_id, status: p.status, amountPaise: p.amount, createdAt: p.created_at, notes: Array.isArray(p.notes) ? {} : p.notes || {} };
    },
  };
}
