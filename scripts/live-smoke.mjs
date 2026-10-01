// Live smoke test against a deployed URL (no payments, no writes):
//   BASE_URL=https://photosizekaro.onrender.com node scripts/live-smoke.mjs
// Uses sample images produced by scripts/e2e.mjs (test-output/samples).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL || "https://photosizekaro.onrender.com").replace(/\/$/, "");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "test-output", "live");
const SAMPLES = path.join(ROOT, "test-output", "samples");
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (n, ok, d = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };

function jpegInfo(buf) {
  let i = 2, dpi = null, width = null, height = null;
  while (i < buf.length - 4) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xd9 || m === 0xda) break;
    const len = buf.readUInt16BE(i + 2);
    if (m === 0xe0 && buf.toString("latin1", i + 4, i + 9) === "JFIF\0") dpi = buf[i + 11] === 1 ? buf.readUInt16BE(i + 12) : null;
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { height = buf.readUInt16BE(i + 5); width = buf.readUInt16BE(i + 7); }
    i += 2 + len;
  }
  return { width, height, dpi };
}

async function settle(page, id) {
  const loc = page.getByTestId(id);
  await loc.waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(450);
  let last = null;
  for (let k = 0; k < 80; k++) {
    const busy = await loc.getAttribute("data-busy"), bytes = await loc.getAttribute("data-bytes");
    if (busy === "false" && bytes === last) return;
    last = busy === "false" ? bytes : null;
    await page.waitForTimeout(350);
  }
}

async function doc(page, label, docId, sample, e, tab) {
  if (tab) await page.getByTestId(`tab-${docId}`).click();
  await page.getByTestId(`file-${docId}`).setInputFiles(path.join(SAMPLES, sample));
  await settle(page, `result-${docId}`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId(`dl-${docId}`).click()]);
  const f = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(f);
  const buf = fs.readFileSync(f), i = jpegInfo(buf);
  const ok = i.width === e.w && i.height === e.h && buf.length <= e.maxKB * 1000 && buf.length >= e.minKB * 1024 && (!e.dpi || i.dpi === e.dpi);
  check(`${label}: ${e.w}×${e.h}px ${e.minKB}–${e.maxKB} KB`, ok, `got ${i.width}×${i.height}, ${buf.length} B (${(buf.length / 1024).toFixed(1)} KB), dpi ${i.dpi}, file ${dl.suggestedFilename()}`);
}

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, locale: "en-IN" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
try {
  const r = await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });
  check("landing 200 at 390px", r.status() === 200 && (await page.getByTestId("ssc-callout").isVisible()), `HTTP ${r.status()}`);
  const canon = await page.locator('link[rel="canonical"]').getAttribute("href");
  check("canonical uses live URL", canon?.startsWith(BASE), canon);
  await page.screenshot({ path: path.join(ROOT, "screenshots", "live-landing.png") });

  await page.goto(BASE + "/ibps-po-photo-signature-size", { waitUntil: "networkidle" });
  await doc(page, "LIVE IBPS PO photo", "photo", "photoDetailed.jpg", { w: 200, h: 230, minKB: 20, maxKB: 50 });
  await doc(page, "LIVE IBPS PO signature", "signature", "signature.jpg", { w: 140, h: 60, minKB: 10, maxKB: 20 }, true);

  await page.goto(BASE + "/ssc-cgl-photo-signature-size", { waitUntil: "networkidle" });
  await doc(page, "LIVE SSC CGL signature", "signature", "signature.jpg", { w: 472, h: 157, minKB: 10, maxKB: 20, dpi: 200 });
  await page.getByTestId("tab-photo").click();
  check("LIVE SSC photo = live-capture info card", await page.getByTestId("info-photo").isVisible());

  await page.goto(BASE + "/exam-kit", { waitUntil: "networkidle" });
  await page.getByTestId("show-paywall").click();
  await page.getByTestId("launching-soon").waitFor({ timeout: 15000 });
  check("LIVE payments: 'launching soon', no buy button / mock banner / mock checkout",
    (await page.getByTestId("buy-kit").count()) === 0 && (await page.getByTestId("mock-banner").count()) === 0 && (await page.getByTestId("mock-checkout").count()) === 0 && (await page.getByTestId("restore-open").count()) === 0);
  await page.getByTestId("paywall").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(ROOT, "screenshots", "live-payments-launching-soon.png") });

  const cfg = await (await fetch(BASE + "/api/payment/config")).json();
  const order = await fetch(BASE + "/api/payment/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sku: "kit" }) });
  check("LIVE API: config.available=false, order refused", cfg.available === false && order.status >= 400, `order HTTP ${order.status}`);
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  const rb = await (await fetch(BASE + "/robots.txt")).text();
  check("LIVE sitemap + robots use live URL", sm.includes(`<loc>${BASE}/ibps-po-photo-signature-size</loc>`) && rb.includes(`Sitemap: ${BASE}/sitemap.xml`));
  check("LIVE no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("live smoke completed", false, String(e));
} finally {
  await browser.close();
}
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
