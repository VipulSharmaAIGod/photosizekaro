// End-to-end test: drives the PRODUCTION build in headless Chrome at 390px (mobile), feeds generated sample
// photos/signatures (incl. an EXIF-rotated phone JPEG and a shadowed signature), downloads the outputs and checks
// exact pixel dimensions, JFIF DPI and byte size against each preset's KB window — in Node, independent of the UI.
// Usage: BASE_URL=http://localhost:3200 node scripts/e2e.mjs   (server must run with ALLOW_MOCK_PAYMENTS=true)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3200";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "test-output");
const SHOTS = path.join(ROOT, "screenshots");
const SAMPLES = path.join(OUT, "samples");
fs.mkdirSync(SAMPLES, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let failures = 0;
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/* ---------------- JPEG / ZIP / PDF parsing (Node side, independent of app code) ---------------- */
function jpegInfo(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2, dpi = null, width = null, height = null, exif = false;
  while (i < buf.length - 4) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xd9 || m === 0xda) break;
    const len = buf.readUInt16BE(i + 2);
    if (m === 0xe0 && buf.toString("latin1", i + 4, i + 9) === "JFIF\0") {
      const unit = buf[i + 11], xd = buf.readUInt16BE(i + 12);
      dpi = unit === 1 ? xd : unit === 2 ? Math.round(xd * 2.54) : null;
    }
    if (m === 0xe1 && buf.toString("latin1", i + 4, i + 8) === "Exif") exif = true;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      height = buf.readUInt16BE(i + 5);
      width = buf.readUInt16BE(i + 7);
    }
    i += 2 + len;
  }
  return { width, height, dpi, exif, bytes: buf.length };
}

function unzip(buf) {
  const files = {};
  let i = 0;
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
    const name = buf.toString("utf8", i + 30, i + 30 + nameLen);
    const start = i + 30 + nameLen + extraLen;
    if (method !== 0) throw new Error("unexpected compression");
    files[name] = buf.subarray(start, start + size);
    i = start + size;
  }
  return files;
}

function kbOk(bytes, minKB, maxKB) {
  return bytes <= maxKB * 1000 && (!minKB || bytes >= minKB * 1024);
}

/* ---------------- EXIF orientation injection ---------------- */
function withExifOrientation(jpeg, orientation) {
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0]);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const seg = Buffer.alloc(4);
  seg[0] = 0xff; seg[1] = 0xe1; seg.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), seg, payload, jpeg.subarray(2)]);
}

