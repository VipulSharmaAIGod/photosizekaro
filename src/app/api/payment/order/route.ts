import { NextResponse } from "next/server";
import { signBlob } from "@/lib/crypto";
import { activeProvider, paymentsAvailable } from "@/lib/payments";
import type { OrderTicket } from "@/lib/payments/types";
import { PRICES } from "@/lib/pricing";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(`order:${clientIp(req)}`, 20, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { sku?: string };
  if (body.sku !== "kit") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!paymentsAvailable()) return NextResponse.json({ error: "Payments are launching soon." }, { status: 503 });

  const provider = activeProvider();
  try {
    const order = await provider.createOrder({
      amountPaise: PRICES.kit.amountPaise,
      receipt: `psk_${Date.now().toString(36)}`,
      notes: { sku: "kit", product: "photosizekaro_kit" },
    });
    const ticket = signBlob({ oid: order.orderId, sku: "kit", amt: order.amountPaise, exp: Math.floor(Date.now() / 1000) + 3 * 3600 } satisfies OrderTicket, "ticket");
    return NextResponse.json({ ...order, ticket, sku: "kit", provider: provider.name, mode: provider.mode, ...provider.publicConfig() });
  } catch (e) {
    console.error("[payment] order error", (e as Error).message);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
