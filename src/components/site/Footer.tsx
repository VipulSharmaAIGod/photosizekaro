import Link from "next/link";
import { PRESETS } from "@/data/presets";
import { BRAND, OWNER } from "@/lib/site";
import { LogoMark } from "./Logo";

const LEGAL = [
  ["/about", "About us"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact us"],
  ["/privacy-policy", "Privacy policy"],
  ["/terms", "Terms & conditions"],
  ["/refund-policy", "Refund & cancellation"],
  ["/shipping-policy", "Delivery policy"],
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_2fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-[17px] font-extrabold">{BRAND}</span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
            Free exam photo &amp; signature resizer for Indian government exams. Exact pixels, exact KB. Your photos never leave your phone.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">Not affiliated with SSC, UPSC, IBPS, SBI, RRB, NTA, CBSE, IIT or any commission. Always re-check the latest official notification.</p>
        </div>
        <nav aria-label="Exam presets">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Exam photo &amp; signature size</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
            {PRESETS.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="text-slate-700 hover:text-brand">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Company</h2>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {LEGAL.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-slate-700 hover:text-brand">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-[12px] text-slate-500">
        © {new Date().getFullYear()} {BRAND} · Operated by {OWNER.legalName}, {OWNER.city}, India · {OWNER.email}
      </div>
    </footer>
  );
}