/* ---------------- sample generation (in the browser canvas) ---------------- */
async function makeSamples(page) {
  const data = await page.evaluate(async () => {
    const noise = (x, w, h, amt) => {
      const d = x.getImageData(0, 0, w, h);
      for (let i = 0; i < d.data.length; i += 4) {
        const n = (Math.random() - 0.5) * amt;
        d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
      }
      x.putImageData(d, 0, 0);
    };
    const person = (x, w, h, bgTop, bgBottom) => {
      x.fillStyle = bgTop; x.fillRect(0, 0, w, h / 2);
      x.fillStyle = bgBottom; x.fillRect(0, h / 2, w, h / 2);
      x.fillStyle = "#1f3a5f"; // shirt
      x.beginPath(); x.ellipse(w / 2, h * 1.02, w * 0.3, h * 0.3, 0, Math.PI, 0); x.fill();
      x.fillStyle = "#c68a64"; // neck + face
      x.fillRect(w * 0.45, h * 0.5, w * 0.1, h * 0.2);
      x.beginPath(); x.ellipse(w / 2, h * 0.42, w * 0.17, h * 0.17, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#111"; // hair, eyes, mouth
      x.beginPath(); x.ellipse(w / 2, h * 0.3, w * 0.18, h * 0.07, 0, Math.PI, 0); x.fill();
      x.beginPath(); x.arc(w * 0.44, h * 0.4, w * 0.015, 0, 7); x.arc(w * 0.56, h * 0.4, w * 0.015, 0, 7); x.fill();
      x.fillStyle = "#8a3b2a"; x.fillRect(w * 0.46, h * 0.5, w * 0.08, h * 0.012);
      noise(x, w, h, 22);
    };
    const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
    const jpg = (c, q = 0.92) => c.toDataURL("image/jpeg", q).split(",")[1];
    const png = (c) => c.toDataURL("image/png").split(",")[1];
    const out = {};

    // 1) regular portrait photo, light grey background (phone-like 1500×2000)
    let [c, x] = canvas(1500, 2000);
    person(x, 1500, 2000, "#d9dde3", "#cfd4da");
    out.photo = jpg(c);

    // 1b) high-detail photo (heavy sensor noise) → forces real quality reduction to fit the KB cap
    [c, x] = canvas(1500, 2000);
    person(x, 1500, 2000, "#d9dde3", "#cfd4da");
    noise(x, 1500, 2000, 110);
    out.photoDetailed = jpg(c, 0.95);

    // 2) phone photo stored landscape + EXIF orientation 6 → must display as portrait.
    //    Portrait truth: RED top half, GREEN bottom half.
    const [p, px] = canvas(1200, 1600);
    person(px, 1200, 1600, "rgb(225,110,110)", "rgb(110,190,110)");
    [c, x] = canvas(1600, 1200);
    x.translate(0, 1200); x.rotate(-Math.PI / 2); x.drawImage(p, 0, 0); // stored = portrait rotated 90° CCW
    out.photoExif6 = jpg(c);

    // 3) signature on grey paper with a shadow gradient + blue ballpoint ink (scan/phone-like)
    [c, x] = canvas(1600, 640);
    const g = x.createLinearGradient(0, 0, 1600, 640);
    g.addColorStop(0, "#bdbdb6"); g.addColorStop(0.6, "#e6e4dc"); g.addColorStop(1, "#9a9890");
    x.fillStyle = g; x.fillRect(0, 0, 1600, 640);
    x.strokeStyle = "#1b2a7a"; x.lineWidth = 9; x.lineCap = "round";
    x.beginPath(); x.moveTo(300, 380);
    for (let k = 0; k < 9; k++) x.bezierCurveTo(330 + k * 110, 150, 380 + k * 110, 520, 410 + k * 110, 330);
    x.stroke();
    x.beginPath(); x.moveTo(320, 470); x.lineTo(1340, 430); x.stroke();
    noise(x, 1600, 640, 16);
    out.signature = jpg(c);
    out.signaturePng = png(c);

    // 4) left thumb impression (ink ridges on paper)
    [c, x] = canvas(900, 900);
    x.fillStyle = "#e8e6df"; x.fillRect(0, 0, 900, 900);
    x.strokeStyle = "#2a2d55"; x.lineWidth = 7;
    for (let r = 20; r < 300; r += 22) { x.beginPath(); x.ellipse(450, 470, r * 0.72, r, 0.15, 0, Math.PI * 2); x.stroke(); }
    noise(x, 900, 900, 18);
    out.thumb = jpg(c);

    // 5) hand-written declaration (cursive-ish text on paper)
    [c, x] = canvas(1800, 900);
    x.fillStyle = "#ecebe5"; x.fillRect(0, 0, 1800, 900);
    x.fillStyle = "#1a1f66"; x.font = "italic 58px cursive";
    ["I, Rahul Kumar, hereby declare that all the", "information submitted by me in the application", "form is correct, true and valid. I will present", "the supporting documents as and when required."].forEach((t, k) => x.fillText(t, 90, 200 + k * 150));
    noise(x, 1800, 900, 14);
    out.declaration = jpg(c);

    // 6) NEET fingers + thumbs sheet
    [c, x] = canvas(1800, 1300);
    x.fillStyle = "#efefea"; x.fillRect(0, 0, 1800, 1300);
    x.fillStyle = "#24285a";
    for (let k = 0; k < 10; k++) { x.beginPath(); x.ellipse(150 + k * 170, k < 5 ? 420 : 900, 55, 85, 0, 0, 7); x.fill(); }
    noise(x, 1800, 1300, 20);
    out.fingers = jpg(c);
    return out;
  });
  const files = {};
  for (const [k, b64] of Object.entries(data)) {
    let buf = Buffer.from(b64, "base64");
    const ext = k.endsWith("Png") ? "png" : "jpg";
    if (k === "photoExif6") buf = withExifOrientation(buf, 6);
    const f = path.join(SAMPLES, `${k}.${ext}`);
    fs.writeFileSync(f, buf);
    files[k] = f;
  }
  return files;
}

/* ---------------- helpers ---------------- */
async function settle(page, testid, timeout = 30000) {
  const loc = page.getByTestId(testid);
  await loc.waitFor({ state: "attached", timeout });
  await page.waitForTimeout(450);
  let last = null;
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const busy = await loc.getAttribute("data-busy");
    const bytes = await loc.getAttribute("data-bytes");
    if (busy === "false" && bytes === last) return loc;
    last = busy === "false" ? bytes : null;
    await page.waitForTimeout(350);
  }
  throw new Error(`timeout waiting for ${testid}`);
}

