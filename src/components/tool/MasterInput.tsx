"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { loadImageFile, rotate90, type Rect } from "@/lib/image/process";

export interface Master {
  canvas: HTMLCanvasElement;
  area: Rect;
}

/** Upload + crop once; the kit re-uses this crop for every exam's aspect ratio. */
export function MasterInput({ id, title, hint, aspect, onChange }: { id: string; title: string; hint: string; aspect: number; onChange: (m: Master | null) => void }) {
  const [src, setSrc] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [turns, setTurns] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!base) return;
    let alive = true;
    const c = rotate90(base, turns);
    c.toBlob((b) => {
      if (!alive || !b) return;
      const url = URL.createObjectURL(b);
      setSrc((o) => {
        if (o) URL.revokeObjectURL(o.url);
        return { canvas: c, url };
      });
    }, "image/jpeg", 0.9);
    return () => {
      alive = false;
    };
  }, [base, turns]);

  const done = useCallback(
    (_: Area, px: Area) => {
      if (src) onChange({ canvas: src.canvas, area: { x: px.x, y: px.y, width: px.width, height: px.height } });
    },
    [src, onChange],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold text-slate-900">{title}</p>
          <p className="text-[12px] text-slate-500">{hint}</p>
        </div>
        <div className="flex gap-1">
          {src && (
            <button type="button" className="btn-sec" onClick={() => setTurns((t) => t + 1)} aria-label="Rotate">
              ⟳
            </button>
          )}
          <button type="button" className="btn-sec" onClick={() => ref.current?.click()}>
            {src ? "Change" : "Choose"}
          </button>
          {src && (
            <button
              type="button"
              className="btn-sec"
              onClick={() => {
                setSrc(null);
                setBase(null);
                onChange(null);
              }}
              aria-label="Remove"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        data-testid={`kit-file-${id}`}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setErr("");
          try {
            const l = await loadImageFile(f);
            setTurns(0);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setBase(l.canvas);
          } catch (er) {
            setErr((er as Error).message);
          }
        }}
      />
      {err && <p className="mt-2 text-[13px] text-red-700">{err}</p>}
      {src && (
        <div className="relative mt-2 h-56 overflow-hidden rounded-xl bg-slate-800">
          <Cropper image={src.url} crop={crop} zoom={zoom} maxZoom={6} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={done} objectFit="contain" />
        </div>
      )}
    </div>
  );
}
