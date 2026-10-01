import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { ANALYTICS_SITE, CLIENT_EVENTS, type ServerEvent } from "./events";

/**
 * Privacy-friendly analytics: ONE JSON line per event on stdout, prefixed with "ANALYTICS ".
 * Render keeps app logs, and the report script (/workspace/analytics/report.mjs) aggregates them.
 *
 * - No cookies, no localStorage ids, and no IP or user agent is ever written.
 * - Visitor id = first 16 hex chars of sha256(dailySalt | ip | user-agent). The salt is derived
 *   from a server secret and the IST date, so ids change every day and can't be linked across days
 *   (this is the same approach Plausible uses). Unique visitors are counted per day.
 * - Bots, crawlers, headless/prerender and health checks are dropped.
 */

export const LOG_PREFIX = "ANALYTICS ";

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|mediapartners|adsbot|facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|embedly|quora link|pinterest|vkshare|w3c_validator|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|statuscake|headless|phantomjs|puppeteer|prerender|render-health|curl|wget|httpie|python|aiohttp|node-fetch|undici|axios|okhttp|go-http|java\/|libwww|scrapy|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baiduspider|bytespider|gptbot|claudebot|ccbot|perplexity/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 20) return true;
  return BOT_RE.test(ua);
}

/** IST calendar date (YYYY-MM-DD) for a timestamp. */
export function istDate(ms = Date.now()): string {
  return new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 10);
}

function saltSecret(): string {
  return process.env.ANALYTICS_SALT_SECRET || process.env.UNLOCK_TOKEN_SECRET || process.env.RAZORPAY_KEY_SECRET || "dev-analytics-secret";
}

/** Daily-rotating salt: HMAC(secret, "salt:" + IST date). Never logged. */
export function dailySalt(date = istDate()): string {
  return createHmac("sha256", saltSecret()).update("analytics-salt:" + date).digest("hex");
}

export function clientIpForAnalytics(h: Headers): string {
  return h.get("cf-connecting-ip") || h.get("true-client-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";
}

export function visitorId(h: Headers, date = istDate()): string {
  const ua = h.get("user-agent") || "";
  return createHash("sha256").update(`${dailySalt(date)}|${clientIpForAnalytics(h)}|${ua}`).digest("hex").slice(0, 16);
}

export function deviceOf(ua: string): "m" | "t" | "d" {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "t";
  if (/mobi|iphone|ipod|android|opera mini|iemobile/i.test(ua)) return "m";
  return "d";
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f"\\]/g, "").slice(0, n) : undefined);

/** Normalise a path: strip query/hash, cap length. */
export function cleanPath(p: unknown): string | undefined {
  const s = clip(p, 300);
  if (!s || !s.startsWith("/")) return undefined;
  return s.split(/[?#]/)[0].slice(0, 120) || "/";
}

/** Referrer → host only ("google.com"), or undefined for direct/internal. */
export function refHost(r: unknown, selfHost?: string | null): string | undefined {
  const s = clip(r, 500);
  if (!s) return undefined;
  try {
    const h = new URL(s).hostname.replace(/^www\./, "").toLowerCase();
    if (!h || (selfHost && h === selfHost.replace(/^www\./, "").split(":")[0].toLowerCase())) return undefined;
    return h.slice(0, 80);
  } catch {
    return undefined;
  }
}

type Props = Record<string, string | number | boolean | undefined>;

/** Keep only small scalar props with safe keys. */
export function cleanProps(x: unknown): Props | undefined {
  if (!x || typeof x !== "object") return undefined;
  const out: Props = {};
  let n = 0;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (n >= 8 || !/^[a-z][a-z0-9_]{0,23}$/i.test(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = clip(v, 60);
    else continue;
    n++;
  }
  return n ? out : undefined;
}

export interface AnalyticsLine {
  v: 1;
  s: string; // site
  e: string; // event
  ts: string; // ISO UTC
  d: string; // IST date
  vid: string; // daily visitor hash
  i: string; // random event id (dedupe)
  src: "c" | "s"; // client beacon or server
  p?: string; // path
  ref?: string; // referrer host
  utm?: string; // utm_source
  dev?: "m" | "t" | "d";
  x?: Props; // event props (amount in paise, template, exam…)
}

/** Writes one ANALYTICS line. Never throws. */
export function writeLine(line: Omit<AnalyticsLine, "v" | "s" | "ts" | "d" | "i">, now = Date.now()) {
  try {
    const full: AnalyticsLine = { v: 1, s: ANALYTICS_SITE, ts: new Date(now).toISOString(), d: istDate(now), i: randomBytes(5).toString("hex"), ...line };
    if (process.env.ANALYTICS_DISABLED === "1") return full;
    process.stdout.write(LOG_PREFIX + JSON.stringify(full) + "\n");
    return full;
  } catch {
    return null;
  }
}

/** Server-side event (order_created, payment_success, restore…). Skips bots. */
export function logServerEvent(req: Request, e: ServerEvent, x?: Props) {
  const ua = req.headers.get("user-agent") || "";
  if (isBot(ua)) return null;
  return writeLine({ e, src: "s", vid: visitorId(req.headers), dev: deviceOf(ua), x: cleanProps(x) });
}

export function isClientEvent(e: unknown): e is (typeof CLIENT_EVENTS)[number] {
  return typeof e === "string" && (CLIENT_EVENTS as readonly string[]).includes(e);
}
