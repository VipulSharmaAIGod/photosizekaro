/**
 * In-app keep-alive for free Render instances (no accounts, no cost).
 *
 * While a server instance is up it pings `/api/health` of each target that is inside its IST window,
 * every 9 minutes (Render spins a free service down after 15 idle minutes). The request leaves Render
 * and comes back through its public edge, so it counts as inbound traffic. Outside a target's window
 * nothing is sent, so a service woken off-peak by a visitor still spins down 15 minutes later: hours
 * stay inside the same budget as the GitHub/box pingers.
 *
 * Both sites carry the same target list, so they keep each other awake: once either one is up inside
 * a window (woken by a visitor, the box pinger or the GitHub backup) it keeps both warm until the
 * window ends. `/api/health` logs nothing, so these pings never become analytics events.
 *
 * Runs only on Render (`RENDER` env set by the platform) or with KEEPALIVE=on; KEEPALIVE=off disables it.
 * KEEPALIVE_TARGETS overrides the list: "name=url@HH:MM-HH:MM,name=url@HH:MM-HH:MM" (IST, end exclusive).
 */

export type KeepaliveTarget = { name: string; url: string; from: number; to: number };

export const DEFAULT_TARGETS =
  "biodatakaro=https://biodatakaro.onrender.com/api/health@10:00-22:00," +
  "photosizekaro=https://photosizekaro.onrender.com/api/health@18:00-22:00";

export const INTERVAL_MS = 9 * 60_000;
const IST_OFFSET_MIN = 330;

function hhmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || h * 60 + min > 1440) return null;
  return h * 60 + min;
}

export function parseTargets(spec: string): KeepaliveTarget[] {
  const out: KeepaliveTarget[] = [];
  for (const part of spec.split(",")) {
    const m = /^\s*([\w.-]+)=(https?:\/\/[^@\s]+)@([\d:]+)-([\d:]+)\s*$/.exec(part);
    if (!m) continue;
    const from = hhmm(m[3]);
    const to = hhmm(m[4]);
    if (from === null || to === null || from === to) continue;
    out.push({ name: m[1], url: m[2], from, to });
  }
  return out;
}

/** Minutes since 00:00 IST for a UTC timestamp. */
export function istMinutes(ms: number): number {
  const utcMin = Math.floor(ms / 60_000) % 1440;
  return (utcMin + IST_OFFSET_MIN) % 1440;
}

export function inWindow(t: KeepaliveTarget, ms: number): boolean {
  const m = istMinutes(ms);
  return t.from < t.to ? m >= t.from && m < t.to : m >= t.from || m < t.to; // supports windows past midnight
}

export function dueTargets(targets: KeepaliveTarget[], ms: number): KeepaliveTarget[] {
  return targets.filter((t) => inWindow(t, ms));
}

export function keepaliveEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.KEEPALIVE === "off") return false;
  return env.KEEPALIVE === "on" || !!env.RENDER;
}

async function pingOnce(t: KeepaliveTarget, self: string) {
  const started = Date.now();
  try {
    const sep = t.url.includes("?") ? "&" : "?";
    const r = await fetch(`${t.url}${sep}src=${encodeURIComponent(self)}`, {
      cache: "no-store",
      headers: { "user-agent": `keepalive-self/1.0 (${self})` },
      signal: AbortSignal.timeout(90_000),
    });
    await r.arrayBuffer().catch(() => undefined);
    console.log(`KEEPALIVE ${self}->${t.name} ${r.status} ${Date.now() - started}ms`);
  } catch (err) {
    console.log(`KEEPALIVE ${self}->${t.name} error ${(err as Error)?.name || "Error"} ${Date.now() - started}ms`);
  }
}

export function startKeepalive(self: string) {
  const g = globalThis as typeof globalThis & { __keepaliveStarted?: boolean };
  if (g.__keepaliveStarted || !keepaliveEnabled()) return;
  g.__keepaliveStarted = true;
  const targets = parseTargets(process.env.KEEPALIVE_TARGETS || DEFAULT_TARGETS);
  if (!targets.length) return;
  const tick = () => {
    for (const t of dueTargets(targets, Date.now())) void pingOnce(t, self);
  };
  setTimeout(tick, 60_000); // first round shortly after boot (wakes the partner site if it's in its window)
  setInterval(tick, INTERVAL_MS);
  console.log(`KEEPALIVE ${self} started: ${targets.map((t) => t.name).join(", ")} every ${INTERVAL_MS / 60_000} min in-window`);
}
