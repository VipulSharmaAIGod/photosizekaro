import { NextResponse } from "next/server";
import { verifyUnlockToken } from "@/lib/unlock-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const p = token ? verifyUnlockToken(String(token)) : null;
  if (!p) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, sku: p.sku, exp: p.exp, paymentId: p.pid, mode: p.mode });
}
