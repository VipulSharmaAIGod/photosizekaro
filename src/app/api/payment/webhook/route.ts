import { NextResponse } from "next/server";
import { activeProvider, paymentsAvailable } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (Dashboard → Webhooks: payment.captured, order.paid, payment.failed, refund.processed).
 * No database: verifies the signature and logs the event for reconciliation (Render logs).
 */
export async function POST(req: Request) {
  if (!paymentsAvailable()) return NextResponse.json({ error: "Payments are launching soon." }, { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature");
  if (!activeProvider().verifyWebhook(raw, sig)) return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  try {
    const evt = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; amount?: number; status?: string; notes?: Record<string, string> } } } };
    const p = evt.payload?.payment?.entity;
    console.log(`[webhook] ${evt.event} payment=${p?.id} amount=${p?.amount} status=${p?.status} sku=${p?.notes?.sku ?? "-"}`);
  } catch {
    console.log("[webhook] received non-JSON body");
  }
  return NextResponse.json({ ok: true });
}
