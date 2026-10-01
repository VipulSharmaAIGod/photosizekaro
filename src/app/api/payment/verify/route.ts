import { NextResponse } from "next/server";
import { logServerEvent } from "@/lib/analytics/server";
import { readBlob } from "@/lib/crypto";
import { activeProvider, paymentsAvailable } from "@/lib/payments";
import type { OrderTicket } from "@/lib/payments/types";
import { issueUnlockToken } from "@/lib/unlock-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!paymentsAvailable()) return NextResponse.json({ error: "Payments are launching soon." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; paymentId?: string; signature?: string; ticket?: string };
  const ticket = readBlob<OrderTicket>(String(body.ticket || ""), "ticket");
  if (!ticket || ticket.oid !== body.orderId || ticket.exp < Date.now() / 1000) {
    return NextResponse.json({ error: "Order not recognised. If money was debited, use 'Restore purchase' with your payment ID." }, { status: 400 });
  }
  const provider = activeProvider();
  const ok = await provider.verifyPayment({ orderId: String(body.orderId), paymentId: String(body.paymentId || ""), signature: String(body.signature || "") });
  if (!ok) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  const { token, payload } = issueUnlockToken({ sku: ticket.sku, pid: String(body.paymentId), mode: provider.mode });
  logServerEvent(req, "payment_success", { sku: ticket.sku, amt: ticket.amt, mode: provider.mode });
  return NextResponse.json({ token, sku: payload.sku, exp: payload.exp, paymentId: payload.pid });
}
