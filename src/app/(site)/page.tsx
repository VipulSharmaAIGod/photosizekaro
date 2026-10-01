import Link from "next/link";
import { AdSlot } from "@/components/site/AdSlot";
import { Faq, type FaqItem } from "@/components/site/Faq";
import { JsonLd } from "@/components/site/JsonLd";
import { StatusBadge } from "@/components/seo/StatusBadge";
import { GROUPS, isResizable, PRESETS } from "@/data/presets";
import { PRICES, rupees } from "@/lib/pricing";
import { BRAND, SITE_URL } from "@/lib/site";

const FAQS: FaqItem[] = [
  { q: "Is it really free?", a: `Yes. Every exam preset makes a compliant photo and signature for free, with no watermark and no login. The optional ${rupees(PRICES.kit.amountPaise)} Exam Kit only adds batch ZIPs for many exams and print-ready passport photo sheets.` },
  { q: "Are my photos uploaded anywhere?", a: "No. Cropping, background whitening, signature cleanup and compression all run inside your browser. Your photo never leaves your phone or computer." },
  { q: "Do I still need to upload a photo for SSC?", a: "No. SSC (CGL, CHSL, MTS, GD, CPO, JE, Stenographer) now captures your photo live through the webcam or the mySSC app. You only upload the signature (JPEG, 10–20 KB, about 6.0 × 2.0 cm)." },
  { q: "How do you hit the exact KB range?", a: "We resize to the exact pixels and then binary-search the JPEG quality so the file lands just under the maximum. If a tiny image is still below the minimum at top quality, we add blank metadata so it meets the minimum without changing any pixel." },
  { q: "Where do the sizes come from?", a: "From the official notifications and portal instructions linked on each exam page, with the date we last checked them. Presets we could not confirm officially are clearly marked ‘Unverified’." },
  { q: "फोटो और सिग्नेचर का साइज कैसे कम करें?", a: "अपनी परीक्षा चुनें, फोटो चुनें, फ्रेम में सेट करें — टूल अपने आप सही पिक्सल और KB में JPG बना देगा। सब कुछ आपके फोन में ही होता है।" },
];

export default function Home() {
  const verified = PRESETS.filter((p) => p.status === "verified").length;
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: `${BRAND} – Exam Photo & Signature Resizer`,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web, Android, iOS",
            url: SITE_URL,
            inLanguage: ["en-IN", "hi-IN"],
            description: "Free in-browser photo and signature resizer with presets for Indian government exams.",
            offers: [
              { "@type": "Offer", price: "0", priceCurrency: "INR", name: "Free compliant downloads" },
              { "@type": "Offer", price: String(PRICES.kit.amountPaise / 100), priceCurrency: "INR", name: "Exam Kit" },
            ],
          },
          { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: SITE_URL },
        ]}
      />
      <section className="bg-gradient-to-b from-white to-[#f6f8fc]">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:pt-14">
          <p className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-[13px] font-bold text-brand">Free · No login · Photos never leave your phone</p>
          <h1 className="mt-4 text-[31px] font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-[48px]">
            Exam photo &amp; signature resizer — <span className="text-brand">exact pixels, exact KB</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">
            Pick your exam, choose a photo, tap download. Presets for SSC, UPSC, IBPS, SBI, RRB, NEET, JEE, CUET, GATE, CTET and state PSCs — built from the official notifications.
          </p>
          <p className="mt-2 text-[16px] text-slate-600" lang="hi">
            सरकारी परीक्षा फॉर्म के लिए फोटो और सिग्नेचर सही साइज़ और KB में — मुफ्त, मोबाइल पर।
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#exams" className="flex min-h-12 items-center rounded-xl bg-brand px-6 text-[16px] font-bold text-white shadow hover:bg-brand-dark">
              Choose your exam ↓
            </a>
            <Link href="/custom-size" className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 text-[16px] font-bold text-slate-800">
              Custom size
            </Link>
          </div>
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-950" data-testid="ssc-callout">
            <b>SSC applicants:</b> your photo is now captured <b>live by webcam / mySSC app</b> — don&apos;t resize a photo for SSC. You only upload the <b>signature (JPEG 10–20 KB, ~6 × 2 cm)</b>.{" "}
            <Link href="/ssc-cgl-photo-signature-size" className="font-semibold text-brand underline">
              SSC signature tool →
            </Link>
          </div>
        </div>
      </section>

      <section id="exams" className="mx-auto max-w-6xl scroll-mt-16 px-4">
        <h2 className="text-[24px] font-extrabold text-slate-900">Choose your exam</h2>
        <p className="text-[14px] text-slate-600">
          {PRESETS.length} presets · {verified} verified from the exam&apos;s own current notice · last checked 1 Oct 2026
        </p>
        <div className="mt-4 space-y-6">
          {GROUPS.map((g) => (
            <div key={g}>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{g}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {PRESETS.filter((p) => p.group === g).map((p) => {
                  const up = p.docs.filter(isResizable);
                  return (
                    <Link key={p.slug} href={`/${p.slug}`} data-testid={`exam-${p.id}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow">
                      <span className="block text-[16px] font-extrabold text-slate-900">{p.name}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">{up.length ? up.map((d) => d.label.replace(/ \(.*\)/, "")).join(" · ") : "Info only"}</span>
                      <span className="mt-1.5 block">
                        <StatusBadge status={p.status} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <h2 className="text-[24px] font-extrabold text-slate-900">What it does</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Exact size", "Crop frame locked to the exam's shape, resized to the exact pixels, DPI written in the file (cm-correct)."],
            ["Exact KB", "Automatic JPEG quality search to land inside the KB window — e.g. 20–50 KB or 10–20 KB."],
            ["Clean images", "Auto-rotate (EXIF), whiten plain backgrounds, clean signature paper to pure white, name & date strip."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[16px] font-extrabold">{t}</p>
              <p className="mt-1 text-[14px] text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-brand p-5 text-white">
          <p className="text-[18px] font-extrabold">Applying to several exams? Exam Kit · {rupees(PRICES.kit.amountPaise)}</p>
          <p className="mt-1 text-[14px] opacity-90">One upload → a ZIP for every exam you pick, plus print-ready passport photo sheets (A4 PDF / 4×6) for exam day.</p>
          <Link href="/exam-kit" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-saffron px-5 font-bold text-slate-900">
            Open Exam Kit →
          </Link>
        </div>
      </section>
      <AdSlot id="home-mid" />
      <div className="mt-12">
        <Faq items={FAQS} />
      </div>
    </>
  );
}
