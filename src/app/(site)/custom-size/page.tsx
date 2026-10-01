import type { Metadata } from "next";
import { Faq } from "@/components/site/Faq";
import { CustomToolLazy } from "@/components/tool/ToolLoader";

export const metadata: Metadata = {
  title: "Custom Photo & Signature Resizer – Any Pixels, cm, mm, KB",
  description: "Resize a photo or signature to any size in pixels, cm, mm or inches at a chosen DPI, and compress it into a KB range. For any exam or government form. Free and private.",
  alternates: { canonical: "/custom-size" },
};

export default function CustomSize() {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="text-[27px] font-extrabold text-slate-900 sm:text-[38px]">Custom size resizer</h1>
          <p className="mt-2 max-w-3xl text-[16px] text-slate-600">
            Your exam is not listed, or the portal shows different limits? Enter the width and height (px, cm, mm or inch at a DPI) and the KB range. We crop, resize and compress to fit.
          </p>
          <p className="mt-1 text-[15px] text-slate-600" lang="hi">
            कोई भी साइज़: पिक्सल/सेमी/मिमी और KB सीमा डालें, फोटो चुनें और डाउनलोड करें।
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <CustomToolLazy />
      </div>
      <Faq
        items={[
          { q: "How are cm converted to pixels?", a: "pixels = cm ÷ 2.54 × DPI. For example 3.5 cm at 200 DPI = 276 px. The DPI is also written into the JPEG header so the file shows the right physical size." },
          { q: "What if the minimum KB can't be reached?", a: "Small or plain images can be below the minimum even at top quality. We then add blank metadata to the file so it meets the minimum; the picture itself is unchanged." },
        ]}
      />
    </>
  );
}
