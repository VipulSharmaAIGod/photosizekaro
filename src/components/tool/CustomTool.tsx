"use client";
import { useMemo, useState } from "react";
import type { DocKind } from "@/data/presets";
import { DocTool, type ToolSpec } from "./DocTool";

type Unit = "px" | "cm" | "mm" | "in";
const toPx = (v: number, u: Unit, dpi: number) => Math.round(u === "px" ? v : u === "cm" ? (v / 2.54) * dpi : u === "mm" ? (v / 25.4) * dpi : v * dpi);

export interface CustomDefaults {
  kind?: DocKind;
  w?: number;
  h?: number;
  unit?: Unit;
  dpi?: number;
  minKB?: number;
  maxKB?: number;
}

/** Any size: px / cm / mm / inch at a DPI, with a KB window. */
export function CustomTool({ defaults = {} }: { defaults?: CustomDefaults }) {
  const [kind, setKind] = useState<DocKind>(defaults.kind ?? "photo");
  const [unit, setUnit] = useState<Unit>(defaults.unit ?? "cm");
  const [w, setW] = useState(String(defaults.w ?? 3.5));
  const [h, setH] = useState(String(defaults.h ?? 4.5));
  const [dpi, setDpi] = useState(String(defaults.dpi ?? 200));
  const [minKB, setMinKB] = useState(defaults.minKB != null ? String(defaults.minKB) : "20");
  const [maxKB, setMaxKB] = useState(String(defaults.maxKB ?? 50));

  const spec = useMemo<ToolSpec | { error: string }>(() => {
    const d = Math.min(1200, Math.max(50, Number(dpi) || 200));
    const W = toPx(Number(w), unit, d);
    const H = toPx(Number(h), unit, d);
    const lo = minKB.trim() === "" ? undefined : Number(minKB);
    const hi = Number(maxKB);
    if (!(W >= 16 && H >= 16 && W <= 6000 && H <= 6000)) return { error: "Width and height must be between 16 and 6000 pixels." };
    if (!(hi > 0) || (lo != null && !(lo >= 0 && lo < hi))) return { error: "Enter a valid KB range (min must be less than max)." };
    return {
      id: "custom",
      kind,
      label: kind === "photo" ? "Custom photo" : kind === "signature" ? "Custom signature" : "Custom document",
      labelHi: kind === "photo" ? "फोटो" : "हस्ताक्षर / दस्तावेज़",
      uploaded: true,
      width: W,
      height: H,
      dpi: d,
      minKB: lo || undefined,
      maxKB: hi,
      background: kind === "photo" ? "light" : "white",
      cleanup: kind !== "photo",
      notes: [],
    };
  }, [kind, unit, w, h, dpi, minKB, maxKB]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4" data-testid="custom-form">
        <label className="lbl col-span-2 sm:col-span-4">
          Type
          <select className="inp" value={kind} onChange={(e) => setKind(e.target.value as DocKind)} data-testid="custom-kind">
            <option value="photo">Photo</option>
            <option value="signature">Signature</option>
            <option value="thumb">Thumb impression</option>
            <option value="declaration">Declaration / document</option>
          </select>
        </label>
        <label className="lbl">
          Width
          <input className="inp" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} data-testid="custom-w" />
        </label>
        <label className="lbl">
          Height
          <input className="inp" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} data-testid="custom-h" />
        </label>
        <label className="lbl">
          Unit
          <select className="inp" value={unit} onChange={(e) => setUnit(e.target.value as Unit)} data-testid="custom-unit">
            <option value="px">pixels</option>
            <option value="cm">cm</option>
            <option value="mm">mm</option>
            <option value="in">inch</option>
          </select>
        </label>
        <label className="lbl">
          DPI
          <input className="inp" inputMode="numeric" value={dpi} onChange={(e) => setDpi(e.target.value)} data-testid="custom-dpi" />
        </label>
        <label className="lbl">
          Min KB
          <input className="inp" inputMode="decimal" value={minKB} onChange={(e) => setMinKB(e.target.value)} placeholder="none" data-testid="custom-min" />
        </label>
        <label className="lbl">
          Max KB
          <input className="inp" inputMode="decimal" value={maxKB} onChange={(e) => setMaxKB(e.target.value)} data-testid="custom-max" />
        </label>
        <p className="col-span-2 self-end text-[13px] text-slate-600" data-testid="custom-px">
          {"error" in spec ? <span className="text-red-700">{spec.error}</span> : <>Output: <b>{spec.width} × {spec.height} px</b> at {spec.dpi} DPI</>}
        </p>
      </div>
      {!("error" in spec) && <DocTool key={spec.kind} spec={spec} fileName={`${spec.kind}-${spec.width}x${spec.height}`} />}
    </div>
  );
}
