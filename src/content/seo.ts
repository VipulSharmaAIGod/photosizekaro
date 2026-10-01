import { isResizable, kbText, type DocSpec, type ExamPreset } from "@/data/presets";

export const YEAR = "2026";

const docShort = (d: DocSpec) => {
  if (!d.uploaded) return `${d.label.replace(/ \(captured live\)/, "")} captured live`;
  if (!isResizable(d)) return `${d.label}: limits not published`;
  return `${d.label.toLowerCase().replace(/ \(.*\)/, "")} ${d.width}×${d.height} px, ${kbText(d)}`;
};

export function examTitle(p: ExamPreset) {
  const hasSig = p.docs.some((d) => d.kind === "signature");
  const hasPhotoUpload = p.docs.some((d) => d.kind === "photo" && d.uploaded);
  const what = hasPhotoUpload && hasSig ? "Photo & Signature Size" : hasSig ? "Signature Size (Photo is Live)" : "Photo Size";
  return `${p.name} ${what} ${YEAR} – Free Resizer`;
}

export function examH1(p: ExamPreset) {
  return `${p.name} photo & signature size ${YEAR}`;
}

export function examDescription(p: ExamPreset) {
  const parts = p.docs.map(docShort).join("; ");
  return `${p.name} ${YEAR} (${p.cycle}): ${parts}. Make a compliant JPG in one tap — free, on your phone, nothing uploaded.`.slice(0, 300);
}

/** Short Hindi summary generated from the spec (kept factual — numbers only from the preset). */
export function hindiSummary(p: ExamPreset): string[] {
  return p.docs.map((d) => {
    if (!d.uploaded) return `${d.labelHi}: अपलोड नहीं करनी — आवेदन के समय वेबकैम/मोबाइल कैमरे से लाइव ली जाती है।`;
    if (!isResizable(d)) return `${d.labelHi}: आधिकारिक साइज़ प्रकाशित नहीं/सत्यापित नहीं — पोर्टल पर दिखी सीमा के अनुसार "Custom size" से बनाएं।`;
    const kb = d.kbNote ? `${Math.ceil(d.maxKB)} KB से कम` : d.minKB ? `${d.minKB}–${d.maxKB} KB` : `अधिकतम ${d.maxKB} KB`;
    return `${d.labelHi}: ${d.width}×${d.height} पिक्सल, ${kb}, JPG फॉर्मेट।`;
  });
}

export function examSteps(p: ExamPreset) {
  const up = p.docs.filter(isResizable);
  return [
    { name: "Pick the document", text: `Choose ${up.map((d) => d.label.toLowerCase()).join(", ") || "the document"} in the ${p.name} tool above.` },
    { name: "Choose or take a photo", text: "Select a photo from your gallery or take one with the camera. It is auto-rotated and stays on your device." },
    { name: "Crop in the locked frame", text: "Drag and zoom inside the frame; it is locked to the exact shape the exam needs. Optional: whiten background, clean signature paper, add name & date." },
    { name: "Download the compliant JPG", text: "We resize to the exact pixels and compress to the required KB range automatically. Check the green ticks, then download and upload it on the official portal." },
  ];
}

/** Generic keyword pages that open the Custom tool with defaults. */
export interface GenericPage {
  slug: string;
  lang: "en" | "hi";
  title: string;
  h1: string;
  description: string;
  intro: string[];
  defaults: { kind: "photo" | "signature"; w: number; h: number; unit: "px" | "cm"; dpi: number; minKB?: number; maxKB: number };
  faq: { q: string; a: string }[];
}

export const GENERIC_PAGES: GenericPage[] = [
  {
    slug: "resize-photo-20kb-to-50kb",
    lang: "en",
    title: "Resize Photo to 20 KB – 50 KB Online (Exact Pixels) – Free",
    h1: "Resize photo to 20–50 KB",
    description: "Compress a passport photo to between 20 KB and 50 KB at exact pixels (e.g. 200×230 px or 3.5×4.5 cm) for exam forms. Free, private, in your browser.",
    intro: ["Most bank and many state forms want a photo between 20 KB and 50 KB. Set the size below (pixels or cm at a DPI), crop, and download — we search the JPEG quality automatically to land inside the range."],
    defaults: { kind: "photo", w: 200, h: 230, unit: "px", dpi: 200, minKB: 20, maxKB: 50 },
    faq: [
      { q: "How do you hit an exact KB range?", a: "We binary-search the JPEG quality until the file is just under the maximum. If even the best quality is below the minimum (tiny images), we add blank metadata so the file meets the minimum without changing any pixel." },
      { q: "Is my photo uploaded?", a: "No. Everything runs in your browser on your phone or computer." },
    ],
  },
  {
    slug: "resize-signature-10kb-to-20kb",
    lang: "en",
    title: "Resize Signature to 10 KB – 20 KB Online (White Background) – Free",
    h1: "Resize signature to 10–20 KB",
    description: "Make your signature 10–20 KB with a clean white background at exact pixels (140×60 px, 6×2 cm…). Free, works on mobile, nothing is uploaded.",
    intro: ["Photograph your signature on white paper, crop it, and we clean the paper to pure white, sharpen the ink and compress to 10–20 KB. Change the size for your exam below."],
    defaults: { kind: "signature", w: 140, h: 60, unit: "px", dpi: 200, minKB: 10, maxKB: 20 },
    faq: [
      { q: "My signature photo has shadows. Will it work?", a: "Yes. The cleanup step flattens uneven light before thresholding, so phone-camera shadows usually disappear. Use the strength slider if faint strokes vanish." },
      { q: "Can I keep blue ink?", a: "Yes — choose ‘Keep pen colour’. Some exams (e.g. GATE) allow dark blue; many want black." },
    ],
  },
  {
    slug: "photo-ka-size-kaise-kam-kare",
    lang: "hi",
    title: "फोटो का साइज KB में कैसे कम करें – सरकारी फॉर्म के लिए फ्री टूल",
    h1: "फोटो और सिग्नेचर का साइज KB में कम करें",
    description: "SSC, बैंक, रेलवे, NEET जैसे सरकारी फॉर्म के लिए फोटो/सिग्नेचर को सही पिक्सल और KB (जैसे 20–50 KB, 10–20 KB) में बदलें। मुफ्त, मोबाइल पर, फोटो अपलोड नहीं होती।",
    intro: [
      "नीचे चौड़ाई, ऊंचाई (पिक्सल या सेमी) और KB सीमा भरें, फोटो चुनें, फ्रेम में सेट करें और डाउनलोड करें। टूल अपने आप JPEG क्वालिटी बदलकर फाइल को तय KB के अंदर लाता है।",
      "अपनी परीक्षा का सीधा प्रीसेट चाहिए? होम पेज पर SSC, IBPS, UPSC, RRB, NEET आदि चुनें।",
    ],
    defaults: { kind: "photo", w: 3.5, h: 4.5, unit: "cm", dpi: 200, minKB: 20, maxKB: 50 },
    faq: [
      { q: "क्या मेरी फोटो सर्वर पर जाती है?", a: "नहीं। पूरी प्रोसेसिंग आपके फोन/कंप्यूटर के ब्राउज़र में होती है।" },
      { q: "फोटो का बैकग्राउंड सफेद कैसे करें?", a: "‘White background’ चालू करें। सादी दीवार वाली फोटो में यह सबसे अच्छा काम करता है।" },
    ],
  },
];

export const GENERIC_BY_SLUG = Object.fromEntries(GENERIC_PAGES.map((g) => [g.slug, g]));