async function download(page, testid, saveAs) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId(testid).click()]);
  const f = path.join(OUT, saveAs || dl.suggestedFilename());
  await dl.saveAs(f);
  return { buf: fs.readFileSync(f), name: dl.suggestedFilename(), file: f };
}

/** Sample pixels of a JPEG inside the page (decoder of the browser), returns [[r,g,b],…] at relative coords. */
async function samplePixels(page, buf, points) {
  return page.evaluate(
    async ({ b64, points }) => {
      const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas");
      c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext("2d");
      x.drawImage(bmp, 0, 0);
      return points.map(([fx, fy]) => Array.from(x.getImageData(Math.floor(fx * (c.width - 1)), Math.floor(fy * (c.height - 1)), 1, 1).data.slice(0, 3)));
    },
    { b64: buf.toString("base64"), points },
  );
}

async function processDoc(page, { label, docId, sample, expect, tab, before, saveAs }) {
  if (tab) await page.getByTestId(`tab-${docId}`).click();
  await page.getByTestId(`file-${docId}`).setInputFiles(sample);
  await settle(page, `result-${docId}`);
  if (before) {
    await before();
    await settle(page, `result-${docId}`);
  }
  const ui = page.getByTestId(`result-${docId}`);
  const uiOk = await ui.getAttribute("data-ok");
  const { buf, name } = await download(page, `dl-${docId}`, saveAs);
  const info = jpegInfo(buf);
  const dimsOk = info && info.width === expect.w && info.height === expect.h;
  const sizeOk = kbOk(buf.length, expect.minKB, expect.maxKB);
  const dpiOk = !expect.dpi || info.dpi === expect.dpi;
  const nameOk = !expect.name || name === expect.name;
  check(
    `${label}: ${expect.w}×${expect.h}px, ${expect.minKB ?? 0}–${expect.maxKB} KB${expect.dpi ? `, ${expect.dpi} DPI` : ""}`,
    dimsOk && sizeOk && dpiOk && nameOk && uiOk === "true",
    `got ${info?.width}×${info?.height}, ${(buf.length / 1024).toFixed(2)} KB (${buf.length} B), dpi ${info?.dpi}, file ${name}, ui-ok ${uiOk}, q ${await ui.getAttribute("data-quality")}, pad ${await ui.getAttribute("data-padded")}`,
  );
  return { buf, info };
}

const isWhite = ([r, g, b], t = 238) => r >= t && g >= t && b >= t;

/* ---------------- main ---------------- */
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctxOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, locale: "en-IN" };
const context = await browser.newContext(ctxOpts);
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
const t0 = Date.now();

