import { JsonLd } from "./JsonLd";

export type FaqItem = { q: string; a: string };

export function Faq({ items, title = "Frequently asked questions", lang }: { items: FaqItem[]; title?: string; lang?: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4" lang={lang}>
      <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
      <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {items.map((f) => (
          <details key={f.q} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold text-slate-900">
              {f.q}
              <span className="text-xl text-brand transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </section>
  );
}
