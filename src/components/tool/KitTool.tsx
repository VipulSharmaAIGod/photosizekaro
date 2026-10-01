"use client";
import { useState } from "react";
import { GROUPS, isResizable, PRESETS, type DocKind } from "@/data/presets";
import { setJpegDpi } from "@/lib/image/jpeg";
import { jpegToPdf } from "@/lib/image/pdf";
import { reaspect } from "@/lib/image/process";
import { cropAspect, defaultOpts, renderDoc, todayDDMMYYYY, type OutSpec } from "@/lib/image/render-doc";
import { drawSheet, SHEETS, type SheetLayout } from "@/lib/image/sheet";
import { makeZip } from "@/lib/image/zip";
import { MasterInput, type Master } from "./MasterInput";
import { Paywall } from "./Paywall";
import { useUnlock } from "./useUnlock";

interface Item {
  path: string;
  bytes: number;
  width: number;
  height: number;
  ok: boolean;
  spec: string;
}

const KIT_PRESETS = PRESETS.filter((p) => p.docs.some(isResizable));
const blobUrl = (b: Uint8Array, type: string) => URL.createObjectURL(new Blob([b as BlobPart], { type }));
const toJpeg = (c: HTMLCanvasElement, q = 0.92) => new Promise<Uint8Array>((res) => c.toBlob(async (b) => res(new Uint8Array(await b!.arrayBuffer())), "image/jpeg", q));

