"use client";
/**
 * Browser-side image pipeline. Nothing is uploaded: every step runs on <canvas> in the user's device.
 *
 *   loadImageFile → (rotate) → crop → [whiten background | clean ink] → resize to exact px
 *   → [name/date strip] → encodeToKB (binary search on JPEG quality, DPI header, padding to min KB)
 */
import { exifOrientation, jpegSize, padJpeg, setJpegDpi } from "./jpeg";

export type Rect = { x: number; y: number; width: number; height: number };
export const MAX_WORKING = 2400; // longest side of the working copy (keeps phones fast)

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;

/* ---------------------------------------------------------------------------------------------- */
/* Loading + EXIF                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

let autoOrientCache: Promise<boolean> | null = null;
/** Do this browser's <img> decodes apply EXIF orientation already? (all evergreen browsers since 2020 do) */
function browserAutoOrients(): Promise<boolean> {
  if (autoOrientCache) return autoOrientCache;
  // 2×1 JPEG with EXIF orientation 6 (rotate 90°). If decoded as 1×2 the browser rotates for us.
  const src =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAaEAEAAQUAAAAAAAAAAAAAAAAAAQIDM3Kx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwb/xAAZEQABBQAAAAAAAAAAAAAAAAAAAQIDM3H/2gAMAwEAAhEDEQA/AJC9mr2noC3gqbiAzWO1T//Z";
  autoOrientCache = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth === 1 && img.naturalHeight === 2);
    img.onerror = () => resolve(true);
    img.src = src;
  });
  return autoOrientCache;
}

/** Apply an EXIF orientation transform manually (only used on old browsers). */
function orient(img: CanvasImageSource, w: number, h: number, o: number) {
  const swap = o >= 5;
  const c = canvas(swap ? h : w, swap ? w : h);
  const x = ctx2d(c);
  switch (o) {
    case 2: x.transform(-1, 0, 0, 1, w, 0); break;
    case 3: x.transform(-1, 0, 0, -1, w, h); break;
    case 4: x.transform(1, 0, 0, -1, 0, h); break;
    case 5: x.transform(0, 1, 1, 0, 0, 0); break;
    case 6: x.transform(0, 1, -1, 0, h, 0); break;
    case 7: x.transform(0, -1, -1, 0, h, w); break;
    case 8: x.transform(0, -1, 1, 0, 0, w); break;
  }
  x.drawImage(img, 0, 0, w, h);
  return c;
}

export interface Loaded {
  canvas: HTMLCanvasElement;
  orientation: number;
  rotatedByExif: boolean;
  originalWidth: number;
  originalHeight: number;
}

