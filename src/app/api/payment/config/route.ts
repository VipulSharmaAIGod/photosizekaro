import { NextResponse } from "next/server";
import { activeProvider, paymentsAvailable } from "@/lib/payments";
import { PRICES } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export function GET() {
  const p = activeProvider();
  return NextResponse.json({ provider: p.name, mode: p.mode, available: paymentsAvailable(), ...p.publicConfig(), prices: { kit: PRICES.kit.amountPaise } });
}
