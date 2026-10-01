import { NextResponse } from "next/server";
import { mockAllowed } from "@/lib/payments";
import { mockCompletePayment } from "@/lib/payments/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TEST MODE ONLY: simulates a successful payment. 404 whenever real keys are set or mock mode is not allowed. */
export async function POST(req: Request) {
  if (!mockAllowed()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  const r = mockCompletePayment(String(orderId || ""));
  if (!r) return NextResponse.json({ error: "Unknown order" }, { status: 400 });
  return NextResponse.json({ razorpay_order_id: orderId, razorpay_payment_id: r.paymentId, razorpay_signature: r.signature });
}
