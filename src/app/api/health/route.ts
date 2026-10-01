export const dynamic = "force-dynamic";

/** Cheap liveness probe for keep-alive pings. Not counted in analytics, no logging. */
export function GET() {
  return new Response("ok", { status: 200, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
}
export const HEAD = GET;
