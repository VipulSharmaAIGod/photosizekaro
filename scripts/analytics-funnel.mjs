// Drives a real browser through the PhotoSizeKaro funnel so every analytics event fires once.
// Local:  BASE=http://localhost:3200 LOG=/tmp/psk-server.log node scripts/analytics-funnel.mjs   (asserts the log lines)
// Live:   BASE=https://photosizekaro.onrender.com node scripts/analytics-funnel.mjs          (then fetch logs via Render)
// Traffic is tagged utm_source=agent_test (override with UTM=...) so reports can tell it apart.
import fs from "node:fs";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE || "http://localhost:3200").replace(/\/$/, "");
const LOG = process.env.LOG;
const UTM = process.env.UTM || "agent_test";
const pos = LOG ? fs.statSync(LOG).size : 0;
const log = (...a) => console.log("•", ...a);

const browser = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
});
const page = await ctx.newPage();
await page.goto(`${BASE}/?allowbot=1&utm_source=${UTM}`, { waitUntil: "networkidle", timeout: 120000 });

// sample photo + signature drawn on a canvas
const samples = await page.evaluate(async () => {
  const mk = (w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"));
    return c.toDataURL("image/jpeg", 0.92);
  };
  const photo = mk(600, 800, (g) => {
    g.fillStyle = "#e8eef5"; g.fillRect(0, 0, 600, 800);
    g.fillStyle = "#c58c5c"; g.beginPath(); g.ellipse(300, 320, 120, 150, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1e3a8a"; g.fillRect(120, 520, 360, 280);
  });
  const sig = mk(900, 300, (g) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, 900, 300);
    g.strokeStyle = "#111"; g.lineWidth = 8; g.beginPath(); g.moveTo(80, 200);
    for (let x = 80; x < 820; x += 40) g.lineTo(x, 150 + Math.sin(x / 30) * 60);
    g.stroke();
  });
  return { photo, sig };
});
fs.mkdirSync("/tmp/psk-funnel", { recursive: true });
fs.writeFileSync("/tmp/psk-funnel/photo.jpg", Buffer.from(samples.photo.split(",")[1], "base64"));
fs.writeFileSync("/tmp/psk-funnel/signature.jpg", Buffer.from(samples.sig.split(",")[1], "base64"));

async function waitResult(id) {
  const loc = page.getByTestId(`result-${id}`);
  await loc.waitFor({ state: "attached", timeout: 30000 });
  await page.waitForFunction((id) => document.querySelector(`[data-testid="result-${id}"]`)?.getAttribute("data-busy") === "false", id, { timeout: 30000 });
  await page.waitForTimeout(400);
}
await page.goto(`${BASE}/ibps-po-photo-signature-size`, { waitUntil: "networkidle" });
await page.getByTestId("file-photo").setInputFiles("/tmp/psk-funnel/photo.jpg");
await waitResult("photo");
let [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByTestId("dl-photo").click()]);
await d.path();
await page.getByTestId("tab-signature").click();
await page.getByTestId("file-signature").setInputFiles("/tmp/psk-funnel/signature.jpg");
await waitResult("signature");
[d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByTestId("dl-signature").click()]);
await d.path();

await page.goto(`${BASE}/exam-kit`, { waitUntil: "networkidle" });
await page.getByTestId("show-paywall").click();
await page.getByTestId("paywall").waitFor();
const cfg = await (await fetch(BASE + "/api/payment/config")).json();
if (cfg.available) {
  await page.waitForFunction(() => !document.querySelector('[data-testid="buy-kit"]')?.disabled, null, { timeout: 10000 });
  await page.getByTestId("buy-kit").click();
  if (cfg.provider === "mock") {
    await page.getByTestId("mock-pay-success").click();
    await page.getByTestId("paid-msg").waitFor({ timeout: 15000 });
  }
  log("checkout done (" + cfg.mode + ")");
} else log("payments unavailable → no checkout events");
await page.waitForTimeout(1500);
await browser.close();

if (LOG) {
  await new Promise((r) => setTimeout(r, 500));
  const lines = fs.readFileSync(LOG).subarray(pos).toString("utf8").split("\n").filter((l) => l.startsWith("ANALYTICS ")).map((l) => JSON.parse(l.slice(10)));
  const count = (e) => lines.filter((l) => l.e === e).length;
  const want = ["pageview", "preset_select", "process_photo", "process_signature", "download", "kit_view"];
  if (cfg.available) want.push("checkout_open", "order_created", "payment_success");
  let bad = 0;
  for (const e of want) {
    const n = count(e);
    console.log(`${n ? "ok  " : "FAIL"} - ${e}: ${n}`);
    if (!n) bad++;
  }
  const ps = lines.find((l) => l.e === "preset_select");
  console.log(`${ps?.x?.exam === "ibps-po" ? "ok  " : "FAIL"} - preset_select exam=ibps-po (${ps?.x?.exam})`);
  if (ps?.x?.exam !== "ibps-po") bad++;
  const dl = lines.filter((l) => l.e === "download");
  console.log(`${dl.length === 2 && dl.every((l) => l.x?.exam === "ibps-po") ? "ok  " : "FAIL"} - 2 downloads tagged ibps-po`);
  if (!(dl.length === 2 && dl.every((l) => l.x?.exam === "ibps-po"))) bad++;
  const pv = lines.find((l) => l.e === "pageview" && l.p === "/");
  console.log(`${pv?.utm === UTM ? "ok  " : "FAIL"} - landing pageview carries utm_source=${UTM}`);
  if (pv?.utm !== UTM) bad++;
  console.log(bad ? `FUNNEL FAILED (${bad})` : "FUNNEL PASSED");
  process.exit(bad ? 1 : 0);
}
log("FUNNEL DONE");