try {
  // Landing
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const samples = await makeSamples(page);
  check("landing: title + SSC webcam callout + exam grid", (await page.title()).includes("Exam Photo") && (await page.getByTestId("ssc-callout").isVisible()) && (await page.getByTestId("exam-ibps-po").count()) === 1);
  await page.screenshot({ path: path.join(SHOTS, "01-landing.png") });
  await page.screenshot({ path: path.join(SHOTS, "02-landing-full.png"), fullPage: true });
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  check("landing: JSON-LD SoftwareApplication + FAQPage", ld.some((t) => t.includes("SoftwareApplication")) && ld.some((t) => t.includes("FAQPage")));

  // IBPS PO — all 4 documents
  await page.goto(BASE + "/ibps-po-photo-signature-size", { waitUntil: "networkidle" });
  check("IBPS PO page: spec table + OG + canonical", (await page.getByTestId("spec-table").count()) === 1 && (await page.locator('meta[property="og:title"]').count()) === 1 && (await page.locator('link[rel="canonical"]').getAttribute("href")).endsWith("/ibps-po-photo-signature-size"));
  await processDoc(page, { label: "IBPS PO photo", docId: "photo", sample: samples.photoDetailed, expect: { w: 200, h: 230, minKB: 20, maxKB: 50 }, saveAs: "ibps-po-photo.jpg" });
  await page.getByTestId("tool-photo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "03-ibps-po-photo-result.png") });
  await processDoc(page, { label: "IBPS PO signature (shadowed paper → cleaned)", docId: "signature", tab: true, sample: samples.signature, expect: { w: 140, h: 60, minKB: 10, maxKB: 20 }, saveAs: "ibps-po-signature.jpg" });
  await page.getByTestId("tool-signature").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "04-ibps-po-signature-result.png") });
  await processDoc(page, { label: "IBPS PO left thumb", docId: "thumb", tab: true, sample: samples.thumb, expect: { w: 240, h: 240, minKB: 20, maxKB: 50, dpi: 200 }, saveAs: "ibps-po-thumb.jpg" });
  await processDoc(page, { label: "IBPS PO handwritten declaration", docId: "declaration", tab: true, sample: samples.declaration, expect: { w: 800, h: 400, minKB: 50, maxKB: 100, dpi: 200 }, saveAs: "ibps-po-declaration.jpg" });

  // EXIF orientation 6 (phone photo) on SBI PO photo, background whitening off so the colour halves stay visible
  await page.goto(BASE + "/sbi-po-photo-signature-size", { waitUntil: "networkidle" });
  const exif = await processDoc(page, {
    label: "SBI PO photo from EXIF-rotated phone JPEG",
    docId: "photo",
    sample: samples.photoExif6,
    expect: { w: 200, h: 230, minKB: 20, maxKB: 50 },
    saveAs: "sbi-po-photo-exif6.jpg",
    before: async () => {
      const w = page.getByTestId("whiten-photo");
      if (await w.isChecked()) await w.uncheck();
    },
  });
  const [tl, tr, bl] = await samplePixels(page, exif.buf, [[0.04, 0.06], [0.96, 0.06], [0.04, 0.96]]);
  const red = ([r, g, b]) => r > g + 50 && r > b + 50;
  const green = ([r, g, b]) => g > r + 40 && g > b + 40;
  check("EXIF orientation 6 auto-rotated (red top, green bottom)", (await page.getByTestId("exif-photo").isVisible()) && red(tl) && red(tr) && green(bl), `tl ${tl} tr ${tr} bl ${bl}`);

  // SSC CGL — photo is live (info card), signature 10–20 KB
  await page.goto(BASE + "/ssc-cgl-photo-signature-size", { waitUntil: "networkidle" });
  const sig = await processDoc(page, { label: "SSC CGL signature (PNG input)", docId: "signature", sample: samples.signaturePng, expect: { w: 472, h: 157, minKB: 10, maxKB: 20, dpi: 200 }, saveAs: "ssc-cgl-signature.jpg" });
  const corners = await samplePixels(page, sig.buf, [[0.01, 0.02], [0.99, 0.02], [0.01, 0.98], [0.99, 0.98]]);
  check("SSC signature cleanup: shadowed grey paper → white corners", corners.every((p) => isWhite(p)), corners.map((p) => p.join(",")).join(" | "));
  await page.getByTestId("tab-photo").click();
  const info = page.getByTestId("info-photo");
  check("SSC CGL photo shows 'captured live' card (no uploader)", (await info.isVisible()) && /captured live/i.test(await info.innerText()) && (await page.getByTestId("file-photo").count()) === 0);
  await page.screenshot({ path: path.join(SHOTS, "05-ssc-cgl-live-photo.png") });

  // UPSC CSE — file names photo / signature, signature 400×500
  await page.goto(BASE + "/upsc-cse-photo-signature-size", { waitUntil: "networkidle" });
  await processDoc(page, { label: "UPSC CSE photo (file name photo.jpg)", docId: "photo", sample: samples.photoDetailed, expect: { w: 413, h: 531, minKB: 20, maxKB: 200, name: "photo.jpg" }, saveAs: "upsc-photo.jpg" });
  await processDoc(page, { label: "UPSC CSE triple signature (file name signature.jpg)", docId: "signature", tab: true, sample: samples.signature, expect: { w: 400, h: 500, minKB: 20, maxKB: 100, name: "signature.jpg" }, saveAs: "upsc-signature.jpg" });

  // RRB NTPC signature 30–49 KB
  await page.goto(BASE + "/rrb-ntpc-photo-signature-size", { waitUntil: "networkidle" });
  await processDoc(page, { label: "RRB NTPC signature", docId: "signature", sample: samples.signature, expect: { w: 413, h: 236, minKB: 30, maxKB: 49, dpi: 300 }, saveAs: "rrb-ntpc-signature.jpg" });

  // NEET UG — photo (whitened) + fingers sheet 50–200 KB
  await page.goto(BASE + "/neet-ug-photo-signature-size", { waitUntil: "networkidle" });
  const neet = await processDoc(page, { label: "NEET UG photo (white background)", docId: "photo", sample: samples.photo, expect: { w: 413, h: 531, minKB: 10, maxKB: 200, dpi: 300 }, saveAs: "neet-photo.jpg" });
  const [nb1, nb2] = await samplePixels(page, neet.buf, [[0.03, 0.05], [0.97, 0.05]]);
  check("NEET photo background whitened", isWhite(nb1, 235) && isWhite(nb2, 235), `${nb1} | ${nb2}`);
  await processDoc(page, { label: "NEET UG fingers & thumb impressions", docId: "fingers", tab: true, sample: samples.fingers, expect: { w: 1200, h: 900, minKB: 50, maxKB: 200 }, saveAs: "neet-fingers.jpg" });

  // GATE — photo & signature inside pixel ranges
  await page.goto(BASE + "/gate-photo-signature-size", { waitUntil: "networkidle" });
  await processDoc(page, { label: "GATE photo", docId: "photo", sample: samples.photo, expect: { w: 413, h: 531, minKB: 5, maxKB: 600 }, saveAs: "gate-photo.jpg" });
  await processDoc(page, { label: "GATE signature", docId: "signature", tab: true, sample: samples.signature, expect: { w: 525, h: 175, minKB: 3, maxKB: 300 }, saveAs: "gate-signature.jpg" });

  // CTET
  await page.goto(BASE + "/ctet-photo-signature-size", { waitUntil: "networkidle" });
  await processDoc(page, { label: "CTET photo (high-detail → compressed)", docId: "photo", sample: samples.photoDetailed, expect: { w: 413, h: 531, minKB: 10, maxKB: 100, dpi: 300 }, saveAs: "ctet-photo.jpg" });
  await processDoc(page, { label: "CTET signature", docId: "signature", tab: true, sample: samples.signature, expect: { w: 413, h: 177, minKB: 3, maxKB: 30 }, saveAs: "ctet-signature.jpg" });

  // MPPSC (unverified) — name & date strip on by default
  await page.goto(BASE + "/mppsc-photo-signature-size", { waitUntil: "networkidle" });
  check("MPPSC page shows unverified warning", await page.getByTestId("unverified-warning").isVisible());
  const mp = await processDoc(page, {
    label: "MPPSC photo with name/date strip",
    docId: "photo",
    sample: samples.photo,
    expect: { w: 413, h: 531, minKB: 20, maxKB: 100 },
    saveAs: "mppsc-photo-strip.jpg",
    before: async () => {
      check("MPPSC strip enabled by default", await page.getByTestId("strip-photo").isChecked());
      await page.getByTestId("strip-name-photo").fill("RAHUL KUMAR");
    },
  });
  const strip = await samplePixels(page, mp.buf, [[0.03, 0.9], [0.97, 0.97], [0.03, 0.3]]);
  check("MPPSC strip: white band at bottom", isWhite(strip[0], 230) && isWhite(strip[1], 230), strip.map((p) => p.join(",")).join(" | "));
  await page.getByTestId("tool-photo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "06-mppsc-strip.png") });

  // RPSC — info only (unverified, no resizer)
  await page.goto(BASE + "/rpsc-photo-signature-size", { waitUntil: "networkidle" });
  check("RPSC (unverified) shows warning, no fake numbers", await page.getByTestId("unverified-warning").isVisible());
  await page.screenshot({ path: path.join(SHOTS, "07-rpsc-unverified.png") });

  // Custom size: cm @ 300 DPI and mm @ 200 DPI
  await page.goto(BASE + "/custom-size", { waitUntil: "networkidle" });
  await page.getByTestId("custom-unit").selectOption("cm");
  await page.getByTestId("custom-w").fill("3.5");
  await page.getByTestId("custom-h").fill("4.5");
  await page.getByTestId("custom-dpi").fill("300");
  await page.getByTestId("custom-min").fill("15");
  await page.getByTestId("custom-max").fill("40");
  check("custom: 3.5×4.5 cm @300 DPI → 413×531 px", (await page.getByTestId("custom-px").innerText()).includes("413 × 531"));
  await processDoc(page, { label: "Custom photo 3.5×4.5 cm @300DPI, 15–40 KB", docId: "custom", sample: samples.photo, expect: { w: 413, h: 531, minKB: 15, maxKB: 40, dpi: 300 }, saveAs: "custom-photo.jpg" });
  await page.screenshot({ path: path.join(SHOTS, "08-custom-size.png") });
  await page.getByTestId("custom-unit").selectOption("px");
  await page.getByTestId("custom-w").fill("1000");
  await page.getByTestId("custom-h").fill("1300");
  await page.getByTestId("custom-min").fill("20");
  await page.getByTestId("custom-max").fill("60");
  const big = await processDoc(page, { label: "Custom 1000×1300 px high-detail photo squeezed into 20–60 KB", docId: "custom", sample: samples.photoDetailed, expect: { w: 1000, h: 1300, minKB: 20, maxKB: 60 }, saveAs: "custom-big.jpg" });
  const q = Number(await page.getByTestId("result-custom").getAttribute("data-quality"));
  check("binary search lowered JPEG quality to fit max KB (and stayed near the cap)", q < 0.9 && big.buf.length > 50 * 1000, `quality ${q}, ${big.buf.length} B`);
  await page.getByTestId("custom-kind").selectOption("signature");
  await page.getByTestId("custom-unit").selectOption("mm");
  await page.getByTestId("custom-w").fill("50");
  await page.getByTestId("custom-h").fill("20");
  await page.getByTestId("custom-dpi").fill("200");
  await page.getByTestId("custom-min").fill("10");
  await page.getByTestId("custom-max").fill("20");
  await processDoc(page, { label: "Custom signature 50×20 mm @200DPI, 10–20 KB", docId: "custom", sample: samples.signature, expect: { w: 394, h: 157, minKB: 10, maxKB: 20, dpi: 200 }, saveAs: "custom-signature.jpg" });

  // Hindi page
  await page.goto(BASE + "/photo-ka-size-kaise-kam-kare", { waitUntil: "networkidle" });
  check("Hindi page renders (lang=hi)", (await page.locator('article[lang="hi"]').count()) === 1);
  await page.screenshot({ path: path.join(SHOTS, "09-hindi-page.png") });

  // ---- Exam Kit: batch ZIP + mock payment + A4 sheet ----
  await page.goto(BASE + "/exam-kit", { waitUntil: "networkidle" });
  for (const k of ["photo", "signature", "thumb", "declaration"]) await page.getByTestId(`kit-file-${k}`).setInputFiles(samples[k]);
  await page.waitForFunction(() => !document.querySelector('[data-testid="kit-generate"]')?.disabled, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.getByTestId("kit-generate").click();
  await page.getByTestId("kit-results").waitFor({ timeout: 60000 });
  const rows = await page.locator('[data-testid="kit-results"] tr[data-path]').evaluateAll((trs) => trs.map((t) => ({ path: t.dataset.path, bytes: +t.dataset.bytes, w: +t.dataset.width, h: +t.dataset.height })));
  check("kit: files generated for selected exams", rows.length >= 10, `${rows.length} files`);
  check("kit: ZIP locked before payment", await page.getByTestId("kit-zip-locked").isVisible());
  await page.getByTestId("sheet-make").click();
  await page.getByTestId("sheet-preview").waitFor({ timeout: 30000 });
  check("kit: sheet preview shown, download locked", await page.getByTestId("sheet-locked").isVisible());
  await page.screenshot({ path: path.join(SHOTS, "10-kit-results-locked.png") });
  await page.getByTestId("kit-zip-locked").click();
  await page.getByTestId("paywall").waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-testid="buy-kit"]')?.disabled, null, { timeout: 10000 });
  check("paywall: mock banner visible (local test mode)", await page.getByTestId("mock-banner").isVisible());
  await page.getByTestId("paywall").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "11-paywall.png") });
  await page.getByTestId("buy-kit").click();
  await page.getByTestId("mock-checkout").waitFor();
  await page.screenshot({ path: path.join(SHOTS, "12-mock-checkout.png") });
  await page.getByTestId("mock-pay-success").click();
  await page.getByTestId("paid-msg").waitFor({ timeout: 15000 });
  const paidText = await page.getByTestId("paid-msg").innerText();
  const paymentId = (paidText.match(/pay_[A-Za-z0-9]+/) || [])[0];
  check("mock payment → unlocked", !!paymentId, paidText);
  const zip = await download(page, "kit-zip", "exam-kit.zip");
  const entries = unzip(zip.buf);
  const EXPECT = {
    "ssc-cgl/ssc-cgl-signature.jpg": [472, 157, 10, 20],
    "ibps-po/ibps-po-photo.jpg": [200, 230, 20, 50],
    "ibps-po/ibps-po-signature.jpg": [140, 60, 10, 20],
    "ibps-po/ibps-po-thumb.jpg": [240, 240, 20, 50],
    "ibps-po/ibps-po-declaration.jpg": [800, 400, 50, 100],
    "sbi-po/sbi-po-photo.jpg": [200, 230, 20, 50],
    "rrb-ntpc/rrb-ntpc-signature.jpg": [413, 236, 30, 49],
    "neet-ug/neet-ug-photo.jpg": [413, 531, 10, 200],
    "neet-ug/neet-ug-signature.jpg": [413, 177, 10, 100],
    "ctet/ctet-photo.jpg": [413, 531, 10, 100],
    "ctet/ctet-signature.jpg": [413, 177, 3, 30],
  };
  const zipLines = [];
  let zipOk = true;
  for (const [p, [w, h, lo, hi]] of Object.entries(EXPECT)) {
    const b = entries[p];
    const i = b && jpegInfo(Buffer.from(b));
    const ok = !!i && i.width === w && i.height === h && kbOk(b.length, lo, hi);
    zipOk &&= ok;
    zipLines.push(`${ok ? "ok" : "BAD"} ${p} ${i?.width}x${i?.height} ${b ? (b.length / 1024).toFixed(1) : "-"}KB`);
  }
  check(`kit ZIP: ${Object.keys(EXPECT).length} expected files with exact px & KB`, zipOk && !!entries["README.txt"], zipLines.join("; "));
  fs.mkdirSync(path.join(OUT, "kit"), { recursive: true });
  for (const [n, b] of Object.entries(entries)) {
    fs.mkdirSync(path.dirname(path.join(OUT, "kit", n)), { recursive: true });
    fs.writeFileSync(path.join(OUT, "kit", n), b);
  }
  await page.getByTestId("sheet-make").click();
  await page.getByTestId("sheet-download").waitFor({ timeout: 30000 });
  const pdf = await download(page, "sheet-download", "passport-photos-A4.pdf");
  const pdfText = pdf.buf.toString("latin1");
  const jStart = pdf.buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
  const pj = jpegInfo(pdf.buf.subarray(jStart));
  check("A4 PDF sheet: A4 MediaBox + 2480×3508 image @300DPI", pdfText.startsWith("%PDF-") && /MediaBox\s*\[\s*0 0 595\.2\d* 841\.8\d*/.test(pdfText) && pj?.width === 2480 && pj?.height === 3508, `${pj?.width}×${pj?.height}, ${(pdf.buf.length / 1024).toFixed(0)} KB`);
  await page.getByTestId("sheet-layout").selectOption("4x6-8");
  await page.getByTestId("sheet-make").click();
  await page.waitForTimeout(500);
  await page.getByTestId("sheet-download").waitFor({ timeout: 30000 });
  const s46 = await download(page, "sheet-download", "passport-photos-4x6.jpg");
  const s46i = jpegInfo(s46.buf);
  check("4×6 sheet: 1800×1200 px @300 DPI", s46i.width === 1800 && s46i.height === 1200 && s46i.dpi === 300, `${s46i.width}×${s46i.height} dpi ${s46i.dpi}`);
  await page.getByTestId("kit-zip").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "13-kit-unlocked.png") });

  // Restore purchase in a fresh browser (new device)
  const ctx2 = await browser.newContext(ctxOpts);
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/exam-kit", { waitUntil: "networkidle" });
  await p2.getByTestId("show-paywall").click();
  await p2.getByTestId("restore-open").click();
  await p2.getByTestId("restore-input").fill(paymentId || "pay_invalid");
  await p2.getByTestId("restore-submit").click();
  await p2.getByTestId("paid-msg").waitFor({ timeout: 15000 });
  check("restore purchase by payment ID on a new device", (await p2.getByTestId("paid-msg").innerText()).includes(paymentId));
  await ctx2.close();

  // Tamper check: forged token must be rejected by the server
  const forged = await page.evaluate(async () => (await fetch("/api/unlock/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "eyJ2IjoxLCJza3UiOiJraXQifQ.deadbeef" }) })).json());
  const real = await page.evaluate(async () => {
    const raw = Object.keys(localStorage).filter((k) => k.startsWith("psk:unlock")).map((k) => localStorage.getItem(k))[0];
    const token = raw && (JSON.parse(raw).token || raw);
    return (await fetch("/api/unlock/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })).json();
  });
  check("unlock token: forged rejected, issued token verifies server-side", forged.valid === false && real.valid === true && real.paymentId === paymentId, `forged ${JSON.stringify(forged)} real ${JSON.stringify(real)}`);

  // Static SEO endpoints
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  const rb = await (await fetch(BASE + "/robots.txt")).text();
  check("sitemap lists exam pages, robots disallows /api/", sm.includes("/neet-ug-photo-signature-size") && sm.includes("/ssc-cgl-photo-signature-size") && rb.includes("Disallow: /api/"));

  // Production gating: same build WITHOUT ALLOW_MOCK_PAYMENTS → "Payments launching soon", no free unlocks
  const port2 = 3291;
  const srv = spawn("npx", ["next", "start", "-p", String(port2)], { cwd: ROOT, env: { ...process.env, ALLOW_MOCK_PAYMENTS: "false", NODE_ENV: "production" }, stdio: "ignore", detached: true });
  try {
    let cfg = null;
    for (let k = 0; k < 60 && !cfg; k++) {
      await new Promise((r) => setTimeout(r, 500));
      cfg = await fetch(`http://localhost:${port2}/api/payment/config`).then((r) => r.json()).catch(() => null);
    }
    const order = await fetch(`http://localhost:${port2}/api/payment/order`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sku: "kit" }) });
    const p3 = await context.newPage();
    await p3.goto(`http://localhost:${port2}/exam-kit`, { waitUntil: "networkidle" });
    await p3.getByTestId("show-paywall").click();
    await p3.getByTestId("launching-soon").waitFor({ timeout: 10000 });
    check("production without Razorpay keys: payments disabled ('launching soon'), order API refuses", cfg && cfg.available === false && order.status >= 400, `config ${JSON.stringify(cfg)}, order HTTP ${order.status}`);
    await p3.screenshot({ path: path.join(SHOTS, "14-prod-payments-launching-soon.png") });
    await p3.close();
  } finally {
    try { process.kill(-srv.pid); } catch {}
  }

  check("no uncaught page errors", consoleErrors.filter((e) => !/favicon|Failed to load resource/i.test(e)).length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("e2e run completed without exceptions", false, String(e?.stack || e));
  await page.screenshot({ path: path.join(OUT, "failure.png") }).catch(() => {});
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
fs.writeFileSync(path.join(OUT, "e2e-results.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
process.exit(failures ? 1 : 0);