export function KitTool() {
  const unlock = useUnlock();
  const [masters, setMasters] = useState<Partial<Record<DocKind, Master>>>({});
  const [selected, setSelected] = useState<string[]>(["ssc-cgl", "ibps-po", "sbi-po", "rrb-ntpc", "neet-ug", "ctet"]);
  const [whiten, setWhiten] = useState(true);
  const [strip, setStrip] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayDDMMYYYY());
  const [busy, setBusy] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [zip, setZip] = useState<{ url: string; size: number } | null>(null);
  const [layout, setLayout] = useState<SheetLayout>("a4-30");
  const [sheet, setSheet] = useState<{ preview: string; file?: { url: string; name: string; size: number } } | null>(null);
  const [showPay, setShowPay] = useState(false);

  const setMaster = (k: DocKind) => (m: Master | null) => setMasters((s) => ({ ...s, [k]: m ?? undefined }));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function generate() {
    setBusy("Generating files…");
    setItems([]);
    setZip(null);
    const files: { name: string; data: Uint8Array }[] = [];
    const list: Item[] = [];
    const skip: string[] = [];
    try {
      for (const p of KIT_PRESETS.filter((x) => selected.includes(x.id))) {
        for (const d of p.docs) {
          if (!isResizable(d)) {
            skip.push(`${p.name} – ${d.label}: ${d.uploaded ? "limits not verified (use Custom size)" : "captured live on the portal"}`);
            continue;
          }
          if (d.kitSkip || d.kind === "fingers") {
            skip.push(`${p.name} – ${d.label}: ${d.kitSkip || "needs a separate scan"} — make it on the ${p.name} page`);
            continue;
          }
          const m = masters[d.kind];
          if (!m) {
            skip.push(`${p.name} – ${d.label}: upload a ${d.kind} above`);
            continue;
          }
          const out: OutSpec = { kind: d.kind, width: d.width, height: d.height, dpi: d.dpi, minKB: d.minKB, maxKB: d.maxKB };
          const o = { ...defaultOpts(d), autofit: d.kind !== "photo" };
          if (d.kind === "photo") {
            o.whiten = d.background === "white" && whiten;
            o.strip = !!d.dateNameStrip || strip;
            o.name = name;
            o.date = date;
          }
          const area = d.kind === "photo" ? reaspect(m.area, cropAspect(out, o.strip), m.canvas.width, m.canvas.height) : m.area;
          const r = await renderDoc(m.canvas, area, out, o);
          const path = `${p.id}/${d.fileName || `${p.id}-${d.id}`}.jpg`;
          files.push({ name: path, data: r.bytes });
          const okSize = r.bytes.length <= d.maxKB * 1000 && (!d.minKB || r.bytes.length >= d.minKB * 1024);
          list.push({ path, bytes: r.bytes.length, width: r.width, height: r.height, ok: r.ok && okSize && r.width === d.width && r.height === d.height, spec: `${d.width}×${d.height} px, ${d.kbNote || (d.minKB ? `${d.minKB}–${d.maxKB} KB` : `≤ ${d.maxKB} KB`)}` });
        }
      }
      const readme =
        `PhotoSizeKaro Exam Kit — generated ${new Date().toLocaleString("en-IN")}\r\n\r\n` +
        list.map((i) => `${i.path}\t${i.width}x${i.height}px\t${(i.bytes / 1024).toFixed(1)} KB\trequired ${i.spec}\t${i.ok ? "OK" : "CHECK"}`).join("\r\n") +
        `\r\n\r\nNot included:\r\n${skip.join("\r\n")}\r\n\r\nAlways re-check the latest official notification before uploading.\r\n`;
      files.push({ name: "README.txt", data: new TextEncoder().encode(readme) });
      const z = makeZip(files);
      setItems(list);
      setSkipped(skip);
      setZip({ url: blobUrl(z, "application/zip"), size: z.length });
    } finally {
      setBusy("");
    }
  }

  async function makeSheet() {
    const m = masters.photo;
    if (!m) return;
    setBusy("Building sheet…");
    try {
      const s = SHEETS[layout];
      const cell: OutSpec = { kind: "photo", width: s.cellW, height: s.cellH, maxKB: 5000 };
      const o = { ...defaultOpts({ kind: "photo", background: "white" }), whiten, strip, name, date };
      const r = await renderDoc(m.canvas, reaspect(m.area, cropAspect(cell, strip), m.canvas.width, m.canvas.height), cell, o);
      const locked = !unlock;
      const page = drawSheet(r.preview, layout, locked);
      const small = document.createElement("canvas");
      const k = 900 / Math.max(page.width, page.height);
      small.width = Math.round(page.width * k);
      small.height = Math.round(page.height * k);
      small.getContext("2d")!.drawImage(page, 0, 0, small.width, small.height);
      const preview = small.toDataURL("image/jpeg", 0.8);
      let file: { url: string; name: string; size: number } | undefined;
      if (!locked) {
        const jpg = setJpegDpi(await toJpeg(page, 0.92), 300);
        if (layout === "a4-30") {
          const pdf = jpegToPdf(jpg, s.mmW, s.mmH, "Passport photo sheet A4");
          file = { url: blobUrl(pdf, "application/pdf"), name: "passport-photos-A4.pdf", size: pdf.length };
        } else {
          file = { url: blobUrl(jpg, "image/jpeg"), name: layout === "postcard" ? "postcard-4x6.jpg" : "passport-photos-4x6.jpg", size: jpg.length };
        }
      }
      setSheet({ preview, file });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[20px] font-extrabold text-slate-900">1. Upload once</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <MasterInput id="photo" title="Photo" hint="Crop to head & shoulders; we re-frame it for every exam" aspect={3.5 / 4.5} onChange={setMaster("photo")} />
          <MasterInput id="signature" title="Signature" hint="Black ink on white paper" aspect={3} onChange={setMaster("signature")} />
          <MasterInput id="thumb" title="Left thumb impression (banking)" hint="Optional — IBPS/SBI" aspect={1} onChange={setMaster("thumb")} />
          <MasterInput id="declaration" title="Hand-written declaration (banking)" hint="Optional — IBPS/SBI" aspect={2} onChange={setMaster("declaration")} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[14px]">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={whiten} onChange={(e) => setWhiten(e.target.checked)} /> White background (where required)
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={strip} onChange={(e) => setStrip(e.target.checked)} /> Name &amp; date strip
          </label>
          {strip && (
            <>
              <input className="inp !w-40" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="inp !w-32" value={date} onChange={(e) => setDate(e.target.value)} />
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[20px] font-extrabold text-slate-900">2. Pick your exams</h2>
        <div className="mt-3 space-y-3">
          {GROUPS.map((g) => {
            const ps = KIT_PRESETS.filter((p) => p.group === g);
            if (!ps.length) return null;
            return (
              <div key={g}>
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{g}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {ps.map((p) => (
                    <label key={p.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-[14px] font-semibold ${selected.includes(p.id) ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                      <input type="checkbox" className="sr-only" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} data-testid={`kit-exam-${p.id}`} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={generate} disabled={!!busy || !Object.keys(masters).length || !selected.length} data-testid="kit-generate" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 text-[16px] font-bold text-white shadow disabled:opacity-50 sm:w-auto">
          {busy || `Generate files for ${selected.length} exam${selected.length === 1 ? "" : "s"}`}
        </button>
        {items.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white" data-testid="kit-results">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-2">File</th>
                  <th className="p-2">Output</th>
                  <th className="p-2">Required</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.path} className="border-t border-slate-100" data-path={i.path} data-bytes={i.bytes} data-width={i.width} data-height={i.height}>
                    <td className="p-2 font-mono">{i.path}</td>
                    <td className={`p-2 ${i.ok ? "text-emerald-700" : "text-red-700"}`}>
                      {i.ok ? "✓" : "!"} {i.width}×{i.height}, {(i.bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-2 text-slate-600">{i.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {skipped.length > 0 && (
              <details className="border-t border-slate-100 p-2 text-[12px] text-slate-600">
                <summary className="cursor-pointer font-semibold">{skipped.length} item(s) not included</summary>
                <ul className="mt-1 list-disc pl-5">
                  {skipped.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {zip &&
          (unlock ? (
            <a href={zip.url} download="exam-kit.zip" data-testid="kit-zip" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-5 text-[16px] font-bold text-white shadow">
              ⬇ Download exam-kit.zip ({(zip.size / 1024).toFixed(0)} KB)
            </a>
          ) : (
            <button type="button" onClick={() => setShowPay(true)} data-testid="kit-zip-locked" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 px-5 text-[16px] font-bold text-slate-900 shadow">
              🔒 Download all as ZIP — unlock Exam Kit
            </button>
          ))}
      </section>

      <section>
        <h2 className="text-[20px] font-extrabold text-slate-900">3. Print-ready photo sheet</h2>
        <p className="text-[14px] text-slate-600">For exam day, DV and counselling (SSC asks non-Aadhaar candidates to carry 2 photos; NEET asks for 6–8 passport + 4–6 postcard prints). Print at 100% / “Actual size”.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="inp !w-auto" value={layout} onChange={(e) => setLayout(e.target.value as SheetLayout)} data-testid="sheet-layout">
            {(Object.keys(SHEETS) as SheetLayout[]).map((k) => (
              <option key={k} value={k}>
                {SHEETS[k].label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-sec" disabled={!masters.photo || !!busy} onClick={makeSheet} data-testid="sheet-make">
            {sheet ? "Rebuild sheet" : "Build sheet"}
          </button>
        </div>
        {sheet && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,320px)_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sheet.preview} alt="Photo sheet preview" className="w-full rounded-lg border border-slate-200 shadow" data-testid="sheet-preview" />
            <div>
              {sheet.file ? (
                <a href={sheet.file.url} download={sheet.file.name} data-testid="sheet-download" className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-5 text-[16px] font-bold text-white shadow">
                  ⬇ {sheet.file.name} ({(sheet.file.size / 1024).toFixed(0)} KB)
                </a>
              ) : (
                <button type="button" onClick={() => setShowPay(true)} data-testid="sheet-locked" className="flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 px-5 text-[16px] font-bold text-slate-900 shadow">
                  🔒 Download print file — unlock Exam Kit
                </button>
              )}
              {!sheet.file && <p className="mt-2 text-[12px] text-slate-500">Preview is watermarked. After unlocking, tap “Rebuild sheet” to get the clean print file.</p>}
            </div>
          </div>
        )}
      </section>

      {(showPay || unlock) && (
        <section id="unlock">
          <Paywall unlock={unlock} />
        </section>
      )}
      {!showPay && !unlock && (
        <button type="button" className="text-[14px] font-semibold text-brand underline" onClick={() => setShowPay(true)} data-testid="show-paywall">
          Unlock Exam Kit / restore purchase
        </button>
      )}
    </div>
  );
}
