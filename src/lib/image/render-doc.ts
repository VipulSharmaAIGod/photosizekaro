"use client";
import type { DocKind } from "@/data/presets";
import { cleanInk, containOnWhite, cropResize, encodeToKB, inkBounds, stripHeight, whitenBackground, withStrip, type EncodeResult, type Rect } from "./process";

export interface OutSpec {
  kind: DocKind;
  width: number;
  height: number;
  dpi?: number;
  minKB?: number;
  maxKB: number;
}

export interface RenderOpts {
  whiten: boolean;
  whitenStrength: number;
  strip: boolean;
  name: string;
  date: string;
  clean: boolean;
  level: number;
  ink: "black" | "keep";
  autofit: boolean;
}

export const isInkKind = (k: DocKind) => k !== "photo";

/** Aspect ratio (w/h) of the area the user must crop for this output. */
export function cropAspect(s: OutSpec, strip: boolean) {
  const h = s.kind === "photo" && strip ? s.height - stripHeight(s.height) : s.height;
  return s.width / h;
}

export function defaultOpts(s: { kind: DocKind; background?: string; cleanup?: boolean; dateNameStrip?: boolean }): RenderOpts {
  return {
    whiten: s.kind === "photo" && s.background === "white",
    whitenStrength: 45,
    strip: !!s.dateNameStrip,
    name: "",
    date: todayDDMMYYYY(),
    clean: s.cleanup ?? isInkKind(s.kind),
    level: 50,
    ink: "black",
    autofit: s.kind === "signature",
  };
}

export function todayDDMMYYYY() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

export interface Rendered extends EncodeResult {
  preview: HTMLCanvasElement;
}

/** Full pipeline for one output file from a source canvas + crop area (in source pixels). */
export async function renderDoc(src: HTMLCanvasElement, area: Rect, s: OutSpec, o: RenderOpts): Promise<Rendered> {
  const W = s.width;
  const H = s.height;
  let c: HTMLCanvasElement;
  if (s.kind === "photo") {
    const ph = o.strip ? H - stripHeight(H) : H;
    // whiten at ≤2× output for quality, then downscale to exact size
    const ww = Math.max(W, Math.min(Math.round(area.width), W * 2));
    const wh = Math.round((ww * ph) / W);
    c = cropResize(src, area, ww, wh);
    if (o.whiten) whitenBackground(c, o.whitenStrength);
    c = cropResize(c, { x: 0, y: 0, width: c.width, height: c.height }, W, ph);
    if (o.strip) c = withStrip(c, W, H, o.name, o.date);
  } else {
    // ink documents: clean at a working resolution (longest side ≤ 1600, ≥ output)
    const scale = Math.min(1, 1600 / Math.max(area.width, area.height));
    const ww = Math.max(W, Math.round(area.width * scale));
    const wh = Math.max(1, Math.round((ww * area.height) / area.width));
    c = cropResize(src, area, ww, wh);
    if (o.clean) cleanInk(c, o.level, o.ink);
    const b = o.autofit ? inkBounds(c, o.ink === "keep" ? 200 : 170) : null;
    if (b && b.width > 4 && b.height > 4) {
      const pad = Math.round(Math.max(b.width, b.height) * 0.02);
      const r: Rect = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(c.width - Math.max(0, b.x - pad), b.width + 2 * pad), height: Math.min(c.height - Math.max(0, b.y - pad), b.height + 2 * pad) };
      c = containOnWhite(c, r, W, H, s.kind === "declaration" ? 0.04 : 0.08);
    } else {
      c = cropResize(c, { x: 0, y: 0, width: c.width, height: c.height }, W, H);
    }
  }
  const enc = await encodeToKB(c, { minKB: s.minKB, maxKB: s.maxKB, dpi: s.dpi });
  return { ...enc, preview: c };
}
