import { cleanPath, cleanProps, deviceOf, isBot, isClientEvent, refHost, visitorId, writeLine } from "@/lib/analytics/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noContent = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

/** Analytics beacon endpoint. Always answers 204 so it never breaks the page. */
export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") || "";
    if (isBot(ua) || req.headers.get("purpose") === "prefetch" || req.headers.get("sec-purpose")?.includes("prefetch")) return noContent();
    const rl = rateLimit(`t:${clientIp(req)}`, 120, 60_000);
    if (!rl.ok) return noContent();
    const raw = await req.text();
    if (raw.length > 4000) return noContent();
    const b = JSON.parse(raw) as { e?: unknown; p?: unknown; r?: unknown; u?: unknown; x?: unknown };
    if (!isClientEvent(b.e)) return noContent();
    const utm = typeof b.u === "string" ? b.u.replace(/[^a-z0-9_.-]/gi, "").slice(0, 40) || undefined : undefined;
    writeLine({
      e: b.e,
      src: "c",
      vid: visitorId(req.headers),
      p: cleanPath(b.p),
      ref: b.e === "pageview" ? refHost(b.r, req.headers.get("host")) : undefined,
      utm: b.e === "pageview" ? utm : undefined,
      dev: deviceOf(ua),
      x: cleanProps(b.x),
    });
  } catch {
    /* ignore malformed beacons */
  }
  return noContent();
}
