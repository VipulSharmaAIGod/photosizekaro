import Link from "next/link";
import { Faq } from "@/components/site/Faq";
import { CustomToolLazy } from "@/components/tool/ToolLoader";
import type { GenericPage } from "@/content/seo";
import { GROUPS, PRESETS } from "@/data/presets";

export function GenericPageView({ g }: { g: GenericPage }) {
  return (
    <article lang={g.lang === "hi" ? "hi" : undefined}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="text-[27px] font-extrabold leading-tight text-slate-900 sm:text-[38px]">{g.h1}</h1>
          {g.intro.map((t) => (
            <p key={t} className="mt-3 max-w-3xl text-[16px] text-slate-600">
              {t}
            </p>
          ))}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <CustomToolLazy defaults={g.defaults} />
      </div>
      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-[20px] font-extrabold">{g.lang === "hi" ? "परीक्षा के अनुसार तैयार प्रीसेट" : "Exam presets"}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {GROUPS.flatMap((gr) => PRESETS.filter((p) => p.group === gr)).map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[14px] font-semibold text-slate-700 hover:border-brand hover:text-brand">
              {p.name}
            </Link>
          ))}
        </div>
      </section>
      <div className="mt-10">
        <Faq items={g.faq} title={g.lang === "hi" ? "अक्सर पूछे जाने वाले सवाल" : undefined} lang={g.lang === "hi" ? "hi" : undefined} />
      </div>
    </article>
  );
}
