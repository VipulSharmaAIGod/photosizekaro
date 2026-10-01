"use client";
import { track } from "@/lib/analytics/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import type { DocSpec } from "@/data/presets";
import { byteWindow, loadImageFile, rotate90, type Rect } from "@/lib/image/process";
import { cropAspect, defaultOpts, isInkKind, renderDoc, type OutSpec, type RenderOpts } from "@/lib/image/render-doc";

export type ToolSpec = DocSpec & { width: number; height: number; maxKB: number };

interface Result {
  url: string;
  bytes: number;
  width: number;
  height: number;
  quality: number;
  padded: number;
  ok: boolean;
  message?: string;
}

const fmtKB = (b: number) => `${(b / 1024).toFixed(1)} KB`;

function canvasUrl(c: HTMLCanvasElement): Promise<string> {
  return new Promise((res) => c.toBlob((b) => res(URL.createObjectURL(b!)), "image/jpeg", 0.9));
}

export function DocTool({ spec, fileName, examName, examId }: { spec: ToolSpec; fileName: string; examName?: string; examId?: string }) {
  const out: OutSpec = useMemo(() => ({ kind: spec.kind, width: spec.width, height: spec.height, dpi: spec.dpi, minKB: spec.minKB, maxKB: spec.maxKB }), [spec]);
  const [opts, setOpts] = useState<RenderOpts>(() => defaultOpts(spec));
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [turns, setTurns] = useState(0);
  const [src, setSrc] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [exifNote, setExifNote] = useState("");
  const [error, setError] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Rect | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);
  const ink = isInkKind(spec.kind);
  const aspect = cropAspect(out, opts.strip);
  const set = (p: Partial<RenderOpts>) => setOpts((o) => ({ ...o, ...p }));

  // rotated source + object URL for the cropper
  useEffect(() => {
    if (!base) return;
    let alive = true;
    const c = rotate90(base, turns);
    canvasUrl(c).then((url) => {
      if (!alive) return URL.revokeObjectURL(url);
      setSrc((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { canvas: c, url };
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    });
    return () => {
      alive = false;
    };
  }, [base, turns]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    setResult(null);
    try {
      const l = await loadImageFile(f);
      setExifNote(l.rotatedByExif ? `Auto-rotated using the photo's EXIF orientation (${l.orientation}).` : "");
      setTurns(0);
      setArea(null);
      setBase(l.canvas);
      track(spec.kind === "photo" ? "process_photo" : "process_signature", { exam: examId || "custom", doc: spec.id, kind: spec.kind });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onCropComplete = useCallback((_: Area, px: Area) => setArea({ x: px.x, y: px.y, width: px.width, height: px.height }), []);

  // (re)render the output whenever the crop or options change
  useEffect(() => {
    if (!src || !area || area.width < 2 || area.height < 2) return;
    const id = ++runId.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await renderDoc(src.canvas, area, out, opts);
        if (id !== runId.current) return;
        const url = URL.createObjectURL(new Blob([r.bytes as BlobPart], { type: "image/jpeg" }));
        setResult((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { url, bytes: r.bytes.length, width: r.width, height: r.height, quality: r.quality, padded: r.padded, ok: r.ok, message: r.message };
        });
      } catch (e) {
        if (id === runId.current) setError((e as Error).message);
      } finally {
        if (id === runId.current) setBusy(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [src, area, out, opts]);

  const win = byteWindow(spec.minKB, spec.maxKB);
  const sizeOk = !!result && result.bytes <= spec.maxKB * 1000 && (!spec.minKB || result.bytes >= spec.minKB * 1024);
  const dimOk = !!result && result.width === spec.width && result.height === spec.height;
  const rangeOk = !spec.pxRange || (!!result && result.width >= spec.pxRange.minW && result.width <= spec.pxRange.maxW && result.height >= spec.pxRange.minH && result.height <= spec.pxRange.maxH);
  const dl = `${fileName}.jpg`;
  const kbLabel = spec.kbNote || (spec.minKB ? `${spec.minKB}–${spec.maxKB} KB` : `≤ ${spec.maxKB} KB`);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5" data-testid={`tool-${spec.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-extrabold text-slate-900">
          {examName ? `${examName} – ` : ""}
          {spec.label}
          <span className="ml-2 text-[13px] font-semibold text-slate-500" lang="hi">
            {spec.labelHi}
          </span>
        </h3>
        <p className="text-[13px] font-semibold text-brand">
          {spec.width} × {spec.height} px · {kbLabel} · JPG{spec.dpi ? ` · ${spec.dpi} DPI` : ""}
        </p>
      </div>

      {!src && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex min-h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand/40 bg-brand/5 px-4 py-6 text-center hover:bg-brand/10"
        >
          <span className="text-[17px] font-bold text-brand">{spec.kind === "photo" ? "📷 Choose or take photo" : spec.kind === "signature" ? "✍️ Choose signature photo/scan" : "📄 Choose image"}</span>
          <span className="mt-1 text-[13px] text-slate-600" lang="hi">
            {spec.kind === "photo" ? "फोटो चुनें या कैमरा से खींचें" : "सफेद कागज़ पर काली स्याही से — फोटो चुनें"}
          </span>
          <span className="mt-2 text-[12px] text-slate-500">JPG / PNG / WEBP · processed on your device, never uploaded</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" data-testid={`file-${spec.id}`} onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-[14px] text-red-800">{error}</p>}

      {src && (
        <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="relative h-[300px] overflow-hidden rounded-xl bg-slate-800 sm:h-[380px]">
              <Cropper
                image={src.url}
                crop={crop}
                zoom={zoom}
                minZoom={1}
                maxZoom={6}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                showGrid
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex flex-1 items-center gap-2 text-[13px] text-slate-600">
                Zoom
                <input type="range" min={1} max={6} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--color-brand)]" aria-label="Zoom" />
              </label>
              <button type="button" className="btn-sec" onClick={() => setTurns((t) => t - 1)} aria-label="Rotate left">
                ⟲
              </button>
              <button type="button" className="btn-sec" onClick={() => setTurns((t) => t + 1)} aria-label="Rotate right" data-testid={`rotate-${spec.id}`}>
                ⟳
              </button>
              <button type="button" className="btn-sec" onClick={() => inputRef.current?.click()}>
                Change
              </button>
            </div>
            {exifNote && <p className="mt-1 text-[12px] text-emerald-700" data-testid={`exif-${spec.id}`}>{exifNote}</p>}
            <p className="mt-1 text-[12px] text-slate-500">Drag to move, pinch or slide to zoom. The frame is locked to the exact {spec.width}:{spec.height} shape{opts.strip ? " (minus the name/date strip)" : ""}.</p>

            <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3 text-[14px]">
              {!ink && (
                <>
                  <label className="flex items-center gap-2 font-semibold">
                    <input type="checkbox" checked={opts.whiten} onChange={(e) => set({ whiten: e.target.checked })} data-testid={`whiten-${spec.id}`} /> White background
                    <span className="font-normal text-slate-500">(plain walls work best)</span>
                  </label>
                  {opts.whiten && (
                    <label className="flex items-center gap-2 text-slate-600">
                      Strength
                      <input type="range" min={0} max={100} value={opts.whitenStrength} onChange={(e) => set({ whitenStrength: Number(e.target.value) })} className="flex-1" />
                    </label>
                  )}
                  {spec.background === "keep" && <p className="text-[12px] text-amber-800">This exam asks for a solid-colour background — whitening is off by default.</p>}
                  <label className="flex items-center gap-2 font-semibold">
                    <input type="checkbox" checked={opts.strip} onChange={(e) => set({ strip: e.target.checked })} data-testid={`strip-${spec.id}`} /> Name &amp; date under photo
                  </label>
                  {opts.strip && (
                    <div className="grid grid-cols-2 gap-2">
                      <input className="inp" placeholder="Your name" value={opts.name} onChange={(e) => set({ name: e.target.value })} data-testid={`strip-name-${spec.id}`} />
                      <input className="inp" placeholder="DD-MM-YYYY" value={opts.date} onChange={(e) => set({ date: e.target.value })} />
                    </div>
                  )}
                </>
              )}
              {ink && (
                <>
                  <label className="flex items-center gap-2 font-semibold">
                    <input type="checkbox" checked={opts.clean} onChange={(e) => set({ clean: e.target.checked })} data-testid={`clean-${spec.id}`} /> Clean paper to pure white
                  </label>
                  {opts.clean && (
                    <>
                      <label className="flex items-center gap-2 text-slate-600">
                        Light
                        <input type="range" min={0} max={100} value={opts.level} onChange={(e) => set({ level: Number(e.target.value) })} className="flex-1" aria-label="Cleanup strength" />
                        Strong
                      </label>
                      <label className="flex items-center gap-2 text-slate-600">
                        Ink
                        <select className="inp !w-auto" value={opts.ink} onChange={(e) => set({ ink: e.target.value as RenderOpts["ink"] })}>
                          <option value="black">Make it black</option>
                          <option value="keep">Keep pen colour (blue)</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label className="flex items-center gap-2 font-semibold">
                    <input type="checkbox" checked={opts.autofit} onChange={(e) => set({ autofit: e.target.checked })} /> Auto-fit {spec.kind === "signature" ? "signature" : "content"} in the frame
                  </label>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-3">
              {result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.url} alt={`${spec.label} output preview`} width={result.width} height={result.height} className="h-auto max-w-full border border-slate-300 bg-white [image-rendering:auto]" style={{ width: Math.round(result.width * Math.min(320 / result.width, 288 / result.height, result.width < 300 ? 1.5 : 1)) }} />
              ) : (
                <span className="text-[13px] text-slate-500">{busy ? "Processing…" : "Adjust the crop to see your file"}</span>
              )}
            </div>
            {result && (
              <div
                className="mt-3 space-y-1.5 text-[14px]"
                data-testid={`result-${spec.id}`}
                data-width={result.width}
                data-height={result.height}
                data-bytes={result.bytes}
                data-quality={result.quality.toFixed(3)}
                data-padded={result.padded}
                data-busy={String(busy)}
                data-ok={String(sizeOk && dimOk && rangeOk)}
              >
                <Check ok={dimOk && rangeOk} text={`${result.width} × ${result.height} px${spec.pxRange ? ` (allowed ${spec.pxRange.minW}–${spec.pxRange.maxW} × ${spec.pxRange.minH}–${spec.pxRange.maxH})` : ""}`} />
                <Check ok={sizeOk} text={`${fmtKB(result.bytes)} (${result.bytes.toLocaleString("en-IN")} bytes) · required ${kbLabel}`} />
                <Check ok text={`JPG${spec.dpi ? ` · ${spec.dpi} DPI = ${((spec.width / spec.dpi) * 2.54).toFixed(1)} × ${((spec.height / spec.dpi) * 2.54).toFixed(1)} cm` : ""} · quality ${Math.round(result.quality * 100)}%`} />
                {result.padded > 0 && <p className="text-[12px] text-slate-500">Image was smaller than {spec.minKB} KB even at top quality, so {fmtKB(result.padded)} of blank metadata was added (pixels unchanged) to meet the minimum.</p>}
                {result.message && <p className="text-[13px] text-red-700">{result.message}</p>}
                <a
                  href={result.url}
                  download={dl}
                  onClick={() => track("download", { exam: examId || "custom", doc: spec.id, kind: spec.kind, ok: sizeOk && dimOk && rangeOk, kb: Math.round(result.bytes / 102.4) / 10 })}
                  data-testid={`dl-${spec.id}`}
                  className={`mt-2 flex min-h-12 items-center justify-center rounded-xl px-5 text-[16px] font-bold text-white shadow ${busy ? "pointer-events-none bg-slate-400" : "bg-brand hover:bg-brand-dark"}`}
                >
                  ⬇ Download {dl}
                </a>
                <p className="text-center text-[12px] text-slate-500">Free · no watermark · target window {Math.round(win.lo / 102.4) / 10}–{Math.round(win.hi / 102.4) / 10} KB</p>
              </div>
            )}
          </div>
        </div>
      )}
      {spec.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-slate-600">
          {spec.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`flex items-start gap-2 ${ok ? "text-emerald-800" : "text-red-700"}`}>
      <span aria-hidden className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-bold text-white ${ok ? "bg-emerald-600" : "bg-red-600"}`}>
        {ok ? "✓" : "!"}
      </span>
      {text}
    </p>
  );
}

