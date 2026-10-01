import type { Metadata } from "next";
import { Faq } from "@/components/site/Faq";
import { KitToolLazy } from "@/components/tool/ToolLoader";
import { PRICES, rupees } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Exam Kit – All Exams' Photo & Signature in One ZIP + Passport Photo Sheet",
  description: `Upload your photo and signature once and get compliant files for SSC, IBPS, SBI, RRB, NEET, CTET and more in one ZIP, plus print-ready passport photo sheets (A4 / 4×6). ${rupees(PRICES.kit.amountPaise)} one-time.`,
  alternates: { canonical: "/exam-kit" },
};

export default function ExamKit() {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <p className="text-[13px] font-bold uppercase tracking-wider text-brand">Exam Kit · {rupees(PRICES.kit.amountPaise)} one-time</p>
          <h1 className="mt-1 text-[27px] font-extrabold text-slate-900 sm:text-[38px]">Every exam&apos;s photo &amp; signature in one tap</h1>
          <p className="mt-2 max-w-3xl text-[16px] text-slate-600">
            Upload once, pick your exams, and get a ZIP with a correctly sized file for each one — plus print-ready passport photo sheets for exam day. Try it free: generating and checking is free; the ZIP and print files need the kit.
          </p>
          <p className="mt-1 text-[15px] text-slate-600" lang="hi">
            एक बार फोटो/सिग्नेचर डालें — सभी परीक्षाओं की फाइलें एक ZIP में, साथ में प्रिंट के लिए पासपोर्ट फोटो शीट।
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <KitToolLazy />
      </div>
      <Faq
        items={[
          { q: "Is a single exam file free?", a: "Yes, always. Every exam page makes a compliant photo/signature for free with no watermark. The kit is only for batch ZIPs and print sheets." },
          { q: "How do I print the A4 sheet at the right size?", a: "Open the PDF and print at 100% / ‘Actual size’ (not ‘Fit to page’). Each photo is exactly 3.5 × 4.5 cm. Cut along the light grey lines." },
          { q: "I paid but lost the unlock (new phone / cleared browser).", a: "Tap ‘Restore purchase’ and paste the Razorpay payment ID (starts with pay_) from your payment SMS/email." },
        ]}
      />
    </>
  );
}
