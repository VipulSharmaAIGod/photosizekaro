/**
 * Tiny client beacon. No cookies, no ids stored on the device.
 * Opt out on this device (e.g. the owner's phone): open any page with ?notrack=1 (undo with ?notrack=0).
 */
import type { ClientEvent } from "./events";

type Props = Record<string, string | number | boolean | undefined>;
const OPT_KEY = "analytics_optout";

function optedOut(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("notrack");
    if (q === "1") localStorage.setItem(OPT_KEY, "1");
    if (q === "0") localStorage.removeItem(OPT_KEY);
    return localStorage.getItem(OPT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Automated browsers (navigator.webdriver) are ignored, unless a test explicitly opts in with ?allowbot=1. */
function isAutomated(): boolean {
  try {
    if (!(navigator as Navigator & { webdriver?: boolean }).webdriver) return false;
    if (new URLSearchParams(location.search).get("allowbot") === "1") sessionStorage.setItem("allowbot", "1");
    return sessionStorage.getItem("allowbot") !== "1";
  } catch {
    return true;
  }
}

function send(body: object) {
  const json = JSON.stringify(body);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon("/api/t", new Blob([json], { type: "text/plain" }))) return;
  } catch {
    /* fall through */
  }
  fetch("/api/t", { method: "POST", body: json, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
}

export function track(e: ClientEvent, x?: Props) {
  if (typeof window === "undefined" || optedOut() || isAutomated()) return;
  send({ e, p: location.pathname, x });
}

export function trackPageview(path: string) {
  if (typeof window === "undefined" || optedOut() || isAutomated()) return;
  const q = new URLSearchParams(location.search);
  send({ e: "pageview", p: path, r: document.referrer || undefined, u: q.get("utm_source") || q.get("ref") || undefined });
}
