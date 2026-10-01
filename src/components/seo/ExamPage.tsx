import Link from "next/link";
import { AdSlot } from "@/components/site/AdSlot";
import { Faq } from "@/components/site/Faq";
import { JsonLd } from "@/components/site/JsonLd";
import { ExamToolLazy } from "@/components/tool/ToolLoader";
import { examH1, examSteps, hindiSummary, YEAR } from "@/content/seo";
import { isResizable, kbText, PRESETS, type ExamPreset } from "@/data/presets";
import { BRAND, SITE_URL } from "@/lib/site";
import { StatusBadge } from "./StatusBadge";

const fmtDate = (iso: string) => new Date(iso + "T00:00:00+05:30").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export function ExamPage({ p }: { p: ExamPreset }) {
  const steps = examSteps(p);
  const related = PRESETS.filter((x) => x.group === p.group && x.id !== p.id);
  const faq = [
    ...(p.faq ?? []),
    { q: "Are my photo and signature uploaded to your server?", a: `No. ${BRAND} processes images entirely in your browser. Nothing is uploaded, stored or shared.` },
    { q: "Is this the official website?", a: `No. ${BRAND} is an independent free tool. The sizes come from the official notification linked on this page (last checked ${fmtDate(p.lastVerified)}); always re-check the current notification before you apply.` },
  ];
  const live = p.docs.filter((d) => !d.uploaded);
  return (
    <article>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: BRAND, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: p.group, item: `${SITE_URL}/#exams` },
              { "@type": "ListItem", position: 3, name: examH1(p), item: `${SITE_URL}/${p.slug}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: `How to resize your ${p.name} photo and signature`,
            totalTime: "PT2M",
            tool: [{ "@type": "HowToTool", name: "Phone or computer with a browser" }],
            step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
          },
        ]}
      />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <p className="text-[13px] font-bold uppercase tracking-wider text-brand">
            {p.body} · {p.cycle}
          </p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight text-slate-900 sm:text-[38px]">{examH1(p)}</h1>
          <p className="mt-1 text-[16px] font-semibold text-slate-600" lang="hi">
            {p.nameHi} फोटो और सिग्नेचर साइज {YEAR}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
            <StatusBadge status={p.status} />
            <span>Last verified {fmtDate(p.lastVerified)}</span>
            <a href="#sources" className="text-brand underline">
              Sources
            </a>
          </div>
          <ul className="mt-4 space-y-1.5 text-[15px] text-slate-800">
            {p.highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-brand">•</span>
                {h}
              </li>
            ))}
          </ul>
          {p.status === "unverified" && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[14px] text-amber-900" data-testid="unverified-warning">
              ⚠ We could not confirm these limits in an official {p.name} document. Check the limits printed on the application portal before uploading.
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <ExamToolLazy presetId={p.id} />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1.4fr_1fr]">
        <div className="prose-x min-w-0">
          <h2>{p.name} upload specifications</h2>
          <div className="overflow-x-auto">
            <table data-testid="spec-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Dimensions</th>
                  <th>File size</th>
                  <th>Format</th>
                </tr>
              </thead>
              <tbody>
                {p.docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <b>{d.label}</b>
                      <br />
                      <span lang="hi">{d.labelHi}</span>
                    </td>
                    <td>{!d.uploaded ? "Captured live (webcam / phone)" : d.dimText || (isResizable(d) ? `${d.width} × ${d.height} px` : "Not published")}{isResizable(d) && d.dimText && !d.dimText.includes(`${d.width} × ${d.height}`) ? ` — our output: ${d.width} × ${d.height} px` : ""}</td>
                    <td>{d.uploaded ? kbText(d) : "—"}</td>
                    <td>{d.uploaded ? "JPG / JPEG" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {live.length > 0 && (
            <>
              <h2>Live photo capture — what it means for you</h2>
              <p>
                {p.name} captures {live.map((d) => d.label.toLowerCase().replace(" (captured live)", "")).join(" and ")} live through your webcam or phone while you fill the form, so there is no photo file to resize.
                Sit in good light in front of a plain wall, keep the camera at eye level, remove cap/mask/spectacles and look straight at the camera.
                {p.group === "SSC" && " Candidates who did not complete Aadhaar authentication must still carry two recent passport-size colour photographs to the exam centre."}
              </p>
            </>
          )}

          <h2>How to make your {p.name} files</h2>
          <ol>
            {steps.map((s) => (
              <li key={s.name}>
                <b>{s.name}.</b> {s.text}
              </li>
            ))}
          </ol>

          <h2 lang="hi">हिंदी में: {p.nameHi} फोटो/सिग्नेचर साइज</h2>
          <ul lang="hi">
            {hindiSummary(p).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <h2 id="sources">Official sources</h2>
          <ul>
            {p.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener nofollow">
                  {s.title}
                </a>{" "}
                {s.official ? "(official)" : "(copy / secondary)"}
                {s.ref ? ` — ${s.ref}` : ""}
                {s.note ? `. ${s.note}` : ""}
              </li>
            ))}
          </ul>
          <p>
            Last verified: <b>{fmtDate(p.lastVerified)}</b>. Commissions change rules between cycles — the current notification always wins.
          </p>
        </div>
        <aside className="space-y-4 md:pt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[15px] font-bold">Applying to many exams?</p>
            <p className="mt-1 text-[14px] text-slate-600">The Exam Kit makes every exam&apos;s photo &amp; signature in one tap (ZIP) plus print-ready passport photo sheets.</p>
            <Link href="/exam-kit" className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 font-bold text-white">
              Open Exam Kit →
            </Link>
          </div>
          {related.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[15px] font-bold">More {p.group} presets</p>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/${r.slug}`} className="text-brand hover:underline">
                      {r.name} photo &amp; signature size
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <AdSlot id={`exam-${p.id}`} />
      <div className="mt-10">
        <Faq items={faq} />
      </div>
    </article>
  );
}
