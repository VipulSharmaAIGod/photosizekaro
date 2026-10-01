"use client";
import { track } from "@/lib/analytics/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isResizable, PRESET_BY_ID, type DocSpec } from "@/data/presets";
import { DocTool, type ToolSpec } from "./DocTool";

/** All documents of one exam as tabs; live-captured docs show guidance instead of an uploader. */
export function ExamTool({ presetId }: { presetId: string }) {
  const p = PRESET_BY_ID[presetId];
  const docs = p.docs;
  const firstUsable = docs.find(isResizable) ?? docs[0];
  const [active, setActive] = useState(firstUsable.id);
  const doc = docs.find((d) => d.id === active) ?? docs[0];
  useEffect(() => {
    track("preset_select", { exam: presetId });
  }, [presetId]);
  return (
    <div id="tool" className="scroll-mt-20">
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={`${p.name} documents`}>
        {docs.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === active}
            data-testid={`tab-${d.id}`}
            onClick={() => setActive(d.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-semibold ${d.id === active ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            {d.label}
            {!d.uploaded && <span className="ml-1 text-[11px] opacity-80">(live)</span>}
          </button>
        ))}
      </div>
      {/* keep every resizer mounted so switching tabs never loses work */}
      {docs.map((d) => (
        <div key={d.id} hidden={d.id !== doc.id}>
          {isResizable(d) ? <DocTool spec={d as ToolSpec} fileName={d.fileName || `${p.id}-${d.id}`} examName={p.name} examId={p.id} /> : <InfoCard d={d} />}
        </div>
      ))}
    </div>
  );
}

function InfoCard({ d }: { d: DocSpec }) {
  const live = !d.uploaded;
  return (
    <div className={`rounded-2xl border p-4 ${live ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`} data-testid={`info-${d.id}`}>
      <h3 className="text-[17px] font-extrabold text-slate-900">
        {d.label} <span className="text-[13px] font-semibold text-slate-500" lang="hi">{d.labelHi}</span>
      </h3>
      {live ? (
        <p className="mt-1 text-[15px] font-semibold text-amber-900">
          Captured live by the official portal — there is nothing to resize or upload.{" "}
          <span lang="hi" className="font-normal">यह फोटो आवेदन के समय कैमरे से लाइव ली जाती है, अपलोड नहीं होती।</span>
        </p>
      ) : (
        <p className="mt-1 text-[15px] font-semibold text-slate-800">
          Official size limits could not be verified for this document. Use <Link href="/custom-size" className="text-brand underline">Custom size</Link> with the limits shown on the portal.
        </p>
      )}
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-700">
        {d.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {live && (
        <p className="mt-3 text-[14px] text-slate-700">
          Need printed photos for the exam day? Make a print-ready passport photo sheet in the <Link href="/exam-kit" className="font-semibold text-brand underline">Exam Kit</Link>.
        </p>
      )}
    </div>
  );
}