/** Decode any browser-supported image, apply EXIF rotation, and return a working canvas (≤ MAX_WORKING px). */
export async function loadImageFile(file: Blob): Promise<Loaded> {
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  const orientation = exifOrientation(head);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode().catch(() => {
      throw new Error("This file could not be opened. Please choose a JPG or PNG photo (iPhone HEIC: change Camera → Formats → Most Compatible, or take a screenshot of the photo).");
    });
    const auto = await browserAutoOrients();
    let src: CanvasImageSource = img;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (!auto && orientation > 1) {
      const c = orient(img, w, h, orientation);
      src = c;
      w = c.width;
      h = c.height;
    }
    const scale = Math.min(1, MAX_WORKING / Math.max(w, h));
    const c = canvas(w * scale, h * scale);
    const x = ctx2d(c);
    x.fillStyle = "#fff"; // transparent PNGs → white paper
    x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, c.width, c.height);
    return { canvas: c, orientation, rotatedByExif: orientation > 1, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function rotate90(src: HTMLCanvasElement, turns: number): HTMLCanvasElement {
  const t = ((turns % 4) + 4) % 4;
  if (!t) return src;
  const swap = t % 2 === 1;
  const c = canvas(swap ? src.height : src.width, swap ? src.width : src.height);
  const x = ctx2d(c);
  x.translate(c.width / 2, c.height / 2);
  x.rotate((t * Math.PI) / 2);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

/* ---------------------------------------------------------------------------------------------- */
/* Geometry                                                                                       */
/* ---------------------------------------------------------------------------------------------- */

/** Largest centred rect of aspect `a` (w/h) inside w×h. */
export function centerCrop(w: number, h: number, a: number): Rect {
  if (w / h > a) {
    const cw = h * a;
    return { x: (w - cw) / 2, y: 0, width: cw, height: h };
  }
  const ch = w / a;
  return { x: 0, y: (h - ch) / 2, width: w, height: ch };
}

/** Re-shape an existing crop to a new aspect ratio around the same centre, staying inside the image. */
export function reaspect(r: Rect, a: number, W: number, H: number): Rect {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  let h = r.height;
  let w = h * a;
  if (w > W) {
    w = W;
    h = w / a;
  }
  if (h > H) {
    h = H;
    w = h * a;
  }
  const x = Math.min(Math.max(0, cx - w / 2), W - w);
  const y = Math.min(Math.max(0, cy - h / 2), H - h);
  return { x, y, width: w, height: h };
}

/** High-quality crop + resize (progressive halving avoids aliasing on big downscales). */
export function cropResize(src: HTMLCanvasElement, r: Rect, outW: number, outH: number): HTMLCanvasElement {
  let cur = canvas(r.width, r.height);
  ctx2d(cur).drawImage(src, r.x, r.y, r.width, r.height, 0, 0, cur.width, cur.height);
  while (cur.width / 2 >= outW && cur.height / 2 >= outH) {
    const half = canvas(cur.width / 2, cur.height / 2);
    const x = ctx2d(half);
    x.imageSmoothingQuality = "high";
    x.drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
  }
  const out = canvas(outW, outH);
  const x = ctx2d(out);
  x.imageSmoothingQuality = "high";
  x.drawImage(cur, 0, 0, outW, outH);
  return out;
}

/* ---------------------------------------------------------------------------------------------- */
/* Background whitening (photos)                                                                  */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Simple, fast background whitening: estimates the wall colour from the image border, flood-fills
 * connected similar pixels from the edges, feathers the mask, and blends those pixels to white.
 * Works well for plain walls / sheets; it is NOT AI background removal.
 * `strength` 0–100 maps to colour tolerance.
 */
export function whitenBackground(c: HTMLCanvasElement, strength = 50) {
  const w = c.width;
  const h = c.height;
  const x = ctx2d(c);
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  // border samples → median colour
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const sample = (i: number) => { rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
  const step = Math.max(1, Math.floor((w + h) / 400));
  for (let i = 0; i < w; i += step) { sample(i * 4); sample(((h - 1) * w + i) * 4); }
  for (let j = 0; j < h; j += step) { sample(j * w * 4); sample((j * w + w - 1) * 4); }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const br = med(rs), bg = med(gs), bb = med(bs);
  const tol = 18 + (strength / 100) * 70; // RGB distance
  const tol2 = tol * tol;
  const mask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qh = 0, qt = 0;
  const near = (p: number) => {
    const i = p * 4;
    const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
    // also accept "lighter than wall" pixels (light falloff)
    return dr * dr + dg * dg + db * db <= tol2;
  };
  const push = (p: number) => { if (!mask[p] && near(p)) { mask[p] = 1; queue[qt++] = p; } };
  for (let i = 0; i < w; i++) { push(i); push((h - 1) * w + i); }
  for (let j = 0; j < h; j++) { push(j * w); push(j * w + w - 1); }
  while (qh < qt) {
    const p = queue[qh++];
    const px = p % w;
    if (px > 0) push(p - 1);
    if (px < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  // feather: box blur of the mask (radius ~0.6% of size)
  const r = Math.max(1, Math.round(Math.min(w, h) * 0.006));
  const soft = boxBlur(mask, w, h, r);
  for (let p = 0; p < w * h; p++) {
    const a = soft[p];
    if (a <= 0) continue;
    const i = p * 4;
    d[i] = d[i] + (255 - d[i]) * a;
    d[i + 1] = d[i + 1] + (255 - d[i + 1]) * a;
    d[i + 2] = d[i + 2] + (255 - d[i + 2]) * a;
  }
  x.putImageData(img, 0, 0);
  return { wall: [br, bg, bb], coverage: qt / (w * h) };
}

/** Separable box blur of a 0/1 (or 0–255) mask → Float32 0..1 */
function boxBlur(m: Uint8Array | Float32Array, w: number, h: number, r: number, scale = 1): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    const row = y * w;
    for (let k = -r; k <= r; k++) s += m[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / n;
      s += m[row + Math.min(w - 1, x + r + 1)] - m[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = (s / n) * scale;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------- */
/* Ink cleanup (signature / thumb / declaration)                                                  */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Makes the paper pure white and the ink crisp, even with phone-camera shadows:
 * divides each pixel by a heavily blurred "paper" estimate (flat-field correction), then applies a
 * soft threshold. `level` 0–100: higher removes more grey (light strokes may vanish).
 * ink: "black" → pure dark ink; "keep" → keep the pen colour (blue stays blue).
 */
export function cleanInk(c: HTMLCanvasElement, level = 50, ink: "black" | "keep" = "black") {
  const w = c.width, h = c.height;
  const x = ctx2d(c);
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const gray = new Float32Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  // paper estimate: max-ish via blur of a dilated image (blur radius ~ 1/12 of the short side)
  const r = Math.max(4, Math.round(Math.min(w, h) / 12));
  const paper = boxBlur(gray, w, h, r);
  // brightest local paper should map to 255
  const cut = 0.55 + (level / 100) * 0.35; // ratio below which a pixel is ink
  const soft = 0.12;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const bgv = Math.max(paper[p], gray[p], 1);
    const ratio = gray[p] / bgv; // 1 = paper, lower = ink
    // ink amount 0..1 (smoothstep between cut and cut+soft)
    let t = (cut + soft - ratio) / soft;
    t = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    if (ink === "black") {
      const v = 255 * (1 - t) + 20 * t;
      d[i] = d[i + 1] = d[i + 2] = v;
    } else {
      // keep hue, deepen it, paper → white
      const k = Math.min(1, ratio);
      d[i] = 255 * (1 - t) + d[i] * k * 0.8 * t;
      d[i + 1] = 255 * (1 - t) + d[i + 1] * k * 0.8 * t;
      d[i + 2] = 255 * (1 - t) + d[i + 2] * k * 0.8 * t;
    }
  }
  x.putImageData(img, 0, 0);
}

/** Bounding box of "ink" (dark) pixels; null when the canvas is blank. */
export function inkBounds(c: HTMLCanvasElement, thr = 170): Rect | null {
  const w = c.width, h = c.height;
  const d = ctx2d(c).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 < thr) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  if (x1 < 0) return null;
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Fit `src` (contain) into outW×outH on white with a margin (fraction of the box). */
export function containOnWhite(src: HTMLCanvasElement, r: Rect, outW: number, outH: number, margin = 0.08): HTMLCanvasElement {
  const out = canvas(outW, outH);
  const x = ctx2d(out);
  x.fillStyle = "#fff";
  x.fillRect(0, 0, outW, outH);
  const bw = outW * (1 - 2 * margin);
  const bh = outH * (1 - 2 * margin);
  const s = Math.min(bw / r.width, bh / r.height);
  const dw = Math.max(1, Math.round(r.width * s));
  const dh = Math.max(1, Math.round(r.height * s));
  const part = cropResize(src, r, dw, dh);
  x.drawImage(part, Math.round((outW - dw) / 2), Math.round((outH - dh) / 2));
  return out;
}

/* ---------------------------------------------------------------------------------------------- */
/* Name + date strip                                                                              */
/* ---------------------------------------------------------------------------------------------- */

export const STRIP_RATIO = 0.18;

export function stripHeight(outH: number) {
  return Math.max(14, Math.round(outH * STRIP_RATIO));
}

/** Draws photo + white strip with name and date (two centred lines, auto-fitted font). */
export function withStrip(photo: HTMLCanvasElement, outW: number, outH: number, name: string, date: string): HTMLCanvasElement {
  const sh = stripHeight(outH);
  const out = canvas(outW, outH);
  const x = ctx2d(out);
  x.fillStyle = "#fff";
  x.fillRect(0, 0, outW, outH);
  x.drawImage(photo, 0, 0, outW, outH - sh);
  x.fillStyle = "#000";
  x.textAlign = "center";
  x.textBaseline = "middle";
  const lines = [name.trim(), date.trim()].filter(Boolean);
  const lh = sh / Math.max(1, lines.length);
  lines.forEach((t, i) => {
    let fs = Math.floor(lh * 0.72);
    const font = (s: number) => `600 ${s}px system-ui, "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif`;
    x.font = font(fs);
    while (fs > 6 && x.measureText(t).width > outW * 0.94) x.font = font(--fs);
    x.fillText(t, outW / 2, outH - sh + lh * (i + 0.5));
  });
  return out;
}

/* ---------------------------------------------------------------------------------------------- */
/* Encoding to a KB range                                                                         */
/* ---------------------------------------------------------------------------------------------- */

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Encoding failed"))), "image/jpeg", q));

export interface EncodeResult {
  bytes: Uint8Array;
  quality: number;
  padded: number; // bytes of padding added to reach the minimum
  width: number;
  height: number;
  ok: boolean;
  message?: string;
}

/**
 * Byte window that satisfies BOTH common definitions of "KB" used by exam portals:
 * at most maxKB × 1000 bytes and at least minKB × 1024 bytes, with a small safety margin.
 */
export function byteWindow(minKB: number | undefined, maxKB: number) {
  const hi = Math.floor(maxKB * 1000) - Math.min(512, Math.floor(maxKB * 1000 * 0.02));
  const lo = minKB ? Math.ceil(minKB * 1024) + Math.min(512, Math.ceil(minKB * 1024 * 0.02)) : 0;
  return lo <= hi ? { lo, hi } : { lo: Math.ceil(minKB! * 1024), hi: Math.floor(maxKB * 1000) };
}

export async function encodeToKB(c: HTMLCanvasElement, opts: { minKB?: number; maxKB: number; dpi?: number }): Promise<EncodeResult> {
  const { lo, hi } = byteWindow(opts.minKB, opts.maxKB);
  const enc = async (q: number) => {
    let b: Uint8Array = new Uint8Array(await (await toBlob(c, q)).arrayBuffer());
    if (opts.dpi) b = setJpegDpi(b, opts.dpi);
    return b;
  };
  const QMAX = 0.97;
  let best: Uint8Array = await enc(QMAX);
  let quality = QMAX;
  if (best.length > hi) {
    let a = 0.05, z = QMAX;
    let found: Uint8Array | null = null;
    let fq = 0.05;
    for (let k = 0; k < 9; k++) {
      const m = (a + z) / 2;
      const b = await enc(m);
      if (b.length <= hi) { found = b; fq = m; a = m; } else z = m;
    }
    if (!found) {
      const b = await enc(0.05);
      if (b.length <= hi) { found = b; fq = 0.05; }
    }
    if (!found) {
      return { bytes: best, quality: QMAX, padded: 0, width: c.width, height: c.height, ok: false, message: `Even at the lowest quality this image is larger than ${opts.maxKB} KB at ${c.width}×${c.height} px. Use smaller pixel dimensions.` };
    }
    best = found;
    quality = fq;
  }
  let padded = 0;
  if (best.length < lo) {
    // Max quality is still too small (tiny images / plain signatures) → add metadata padding.
    const target = Math.min(hi, lo + Math.round((hi - lo) * 0.2));
    const before = best.length;
    best = padJpeg(best, target);
    padded = best.length - before;
  }
  const size = jpegSize(best);
  return { bytes: best, quality, padded, width: size?.width ?? c.width, height: size?.height ?? c.height, ok: best.length <= Math.floor(opts.maxKB * 1000) && best.length >= Math.ceil((opts.minKB ?? 0) * 1024) };
}
