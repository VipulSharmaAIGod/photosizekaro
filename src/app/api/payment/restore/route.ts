import { NextResponse } from "next/server";
import { logServerEvent } from "@/lib/analytics/server";
import { activeProvider, paymentsAvailable } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { issueUnlockToken } from "@/lib/unlock-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESTORE_WINDOW_DAYS = 365;

/** Stateless purchase recovery: the customer pastes the Razorpay payment ID from their receipt. */
export async function POST(req: Request) {
  if (!paymentsAvailable()) return NextResponse.json({ error: "Payments are launching soon." }, { status: 503 });
  const rl = rateLimit(`restore:${clientIp(req)}`, 10, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { paymentId } = (await req.json().catch(() => ({}))) as { paymentId?: string };
  const pid = String(paymentId || "").trim();
  if (!/^pay_[A-Za-z0-9]{6,30}$/.test(pid)) return NextResponse.json({ error: "Enter a valid payment ID (starts with pay_)." }, { status: 400 });
  const provider = activeProvider();
  const p = await provider.fetchPayment(pid);
  if (!p) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (p.status !== "captured" || p.notes.sku !== "kit" || p.notes.product !== "photosizekaro_kit") {
    return NextResponse.json({ error: "This payment is not a completed Exam Kit purchase." }, { status: 400 });
  }
  if (Date.now() / 1000 - p.createdAt > RESTORE_WINDOW_DAYS * 86400) return NextResponse.json({ error: "This purchase has expired." }, { status: 400 });
  const { token, payload } = issueUnlockToken({ sku: "kit", pid: p.id, mode: provider.mode });
  logServerEvent(req, "restore", { sku: "kit", amt: p.amountPaise, mode: provider.mode });
  return NextResponse.json({ token, sku: payload.sku, exp: payload.exp, paymentId: p.id });
}
