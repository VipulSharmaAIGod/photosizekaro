/**
 * Exam upload presets — the core data of the product.
 *
 * RULES FOR EDITING THIS FILE
 *  - Every number must come from an official notification / information bulletin / portal instruction,
 *    cited in `sources` with the date it was last checked (`lastVerified`).
 *  - status "verified":   numbers read in the exam's own current official document.
 *  - status "partial":    numbers read in an official document of the same body/portal for a sibling exam
 *                         (e.g. same IBPS/RRB/UPSC common form) — the exam's own notice was not re-read.
 *  - status "unverified": only secondary sources were found. The UI shows a warning; never present as official.
 *  - A doc without `maxKB` is "info only" (we could not verify the numbers) — the tool sends the user to Custom mode.
 *  - `uploaded: false` = the portal captures it live (webcam/phone); we must NOT offer a resized upload for it.
 *
 * Re-verify every notification cycle. Dates are ISO (YYYY-MM-DD), times IST.
 */

export type DocKind = "photo" | "signature" | "thumb" | "declaration" | "fingers";
export type Status = "verified" | "partial" | "unverified";

export interface DocSpec {
  id: string; // unique within the preset, used in URLs/files (photo, signature, thumb, declaration, …)
  kind: DocKind;
  label: string;
  labelHi: string;
  /** false → captured live by the portal (webcam / phone). We show guidance instead of a resizer. */
  uploaded: boolean;
  /** Output pixels we generate. For range specs we pick a safe value inside the range. */
  width?: number;
  height?: number;
  /** What the notification literally says about dimensions (shown in the spec table). */
  dimText?: string;
  /** Allowed pixel range, when the notification gives one (used by the custom checker + e2e). */
  pxRange?: { minW: number; maxW: number; minH: number; maxH: number };
  /** DPI written into the JPEG header so that the file reads as the right physical size (cm) in viewers. */
  dpi?: number;
  minKB?: number;
  maxKB?: number;
  /** Overrides the KB text in the spec table (e.g. "less than 20 KB"). */
  kbNote?: string;
  /** Download file name without extension (some portals require e.g. "photo"). */
  fileName?: string;
  /** Background hint used for defaults: white = whiten by default, keep = never whiten automatically. */
  background?: "white" | "light" | "keep";
  /** Ink cleanup (signature/thumb/declaration): convert to clean white paper. */
  cleanup?: boolean;
  /** Print a name + date strip under the photo by default (only where the exam asks for it). */
  dateNameStrip?: boolean;
  notes: string[];
}

export interface Source {
  title: string;
  url: string;
  /** What was read there (paragraph / page) — helps the next re-verification. */
  ref?: string;
  official: boolean;
  note?: string;
}

export interface ExamPreset {
  slug: string; // URL slug (SEO page)
  id: string;
  name: string; // "SSC CGL"
  nameHi: string;
  fullName: string;
  body: string; // conducting body
  group: "SSC" | "UPSC" | "Banking" | "Railways" | "NTA / Entrance" | "Teaching" | "State PSC";
  cycle: string; // notification cycle the numbers come from
  status: Status;
  lastVerified: string;
  docs: DocSpec[];
  /** Short, plain-language facts shown at the top of the exam page. */
  highlights: string[];
  sources: Source[];
  /** Extra exam-specific FAQ items. */
  faq?: { q: string; a: string }[];
  /** Search phrases this page targets (title/H1 use the first one). */
  keywords: string[];
}

export const LAST_VERIFIED = "2026-10-01";

/* ------------------------------------------------------------------------------------------------ */
/* Reusable document specs                                                                          */
/* ------------------------------------------------------------------------------------------------ */

const sscLivePhoto: DocSpec = {
  id: "photo",
  kind: "photo",
  label: "Photograph (captured live)",
  labelHi: "फोटो (लाइव कैप्चर)",
  uploaded: false,
  notes: [
    "Not uploaded. The SSC application module captures your photo live through the webcam or the mySSC mobile app.",
    "Good light, plain background, camera at eye level, face fully inside the frame; no cap, mask or spectacles.",
    "Do not photograph an existing photo — such applications are rejected.",
    "Candidates who did not do Aadhaar authentication must carry two recent passport-size colour photographs to the exam (CGL 2025 para 14.7).",
  ],
};

const sscSignature: DocSpec = {
  id: "signature",
  kind: "signature",
  label: "Signature",
  labelHi: "हस्ताक्षर",
  uploaded: true,
  width: 472,
  height: 157,
  dpi: 200,
  dimText: "about 6.0 cm (width) × 2.0 cm (height)",
  minKB: 10,
  maxKB: 20,
  background: "white",
  cleanup: true,
  notes: ["JPEG/JPG, 10–20 KB. Blurred or miniature signatures are rejected.", "We output 472 × 157 px at 200 DPI = 6.0 × 2.0 cm."],
};

const ibpsDocs = (bank: "IBPS" | "SBI"): DocSpec[] => [
  {
    id: "photo",
    kind: "photo",
    label: "Photograph",
    labelHi: "फोटो",
    uploaded: true,
    width: 200,
    height: 230,
    dpi: 200,
    dimText: "200 × 230 pixels (preferred), 4.5 cm × 3.5 cm",
    minKB: 20,
    maxKB: 50,
    background: "white",
    notes: [
      "Recent passport-style colour photo, light (preferably white) background, no caps/hats/dark glasses.",
      "A live photograph is ALSO captured by webcam/phone during registration — this upload does not replace it.",
    ],
  },
  {
    id: "signature",
    kind: "signature",
    label: "Signature",
    labelHi: "हस्ताक्षर",
    uploaded: true,
    width: 140,
    height: 60,
    dpi: 200,
    dimText: "140 × 60 pixels (preferred)",
    minKB: 10,
    maxKB: 20,
    background: "white",
    cleanup: true,
    notes: ["Black ink on white paper. NOT in CAPITAL letters."],
  },
  {
    id: "thumb",
    kind: "thumb",
    label: "Left thumb impression",
    labelHi: "बाएं अंगूठे का निशान",
    uploaded: true,
    width: 240,
    height: 240,
    dpi: 200,
    dimText: "240 × 240 pixels in 200 DPI (3 cm × 3 cm)",
    minKB: 20,
    maxKB: 50,
    background: "white",
    cleanup: true,
    notes: [bank === "SBI" ? "Black or blue ink on white paper. If no left thumb, the right thumb may be used." : "Black or blue ink on white paper. Not smudged."],
  },
  {
    id: "declaration",
    kind: "declaration",
    label: "Hand-written declaration",
    labelHi: "हस्तलिखित घोषणा",
    uploaded: true,
    width: 800,
    height: 400,
    dpi: 200,
    dimText: "800 × 400 pixels in 200 DPI (10 cm × 5 cm)",
    minKB: 50,
    maxKB: 100,
    background: "white",
    cleanup: true,
    notes: [
      "Write in English, in your own handwriting, black ink, NOT in capital letters.",
      bank === "SBI"
        ? "Text: “I, ______ (Name of the candidate), ______ (Date of Birth) hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required. The signature, photograph and left-hand thumb impression is of mine.”"
        : "Text: “I, ______ (Name of the candidate), hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required.”",
    ],
  },
];

const upscDocs: DocSpec[] = [
  {
    id: "photo",
    kind: "photo",
    label: "Photograph",
    labelHi: "फोटो",
    uploaded: true,
    width: 413,
    height: 531,
    dpi: 300,
    dimText: "No pixel size prescribed — we output 3.5 × 4.5 cm at 300 DPI",
    minKB: 20,
    maxKB: 200,
    fileName: "photo",
    background: "white",
    notes: [
      "JPG, 20–200 KB, file name ‘photo’. Plain white background.",
      "Face must cover about 75% (3/4) of the photo, both ears visible, eyes open, natural expression.",
      "A live photograph is ALSO captured while filling the Common Application Form (CAF).",
      "No name/date on the photo is required by the current instructions.",
    ],
  },
  {
    id: "signature",
    kind: "signature",
    label: "Signature (sign 3 times)",
    labelHi: "हस्ताक्षर (तीन बार)",
    uploaded: true,
    width: 400,
    height: 500,
    dpi: 200,
    dimText: "350 – 500 pixels",
    pxRange: { minW: 350, maxW: 500, minH: 350, maxH: 500 },
    minKB: 20,
    maxKB: 100,
    fileName: "signature",
    background: "white",
    cleanup: true,
    notes: [
      "Sign THREE times, one below the other, on plain white paper with black ink; scan all three in one image.",
      "JPG, 20–100 KB, file name ‘signature’. We output 400 × 500 px (inside the 350–500 px range).",
    ],
  },
];

const ntaPhoto = (maxKB: number): DocSpec => ({
  id: "photo",
  kind: "photo",
  label: "Passport-size photograph",
  labelHi: "पासपोर्ट साइज फोटो",
  uploaded: true,
  width: 413,
  height: 531,
  dpi: 300,
  dimText: "No pixel size prescribed — we output 3.5 × 4.5 cm at 300 DPI",
  minKB: 10,
  maxKB,
  background: "white",
  notes: [
    "JPG/JPEG. About 80% of the image should be your face (without mask), ears visible, white background.",
    "A live photograph is ALSO captured during the application (webcam, or scan the QR code with your phone).",
  ],
});

const ntaSignature = (maxKB: number): DocSpec => ({
  id: "signature",
  kind: "signature",
  label: "Signature",
  labelHi: "हस्ताक्षर",
  uploaded: true,
  width: 413,
  height: 177,
  dpi: 300,
  dimText: "No pixel size prescribed — we output 3.5 × 1.5 cm at 300 DPI",
  minKB: 10,
  maxKB,
  background: "white",
  cleanup: true,
  notes: ["JPG/JPEG, clearly legible."],
});

const rrbDocs: DocSpec[] = [
  {
    id: "photo",
    kind: "photo",
    label: "Photograph (captured live)",
    labelHi: "फोटो (लाइव कैप्चर)",
    uploaded: false,
    notes: [
      "Not uploaded. RRB applications capture a live photo by webcam or the phone's front camera (scan the QR code).",
      "Wear NON-white, preferably dark clothing for contrast with the background; follow the on-screen prompts.",
      "Uploading a pre-existing photo is not permitted.",
    ],
  },
  {
    id: "signature",
    kind: "signature",
    label: "Signature",
    labelHi: "हस्ताक्षर",
    uploaded: true,
    width: 413,
    height: 236,
    dpi: 300,
    dimText: "min. 140 × 60 pixels, min. 100 DPI, centred in a 35 mm × 20 mm box",
    pxRange: { minW: 140, maxW: 4000, minH: 60, maxH: 4000 },
    minKB: 30,
    maxKB: 49,
    background: "white",
    cleanup: true,
    notes: [
      "JPG/JPEG, 30–49 KB. Black ink on white paper, running (cursive) handwriting — NOT block/capital/disjoined letters.",
      "We output 413 × 236 px at 300 DPI = 35 × 20 mm with the signature centred.",
    ],
  },
];

/* ------------------------------------------------------------------------------------------------ */
/* Sources                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

const SSC_NB = "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards";
const S = {
  sscCgl: { title: "SSC CGL Examination 2025 – Notice", url: `${SSC_NB}/Notice_of_adv_cgl_2025.pdf`, ref: "Paras 9.4–9.6 (live photo, signature 10–20 KB, 6.0×2.0 cm); 14.7 (two photos at venue)", official: true },
  sscChsl: { title: "SSC CHSL Examination 2025 – Notice", url: `${SSC_NB}/Notice_of_adv_chsl_2025.pdf`, ref: "Photograph capture & signature paragraphs", official: true },
  sscMts: { title: "SSC MTS & Havaldar Examination 2025 – Notice", url: `${SSC_NB}/Notice_of_adv_mts_2025.pdf`, ref: "Photograph capture & signature paragraphs", official: true },
  sscGd: { title: "SSC Constable (GD) Examination 2026 – Notice", url: `${SSC_NB}/Notice_of_CTGD_2026.pdf`, ref: "Para 8.6–8.7 and Annexure (live photo, signature 10–20 KB)", official: true },
  sscJe: { title: "SSC Junior Engineer Examination 2025 – Notice (30.06.2025)", url: `${SSC_NB}/Notice_of_adv_je_2025.pdf`, ref: "Photograph capture & signature paragraphs", official: true },
  sscSteno: { title: "SSC Stenographer Grade C & D Examination 2025 – Notice", url: `${SSC_NB}/Notice_of_adv_steno_2025.pdf`, ref: "Photograph capture & signature paragraphs", official: true },
  sscCpo: {
    title: "SSC SI in Delhi Police & CAPFs (CPO) 2025 – Notice dated 26.09.2025 (copy)",
    url: "https://sarkariresult.study/media/post/documents/SSC-CPO-SI-2025-Notification.pdf",
    ref: "Live photo capture; signature JPEG 10–20 KB, about 6.0×2.0 cm",
    official: false,
    note: "Unaltered copy of the official SSC notice; the ssc.gov.in file name could not be fetched on the verification date.",
  },
  upscCsp: { title: "UPSC Civil Services (Preliminary) Examination 2026 – Notification", url: "https://www.upsc.gov.in/sites/default/files/Notif-CSP-2026-Engl-060226Rev.pdf", ref: "Note 2 (upload + live photo), Note 3 (signature three times)", official: true },
  upscCms: { title: "UPSC Combined Medical Services Examination 2026 – Notification", url: "https://www.upsc.gov.in/sites/default/files/Notification-CMSE-2026-English-110326.pdf", ref: "Photo 20–200 KB, signature 20–100 KB (same CAF on upsconline)", official: true },
  upscInstr: {
    title: "UPSC – Instructions for uploading photo & signature (upsconline)",
    url: "https://upsconline.nic.in/ngrp/assets/PDF/instruction-photo-signature-upload-upsc.pdf",
    ref: "Face 75%, white background; triple signature 20–100 KB, 350–500 px",
    official: true,
    note: "This URL returned 404 on 2026-10-01 (UPSC moved it); text read from the search-engine copy. Current version: upsconline.nic.in → Instructions and FAQs → Photos and Signature.",
  },
  ibpsPo: { title: "IBPS CRP PO/MT-XVI (2026) – Pre-requisites & scanning guidelines", url: "https://ibpsreg.ibps.in/crppoxvijun26/uploads/loadpdf.php?file=k7m5p+fQ15erzNvj0OHb09Pb2JeEcNvImGKn6KK2rL1x&t=zLjIrOLC1Ni005njxc8%3D", ref: "Guidelines for scanning and upload", official: true },
  ibpsClerk: { title: "IBPS CRP CSA-XV (Clerk 2025) – Detailed Notification", url: "https://www.ibps.in/wp-content/uploads/DetailedNotification_CRP_CSA_XV_Final_for_Website_1.8.2025.pdf", ref: "Annexure – Guidelines for scanning and upload of documents", official: true },
  ibpsRrb: { title: "IBPS CRP RRBs-XIV (2025) – Scanning guidelines", url: "https://ibpsreg.ibps.in/rrbxivaug25/uploads/loadpdf.php?file=k7m5p+fQ15e6zM3ryt%2FG39CYn5S+pdGTpaeV6Kqlcg%3D%3D&t=1LHArOLA2di0yczXwNDa083LmNWypw%3D%3D", ref: "Photo, signature, LTI, declaration specs", official: true },
  ibpsSo: {
    title: "IBPS CRP SPL-XV (Specialist Officers, vacancies 2026-27) – Notification (copy)",
    url: "https://static.ixambee.com/miscellaneous-pdf/ibps_so_notification_2025.pdf",
    ref: "Annexure – Guidelines for scanning and upload",
    official: false,
    note: "Copy of the official IBPS notification hosted by a coaching site.",
  },
  sbiPo26: { title: "SBI PO 2026 – Pre-requisites (apply 18.06.2026–08.07.2026)", url: "https://ibpsreg.ibps.in/sbipojun26/uploads/loadpdf.php?file=k7m5p+fQ15e7vNTj0NPa2JucmdWyp5rXppSo3aRx&t=zLjIrOLC1Ni005njxc8%3D", ref: "Photo/signature/LTI/declaration specs + declaration text", official: true },
  sbiPo25: { title: "SBI PO 2025 – Detailed Advertisement (23.06.2025)", url: "https://sbi.bank.in/documents/77530/52947104/1_Detailed_Adv.2025_23.06.2025.pdf/54ca0942-3de1-afc4-45e8-f679fc552e7b?t=1750741324277", ref: "Guidelines for scanning & upload", official: true },
  sbiJa25: { title: "SBI Junior Associates (Clerk) 2025 – Detailed Advertisement CRPD/CR/2025-26/06", url: "https://sbi.co.in/documents/77530/52947104/JA+2025+-Detailed+Advt.pdf/8f7ff18f-1972-21c8-9212-5a8cf85a7099", ref: "Guidelines for scanning & upload + declaration text", official: true },
  rrbJeFaq: { title: "RRB CEN 05/2025 (JE/DMS/CMA) – FAQs (RRB Ajmer)", url: "https://rrbajmer.gov.in/Upload_PDF/FAQs%20CEN_05_2025_JE_DMS_CMA_English-638972750743944984.pdf", ref: "Q64 (signature 30–49 KB, min 140×60 px, 100 DPI, 35×20 mm box), Q77 (live photo), Q78", official: true },
  neet26: { title: "NEET (UG) 2026 – Information Bulletin (NTA)", url: "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602081576322299.pdf", ref: "Pages 14–16: upload specs, live photo, postcard photos", official: true },
  jee26faq: { title: "JEE (Main) 2026 – FAQs (NTA)", url: "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/11/202511201840645521.pdf", ref: "Q18–19 live photograph", official: true },
  jee26ib: {
    title: "JEE (Main) 2026 – Information Bulletin (copy)",
    url: "https://educharcha.in/wp-content/uploads/2025/11/JEE_Main_2026_Information_Bulletin.pdf",
    ref: "Step 2: photo 10–200 KB, signature 10–100 KB",
    official: false,
    note: "Copy of the NTA bulletin; original on jeemain.nta.nic.in.",
  },
  cuet26: { title: "CUET (UG) 2026 – Information Bulletin (NTA)", url: "https://cdnbbsr.s3waas.gov.in/s3d1a21da7bca4abff8b0b61b87597de73/uploads/2026/01/202601031633478370.pdf", ref: "Photo 10–200 KB, signature 10–50 KB, live photo", official: true },
  gate26: { title: "GATE 2026 – Photograph and Signature (IIT Guwahati)", url: "https://gate2026.iitg.ac.in/photograph-and-signature.html", ref: "Full page", official: true },
  ctet26: { title: "CTET September 2026 – Information Bulletin (CBSE)", url: "https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2026/05/202605111250310617.pdf", ref: "Photo 10–100 KB 3.5×4.5 cm; signature 3–30 KB 3.5×1.5 cm", official: true },
  mpsc: { title: "MPSC – Instructions for Filling the Application Form", url: "https://mpsconline.gov.in/downloads/Instructions-for-Filling-the-Application-Form.pdf", ref: "Section (A) c–d", official: true, note: "Undated portal instruction sheet; still linked from mpsconline.gov.in." },
  bpscManual: { title: "BPSC Online Application – User Manual", url: "https://bpsconline.bihar.gov.in/downloads/User_Manual.pdf", ref: "Step 6: live photo; Hindi & English signature < 20 KB, width 150–220 px, height 250–320 px", official: true },
  rpscOtr: { title: "RPSC – OTR Guidelines (English), released 19 May 2026", url: "https://rpsc.rajasthan.gov.in/Static/InformationForCandidates/OTR_Manual_English.pdf", ref: "2.4 KYC: live photo, handwritten specimen, signature Hindi/English, left thumb", official: true },
  uppscOtr: { title: "UPPSC – Online instructions (OTR at otr.pariksha.nic.in)", url: "https://uppsc.up.nic.in/OuterPages/OnlineInstruction_English.html", ref: "OTR step 2: photo & signature uploaded once", official: true },
  mppscSecondary: {
    title: "MPPSC State Service Exam 2026 – application guide (secondary)",
    url: "https://jobseeker.fillyourforms.com/2026/01/12/mppsc-madhya-pradesh-state-service-examination-2026-apply-online/",
    ref: "Photo 20–100 KB with name & date; signature 10–100 KB",
    official: false,
    note: "Official advertisement (mppsc.mp.gov.in) could not be read on the verification date.",
  },
} satisfies Record<string, Source>;

/* ------------------------------------------------------------------------------------------------ */
/* Presets                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

const sscHighlights = (exam: string) => [
  `${exam}: your PHOTO is not uploaded — it is captured live by webcam / mySSC app while applying.`,
  "Only the SIGNATURE is uploaded: JPEG, 10–20 KB, about 6.0 cm × 2.0 cm.",
  "Keep two printed passport-size colour photos for the exam day if you did not do Aadhaar authentication.",
];

const sscFaq = (exam: string) => [
  { q: `Do I need to upload a photo for ${exam}?`, a: "No. SSC's application module captures your photo live through the webcam or the mySSC app. Uploading or photographing an old photo leads to rejection. You only upload the signature." },
  { q: `What is the ${exam} signature size?`, a: "JPEG/JPG between 10 KB and 20 KB, about 6.0 cm wide × 2.0 cm high. Our SSC preset outputs 472 × 157 px at 200 DPI (exactly 6.0 × 2.0 cm) and keeps the file between 10 and 20 KB." },
  { q: "SSC फोटो अपलोड करना है या नहीं?", a: "नहीं। SSC में फोटो वेबकैम या mySSC ऐप से लाइव खींची जाती है। केवल हस्ताक्षर (JPEG, 10–20 KB, लगभग 6.0 × 2.0 सेमी) अपलोड करना होता है।" },
];

function ssc(id: string, name: string, nameHi: string, fullName: string, cycle: string, src: Source, keywords: string[]): ExamPreset {
  return {
    slug: `${id}-photo-signature-size`,
    id,
    name,
    nameHi,
    fullName,
    body: "Staff Selection Commission (SSC)",
    group: "SSC",
    cycle,
    status: src.official ? "verified" : "partial",
    lastVerified: LAST_VERIFIED,
    docs: [sscLivePhoto, sscSignature],
    highlights: sscHighlights(name),
    sources: [src, ...(id === "ssc-cgl" ? [] : [S.sscCgl])],
    faq: sscFaq(name),
    keywords,
  };
}

function ibps(id: string, name: string, nameHi: string, fullName: string, cycle: string, src: Source, keywords: string[], bank: "IBPS" | "SBI" = "IBPS", extra: Source[] = []): ExamPreset {
  const body = bank === "SBI" ? "State Bank of India (SBI)" : "Institute of Banking Personnel Selection (IBPS)";
  return {
    slug: `${id}-photo-signature-size`,
    id,
    name,
    nameHi,
    fullName,
    body,
    group: "Banking",
    cycle,
    status: src.official ? "verified" : "partial",
    lastVerified: LAST_VERIFIED,
    docs: ibpsDocs(bank),
    highlights: [
      "Four uploads: photo 200×230 px (20–50 KB), signature 140×60 px (10–20 KB), left thumb 240×240 px (20–50 KB), hand-written declaration 800×400 px (50–100 KB).",
      "All JPG/JPEG. Signature and declaration must NOT be in capital letters.",
      "A live photo is also captured by webcam/phone during registration.",
    ],
    sources: [src, ...extra],
    faq: [
      { q: `What is the ${name} photo size?`, a: "200 × 230 pixels, JPG, between 20 KB and 50 KB, light/white background. Our preset produces exactly 200 × 230 px inside 20–50 KB." },
      { q: `What is the ${name} signature size?`, a: "140 × 60 pixels, JPG, between 10 KB and 20 KB, black ink on white paper, not in capital letters." },
      { q: "What should the hand-written declaration say?", a: (bank === "SBI" ? ibpsDocs("SBI") : ibpsDocs("IBPS"))[3].notes[1].replace(/^Text: /, "") + " Write it in English in your own handwriting (not capitals), then scan it: 800 × 400 px, 50–100 KB." },
      { q: `${name} के लिए फोटो और सिग्नेचर का साइज क्या है?`, a: "फोटो 200×230 पिक्सल (20–50 KB), सिग्नेचर 140×60 पिक्सल (10–20 KB), बाएं अंगूठे का निशान 240×240 पिक्सल (20–50 KB) और हस्तलिखित घोषणा 800×400 पिक्सल (50–100 KB), सभी JPG में।" },
    ],
    keywords,
  };
}

function upsc(id: string, name: string, nameHi: string, fullName: string, status: Status, keywords: string[]): ExamPreset {
  return {
    slug: `${id}-photo-signature-size`,
    id,
    name,
    nameHi,
    fullName,
    body: "Union Public Service Commission (UPSC)",
    group: "UPSC",
    cycle: "2026 (Common Application Form on upsconline.nic.in)",
    status,
    lastVerified: LAST_VERIFIED,
    docs: upscDocs,
    highlights: [
      "Photo: JPG 20–200 KB, plain white background, face ≈ 75% of the photo. A live photo is ALSO captured in the CAF.",
      "Signature: sign THREE times one below the other in black ink; one JPG of 20–100 KB, 350–500 px.",
      "Name/date on the photo is not required by the current UPSC instructions.",
    ],
    sources: status === "verified" ? [S.upscCsp, S.upscInstr, S.upscCms] : [S.upscInstr, S.upscCsp, S.upscCms],
    faq: [
      { q: `What is the ${name} photo size in KB?`, a: "Between 20 KB and 200 KB in JPG format, with a plain white background and your face covering about three-quarters of the photo." },
      { q: `Why does ${name} ask for three signatures?`, a: "Since 2025 UPSC asks you to sign three times, one below the other, on plain white paper and upload all three as one JPG (20–100 KB, 350–500 px). Use our signature preset: it cleans the paper to pure white and outputs 400 × 500 px." },
      { q: "UPSC फोटो का साइज कितना होना चाहिए?", a: "JPG फॉर्मेट में 20 KB से 200 KB, सफेद बैकग्राउंड, चेहरा फोटो का लगभग 75% हिस्सा। हस्ताक्षर तीन बार (एक के नीचे एक) करके 20–100 KB की एक JPG फाइल अपलोड करें।" },
    ],
    keywords,
  };
}

function rrb(id: string, name: string, nameHi: string, fullName: string, status: Status, keywords: string[]): ExamPreset {
  return {
    slug: `${id}-photo-signature-size`,
    id,
    name,
    nameHi,
    fullName,
    body: "Railway Recruitment Boards (RRBs)",
    group: "Railways",
    cycle: "CEN 2025 series (rrbapply.gov.in)",
    status,
    lastVerified: LAST_VERIFIED,
    docs: rrbDocs,
    highlights: [
      "Photo: NOT uploaded — RRB captures a live photo by webcam/phone. Wear dark (non-white) clothes.",
      "Signature: JPG/JPEG 30–49 KB, at least 140 × 60 px and 100 DPI, centred in a 35 × 20 mm box, running handwriting.",
    ],
    sources: [S.rrbJeFaq],
    faq: [
      { q: `What is the ${name} signature size?`, a: "JPG/JPEG between 30 KB and 49 KB, minimum 140 × 60 pixels at 100 DPI or more, centred inside a 35 mm × 20 mm box. Our preset outputs 413 × 236 px at 300 DPI (35 × 20 mm) inside 30–49 KB." },
      { q: `Do I upload a photo for ${name}?`, a: "No. The RRB application captures your live photo through the webcam or your phone's front camera (scan the QR code). Pre-existing photos are not allowed." },
      { q: "RRB सिग्नेचर का साइज क्या है?", a: "JPG/JPEG, 30 से 49 KB, कम से कम 140×60 पिक्सल और 100 DPI, 35×20 मिमी बॉक्स के बीच में। फोटो लाइव कैमरे से ली जाती है, अपलोड नहीं होती।" },
    ],
    keywords,
  };
}

export const PRESETS: ExamPreset[] = [
  /* ---------------- SSC ---------------- */
  ssc("ssc-cgl", "SSC CGL", "एसएससी सीजीएल", "Combined Graduate Level Examination", "CGL 2025", S.sscCgl, ["SSC CGL photo size", "SSC CGL signature size", "SSC CGL photo and signature size 2026"]),
  ssc("ssc-chsl", "SSC CHSL", "एसएससी सीएचएसएल", "Combined Higher Secondary (10+2) Level Examination", "CHSL 2025", S.sscChsl, ["SSC CHSL photo size", "SSC CHSL signature size 2026"]),
  ssc("ssc-mts", "SSC MTS", "एसएससी एमटीएस", "Multi-Tasking (Non-Technical) Staff & Havaldar Examination", "MTS 2025", S.sscMts, ["SSC MTS photo size", "SSC MTS signature size"]),
  ssc("ssc-gd", "SSC GD", "एसएससी जीडी", "Constable (GD) in CAPFs, SSF, Assam Rifles & NCB", "GD 2026", S.sscGd, ["SSC GD photo size", "SSC GD signature size 2026"]),
  ssc("ssc-cpo", "SSC CPO", "एसएससी सीपीओ", "Sub-Inspector in Delhi Police & CAPFs", "CPO 2025", S.sscCpo, ["SSC CPO photo size", "SSC CPO signature size"]),
  ssc("ssc-je", "SSC JE", "एसएससी जेई", "Junior Engineer (Civil, Mechanical, Electrical) Examination", "JE 2025", S.sscJe, ["SSC JE photo size", "SSC JE signature size"]),
  ssc("ssc-steno", "SSC Stenographer", "एसएससी स्टेनोग्राफर", "Stenographer Grade C & D Examination", "Steno 2025", S.sscSteno, ["SSC Stenographer photo size", "SSC Steno signature size"]),

  /* ---------------- UPSC ---------------- */
  upsc("upsc-cse", "UPSC CSE", "यूपीएससी सिविल सेवा", "Civil Services (IAS/IPS) Examination", "verified", ["UPSC photo size", "UPSC signature size 2026", "UPSC CSE photo size"]),
  upsc("upsc-nda", "UPSC NDA", "यूपीएससी एनडीए", "National Defence Academy & Naval Academy Examination", "partial", ["NDA photo size", "NDA signature size 2026"]),
  upsc("upsc-cds", "UPSC CDS", "यूपीएससी सीडीएस", "Combined Defence Services Examination", "partial", ["CDS photo size", "CDS signature size 2026"]),
  upsc("upsc-epfo", "UPSC EPFO", "यूपीएससी ईपीएफओ", "EPFO Enforcement Officer / Accounts Officer & APFC", "partial", ["UPSC EPFO photo size", "EPFO signature size"]),

  /* ---------------- Banking ---------------- */
  ibps("ibps-po", "IBPS PO", "आईबीपीएस पीओ", "Probationary Officers / Management Trainees (CRP PO/MT)", "CRP PO/MT-XVI (2026)", S.ibpsPo, ["IBPS PO photo size", "IBPS PO signature size", "IBPS thumb impression size", "IBPS handwritten declaration size"]),
  ibps("ibps-clerk", "IBPS Clerk", "आईबीपीएस क्लर्क", "Customer Service Associates (CRP CSA)", "CRP CSA-XV (2025)", S.ibpsClerk, ["IBPS Clerk photo size", "IBPS Clerk signature size"]),
  ibps("ibps-rrb", "IBPS RRB", "आईबीपीएस आरआरबी", "Regional Rural Banks – Officer Scale I/II/III & Office Assistant", "CRP RRBs-XIV (2025)", S.ibpsRrb, ["IBPS RRB photo size", "IBPS RRB PO signature size"]),
  ibps("ibps-so", "IBPS SO", "आईबीपीएस एसओ", "Specialist Officers (CRP SPL)", "CRP SPL-XV (2026-27)", S.ibpsSo, ["IBPS SO photo size", "IBPS SO signature size"]),
  ibps("sbi-po", "SBI PO", "एसबीआई पीओ", "State Bank of India Probationary Officers", "SBI PO 2026", S.sbiPo26, ["SBI PO photo size", "SBI PO signature size", "SBI thumb impression size"], "SBI", [S.sbiPo25]),
  ibps("sbi-clerk", "SBI Clerk", "एसबीआई क्लर्क", "SBI Junior Associates (Customer Support & Sales)", "SBI JA 2025", S.sbiJa25, ["SBI Clerk photo size", "SBI Clerk signature size"], "SBI"),

  /* ---------------- Railways ---------------- */
  rrb("rrb-ntpc", "RRB NTPC", "आरआरबी एनटीपीसी", "Non-Technical Popular Categories", "partial", ["RRB NTPC signature size", "RRB NTPC photo size"]),
  rrb("rrb-group-d", "RRB Group D", "आरआरबी ग्रुप डी", "Level-1 posts", "partial", ["RRB Group D signature size", "RRB Group D photo size"]),
  rrb("rrb-alp", "RRB ALP", "आरआरबी एएलपी", "Assistant Loco Pilot", "partial", ["RRB ALP signature size", "RRB ALP photo size"]),
  rrb("rrb-je", "RRB JE", "आरआरबी जेई", "Junior Engineer / DMS / CMA (CEN 05/2025)", "verified", ["RRB JE signature size", "RRB JE photo size"]),

  /* ---------------- NTA & entrance ---------------- */
  {
    slug: "neet-ug-photo-signature-size",
    id: "neet-ug",
    name: "NEET UG",
    nameHi: "नीट यूजी",
    fullName: "National Eligibility cum Entrance Test (UG)",
    body: "National Testing Agency (NTA)",
    group: "NTA / Entrance",
    cycle: "NEET (UG) 2026",
    status: "verified",
    lastVerified: LAST_VERIFIED,
    docs: [
      { ...ntaPhoto(200), notes: [...ntaPhoto(200).notes, "Colour or black & white; must be taken after 01 January 2026.", "Keep 6–8 passport-size and 4–6 postcard-size (4″×6″) prints with white background — use the print sheet."] },
      ntaSignature(100),
      {
        id: "fingers",
        kind: "fingers",
        label: "Left & right hand fingers and thumb impressions",
        labelHi: "दोनों हाथों की उंगलियों व अंगूठे के निशान",
        uploaded: true,
        width: 1200,
        height: 900,
        dpi: 200,
        dimText: "No pixel size prescribed — we output 1200 × 900 px",
        minKB: 50,
        maxKB: 200,
        background: "white",
        cleanup: true,
        notes: [
          "The bulletin gives two ranges (10–200 KB in the upload list, 50–300 KB in the note below it). We target 50–200 KB, which satisfies both.",
          "Put all fingers and thumbs of both hands on white paper (ink), then photograph/scan the sheet.",
        ],
      },
    ],
    highlights: [
      "Photo: JPG 10–200 KB, 80% face incl. ears, white background, taken after 01 Jan 2026. A live photo is also captured.",
      "Signature: JPG 10–100 KB. Fingers & thumb impressions: JPG (we keep it in 50–200 KB to satisfy both ranges in the bulletin).",
      "Keep 6–8 passport-size and 4–6 postcard (4×6 inch) prints of the SAME photo for the exam & counselling.",
    ],
    sources: [S.neet26],
    faq: [
      { q: "What is the NEET 2026 photo size?", a: "JPG/JPEG between 10 KB and 200 KB. About 80% of the photo should be your face (without mask) including ears, against a white background, taken after 1 January 2026. Our preset outputs 413 × 531 px (3.5 × 4.5 cm at 300 DPI)." },
      { q: "What is the NEET signature size?", a: "JPG/JPEG between 10 KB and 100 KB." },
      { q: "Do I need a postcard size photo for NEET?", a: "Yes — keep 4–6 postcard-size (4″ × 6″) and 6–8 passport-size colour prints of the same photo with a white background for the exam centre, counselling and admission." },
      { q: "NEET फोटो का साइज कितना होना चाहिए?", a: "JPG में 10 KB से 200 KB, सफेद बैकग्राउंड, चेहरा फोटो का 80% (कान दिखें), फोटो 1 जनवरी 2026 के बाद की हो। सिग्नेचर 10–100 KB।" },
    ],
    keywords: ["NEET photo size 2026", "NEET signature size", "NEET postcard size photo", "NEET fingers and thumb impression size"],
  },
  {
    slug: "jee-main-photo-signature-size",
    id: "jee-main",
    name: "JEE Main",
    nameHi: "जेईई मेन",
    fullName: "Joint Entrance Examination (Main)",
    body: "National Testing Agency (NTA)",
    group: "NTA / Entrance",
    cycle: "JEE (Main) 2026",
    status: "verified",
    lastVerified: LAST_VERIFIED,
    docs: [ntaPhoto(200), ntaSignature(100)],
    highlights: [
      "Photo: colour, JPG 10–200 KB, 80% face incl. ears, white background. A live photo is also captured.",
      "Signature: JPG 10–100 KB, clearly legible.",
    ],
    sources: [S.jee26ib, S.jee26faq],
    faq: [
      { q: "What is the JEE Main 2026 photo size?", a: "A recent colour passport-size photo in JPG/JPEG between 10 KB and 200 KB, with 80% face (without mask) visible including ears against a white background." },
      { q: "What is the JEE Main signature size?", a: "JPG/JPEG between 10 KB and 100 KB, clearly legible." },
      { q: "JEE Main फोटो साइज क्या है?", a: "रंगीन पासपोर्ट फोटो, JPG में 10–200 KB, सफेद बैकग्राउंड, चेहरा 80%। सिग्नेचर 10–100 KB। आवेदन के समय लाइव फोटो भी ली जाती है।" },
    ],
    keywords: ["JEE Main photo size 2026", "JEE Main signature size"],
  },
  {
    slug: "cuet-ug-photo-signature-size",
    id: "cuet-ug",
    name: "CUET UG",
    nameHi: "सीयूईटी यूजी",
    fullName: "Common University Entrance Test (UG)",
    body: "National Testing Agency (NTA)",
    group: "NTA / Entrance",
    cycle: "CUET (UG) 2026",
    status: "verified",
    lastVerified: LAST_VERIFIED,
    docs: [ntaPhoto(200), ntaSignature(50)],
    highlights: ["Photo: colour, JPG 10–200 KB, 80% face incl. ears, white background. A live photo is also captured.", "Signature: JPG 10–50 KB (not 4–30 KB as some old guides say)."],
    sources: [S.cuet26],
    faq: [
      { q: "What is the CUET UG 2026 photo size?", a: "JPG/JPEG between 10 KB and 200 KB, colour, 80% face including ears, white background." },
      { q: "What is the CUET UG signature size?", a: "JPG/JPEG between 10 KB and 50 KB in the 2026 bulletin." },
      { q: "CUET फोटो और सिग्नेचर साइज?", a: "फोटो 10–200 KB और सिग्नेचर 10–50 KB, दोनों JPG में।" },
    ],
    keywords: ["CUET photo size 2026", "CUET signature size"],
  },
  {
    slug: "gate-photo-signature-size",
    id: "gate",
    name: "GATE",
    nameHi: "गेट",
    fullName: "Graduate Aptitude Test in Engineering",
    body: "IIT Guwahati (organising institute for GATE 2026)",
    group: "NTA / Entrance",
    cycle: "GATE 2026",
    status: "verified",
    lastVerified: LAST_VERIFIED,
    docs: [
      {
        id: "photo",
        kind: "photo",
        label: "Photograph",
        labelHi: "फोटो",
        uploaded: true,
        width: 413,
        height: 531,
        dpi: 300,
        dimText: "200 × 260 to 530 × 690 px; aspect ratio (w:h) 0.66–0.89; 3.5 × 4.5 cm",
        pxRange: { minW: 200, maxW: 530, minH: 260, maxH: 690 },
        minKB: 5,
        maxKB: 600,
        background: "white",
        notes: ["Colour, white background, face covering 60–70% of the photo, no caps/sunglasses; normal spectacles without glare allowed."],
      },
      {
        id: "signature",
        kind: "signature",
        label: "Signature",
        labelHi: "हस्ताक्षर",
        uploaded: true,
        width: 525,
        height: 175,
        dpi: 300,
        dimText: "250 × 80 to 580 × 180 px; width = 2.75–3.75 × height",
        pxRange: { minW: 250, maxW: 580, minH: 80, maxH: 180 },
        minKB: 3,
        maxKB: 300,
        background: "white",
        cleanup: true,
        notes: ["Black or dark-blue ink only; signature should cover 70–80% of the image. Not in ALL CAPITALS, no initials-only."],
      },
    ],
    highlights: ["Photo: 200×260 to 530×690 px, ratio 0.66–0.89, 5–600 KB, face 60–70%, white background.", "Signature: 250×80 to 580×180 px, ratio 1:2.75–3.75, 3–300 KB, black/dark-blue ink."],
    sources: [S.gate26],
    faq: [
      { q: "What is the GATE photo size?", a: "JPEG/JPG between 200 × 260 and 530 × 690 pixels, aspect ratio 0.66–0.89, 5–600 KB, face covering 60–70%. Our preset outputs 413 × 531 px." },
      { q: "What is the GATE signature size?", a: "Between 250 × 80 and 580 × 180 pixels with width 2.75–3.75 times the height, 3–300 KB. Our preset outputs 525 × 175 px (ratio 3.0)." },
      { q: "GATE फोटो साइज क्या है?", a: "200×260 से 530×690 पिक्सल, 5–600 KB, सफेद बैकग्राउंड, चेहरा 60–70%। सिग्नेचर 250×80 से 580×180 पिक्सल, 3–300 KB।" },
    ],
    keywords: ["GATE photo size", "GATE signature size 2026"],
  },
  {
    slug: "ctet-photo-signature-size",
    id: "ctet",
    name: "CTET",
    nameHi: "सीटेट",
    fullName: "Central Teacher Eligibility Test",
    body: "Central Board of Secondary Education (CBSE)",
    group: "Teaching",
    cycle: "CTET September 2026",
    status: "verified",
    lastVerified: LAST_VERIFIED,
    docs: [
      { id: "photo", kind: "photo", label: "Photograph", labelHi: "फोटो", uploaded: true, width: 413, height: 531, dpi: 300, dimText: "3.5 cm (width) × 4.5 cm (height)", minKB: 10, maxKB: 100, background: "white", notes: ["JPG/JPEG, 10–100 KB."] },
      { id: "signature", kind: "signature", label: "Signature", labelHi: "हस्ताक्षर", uploaded: true, width: 413, height: 177, dpi: 300, dimText: "3.5 cm (length) × 1.5 cm (height)", minKB: 3, maxKB: 30, background: "white", cleanup: true, notes: ["JPG/JPEG, 3–30 KB."] },
    ],
    highlights: ["Photo: JPG 10–100 KB, 3.5 × 4.5 cm.", "Signature: JPG 3–30 KB, 3.5 × 1.5 cm."],
    sources: [S.ctet26],
    faq: [
      { q: "What is the CTET photo size?", a: "JPG/JPEG between 10 KB and 100 KB, 3.5 cm wide × 4.5 cm high. Our preset outputs 413 × 531 px at 300 DPI." },
      { q: "What is the CTET signature size?", a: "JPG/JPEG between 3 KB and 30 KB, 3.5 cm × 1.5 cm. Our preset outputs 413 × 177 px at 300 DPI." },
      { q: "CTET फोटो साइज कितना है?", a: "फोटो 10–100 KB (3.5×4.5 सेमी) और सिग्नेचर 3–30 KB (3.5×1.5 सेमी), दोनों JPG में।" },
    ],
    keywords: ["CTET photo size", "CTET signature size 2026"],
  },

  /* ---------------- State PSCs ---------------- */
  {
    slug: "mpsc-photo-signature-size",
    id: "mpsc",
    name: "MPSC",
    nameHi: "एमपीएससी",
    fullName: "Maharashtra Public Service Commission (all exams via mpsconline.gov.in)",
    body: "Maharashtra Public Service Commission",
    group: "State PSC",
    cycle: "Current mpsconline profile instructions",
    status: "verified",
    lastVerified: LAST_VERIFIED,
    docs: [
      {
        id: "photo",
        kind: "photo",
        label: "Photograph",
        labelHi: "फोटो",
        uploaded: true,
        width: 413,
        height: 531,
        dpi: 300,
        dimText: "breadth 3.5 cm × height 4.5 cm",
        maxKB: 50,
        fileName: "mpsc-photo",
        background: "keep",
        notes: [
          "JPG/JPEG, maximum 50 KB. In formals, solid-colour background (the instructions say preferably blue, green or red) — so we do NOT whiten the background by default.",
          "No watermark, stamp or scanning-app name on the image. File name max 10 characters.",
        ],
      },
      { id: "signature", kind: "signature", label: "Signature", labelHi: "हस्ताक्षर", uploaded: true, width: 413, height: 177, dpi: 300, dimText: "breadth 3.5 cm × height 1.5 cm", maxKB: 50, fileName: "mpsc-sign", background: "white", cleanup: true, notes: ["Black ink on blank white paper, JPG/JPEG, maximum 50 KB. File name max 10 characters."] },
    ],
    highlights: ["Photo: 3.5 × 4.5 cm, JPG, max 50 KB, solid-colour background, formal clothes.", "Signature: 3.5 × 1.5 cm, JPG, max 50 KB, black ink on white paper."],
    sources: [S.mpsc],
    faq: [
      { q: "What is the MPSC photo size?", a: "3.5 cm × 4.5 cm, JPG/JPEG, maximum 50 KB, formal clothes with a solid-colour background. Keep the file name to 10 characters (our download is named mpsc-photo.jpg)." },
      { q: "MPSC फोटो साइज किती असावा?", a: "फोटो 3.5 × 4.5 सेमी, जास्तीत जास्त 50 KB (JPG). सही 3.5 × 1.5 सेमी, जास्तीत जास्त 50 KB, पांढऱ्या कागदावर काळ्या शाईने." },
    ],
    keywords: ["MPSC photo size", "MPSC signature size"],
  },
  {
    slug: "bpsc-photo-signature-size",
    id: "bpsc",
    name: "BPSC",
    nameHi: "बीपीएससी",
    fullName: "Bihar Public Service Commission (CCE and other exams)",
    body: "Bihar Public Service Commission",
    group: "State PSC",
    cycle: "bpsconline.bihar.gov.in user manual",
    status: "partial",
    lastVerified: LAST_VERIFIED,
    docs: [
      { id: "photo", kind: "photo", label: "Photograph (captured live)", labelHi: "फोटो (लाइव कैप्चर)", uploaded: false, notes: ["Captured live by webcam: face straight, eyes open, good light, light-coloured background, no cap/glasses/mask. Captured again at the application stage."] },
      {
        id: "signature-hi",
        kind: "signature",
        label: "Signature in Hindi",
        labelHi: "हिंदी में हस्ताक्षर",
        uploaded: true,
        width: 200,
        height: 280,
        dpi: 200,
        dimText: "less than 20 KB; width 150–220 px, height 250–320 px (as printed in the BPSC user manual)",
        pxRange: { minW: 150, maxW: 220, minH: 250, maxH: 320 },
        maxKB: 19.5,
        kbNote: "less than 20 KB",
        background: "white",
        cleanup: true,
        notes: ["Separate Hindi and English signature files are required.", "The manual's dimensions are unusual (taller than wide). If the portal shows different limits, follow the portal and use Custom size."],
      },
      {
        id: "signature-en",
        kind: "signature",
        label: "Signature in English",
        labelHi: "अंग्रेज़ी में हस्ताक्षर",
        uploaded: true,
        width: 200,
        height: 280,
        dpi: 200,
        dimText: "less than 20 KB; width 150–220 px, height 250–320 px (as printed in the BPSC user manual)",
        pxRange: { minW: 150, maxW: 220, minH: 250, maxH: 320 },
        maxKB: 19.5,
        kbNote: "less than 20 KB",
        background: "white",
        cleanup: true,
        notes: ["Not in capital letters."],
      },
    ],
    highlights: ["Photo: captured live by webcam — not uploaded.", "Two signatures (Hindi and English): each under 20 KB; the manual says width 150–220 px and height 250–320 px."],
    sources: [S.bpscManual],
    faq: [
      { q: "What is the BPSC signature size?", a: "The BPSC online application manual asks for separate Hindi and English signatures, each under 20 KB, width 150–220 px and height 250–320 px. Some coaching sites quote 220 × 100 px / 15 KB for recent CCE cycles — always follow the limits shown on the portal." },
      { q: "BPSC में फोटो अपलोड करनी है?", a: "नहीं, BPSC पोर्टल पर फोटो वेबकैम से लाइव ली जाती है। हिंदी और अंग्रेज़ी दोनों हस्ताक्षर अलग-अलग 20 KB से कम में अपलोड करें।" },
    ],
    keywords: ["BPSC photo size", "BPSC signature size", "BPSC Hindi signature size"],
  },
  {
    slug: "rpsc-photo-signature-size",
    id: "rpsc",
    name: "RPSC",
    nameHi: "आरपीएससी",
    fullName: "Rajasthan Public Service Commission (RAS and other exams via SSO Recruitment Portal)",
    body: "Rajasthan Public Service Commission",
    group: "State PSC",
    cycle: "OTR guidelines released 19 May 2026",
    status: "unverified",
    lastVerified: LAST_VERIFIED,
    docs: [
      { id: "photo", kind: "photo", label: "Photograph (captured live)", labelHi: "फोटो (लाइव कैप्चर)", uploaded: false, notes: ["OTR KYC captures a live photo through the portal."] },
      { id: "signature", kind: "signature", label: "Signature (Hindi / English)", labelHi: "हस्ताक्षर (हिंदी/अंग्रेज़ी)", uploaded: true, background: "white", cleanup: true, notes: ["Size limits are not published in the OTR manual — use Custom size with the limits the portal shows."] },
      { id: "thumb", kind: "thumb", label: "Left-hand thumb impression", labelHi: "बाएं हाथ के अंगूठे का निशान", uploaded: true, background: "white", cleanup: true, notes: ["Size limits are not published in the OTR manual."] },
      { id: "declaration", kind: "declaration", label: "Handwritten specimen", labelHi: "हस्तलिखित नमूना", uploaded: true, background: "white", cleanup: true, notes: ["Size limits are not published in the OTR manual."] },
    ],
    highlights: ["Photo: live capture in OTR KYC.", "Signature (Hindi/English), handwritten specimen and left thumb are uploaded, but RPSC's OTR manual does not publish KB/pixel limits — we could not verify them, so use Custom size."],
    sources: [S.rpscOtr],
    keywords: ["RPSC photo size", "RPSC signature size", "RAS photo size"],
  },
  {
    slug: "uppsc-photo-signature-size",
    id: "uppsc",
    name: "UPPSC",
    nameHi: "यूपीपीएससी",
    fullName: "Uttar Pradesh Public Service Commission (PCS and other exams via OTR)",
    body: "Uttar Pradesh Public Service Commission",
    group: "State PSC",
    cycle: "OTR (otr.pariksha.nic.in)",
    status: "unverified",
    lastVerified: LAST_VERIFIED,
    docs: [
      { id: "photo", kind: "photo", label: "Photograph", labelHi: "फोटो", uploaded: true, background: "white", notes: ["Uploaded once in OTR. Official KB/pixel limits could not be read on the verification date — use Custom size with the limits shown on the OTR page."] },
      { id: "signature", kind: "signature", label: "Signature", labelHi: "हस्ताक्षर", uploaded: true, background: "white", cleanup: true, notes: ["Uploaded once in OTR. Limits not verified."] },
    ],
    highlights: ["UPPSC uses One Time Registration (OTR): photo and signature are uploaded once and reused for every post.", "We could not verify the official KB/pixel limits, so this preset is info-only — use Custom size."],
    sources: [S.uppscOtr],
    keywords: ["UPPSC photo size", "UPPSC signature size", "UPPSC OTR photo size"],
  },
  {
    slug: "mppsc-photo-signature-size",
    id: "mppsc",
    name: "MPPSC",
    nameHi: "एमपीपीएससी",
    fullName: "Madhya Pradesh Public Service Commission (State Service Exam)",
    body: "Madhya Pradesh Public Service Commission",
    group: "State PSC",
    cycle: "State Service Exam 2026 (Advt. 29/2025)",
    status: "unverified",
    lastVerified: LAST_VERIFIED,
    docs: [
      { id: "photo", kind: "photo", label: "Photograph (with name & date)", labelHi: "फोटो (नाम व तारीख सहित)", uploaded: true, width: 413, height: 531, dpi: 300, dimText: "Not verified — we output 3.5 × 4.5 cm", minKB: 20, maxKB: 100, background: "white", dateNameStrip: true, notes: ["UNVERIFIED (secondary source): 20–100 KB, recent colour photo with your name and the photo date shown."] },
      { id: "signature", kind: "signature", label: "Signature", labelHi: "हस्ताक्षर", uploaded: true, width: 413, height: 177, dpi: 300, dimText: "Not verified — we output 3.5 × 1.5 cm", minKB: 10, maxKB: 100, background: "white", cleanup: true, notes: ["UNVERIFIED (secondary source): 10–100 KB, black ink, not in capital letters."] },
    ],
    highlights: ["UNVERIFIED: numbers come from coaching/job sites, not the official advertisement. Check the MPOnline form before uploading."],
    sources: [S.mppscSecondary],
    keywords: ["MPPSC photo size", "MPPSC signature size"],
  },
];

export const PRESET_BY_SLUG: Record<string, ExamPreset> = Object.fromEntries(PRESETS.map((p) => [p.slug, p]));
export const PRESET_BY_ID: Record<string, ExamPreset> = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
export const GROUPS = ["SSC", "UPSC", "Banking", "Railways", "NTA / Entrance", "Teaching", "State PSC"] as const;

/** True when we can generate a compliant file for this doc. */
export function isResizable(d: DocSpec): d is DocSpec & { width: number; height: number; maxKB: number } {
  return d.uploaded && !!d.width && !!d.height && !!d.maxKB;
}

export function kbText(d: DocSpec) {
  if (d.kbNote) return d.kbNote;
  if (!d.maxKB) return "Not published";
  return d.minKB && d.minKB > 1 ? `${d.minKB}–${d.maxKB} KB` : `up to ${d.maxKB} KB`;
}

export function statusLabel(s: Status) {
  return s === "verified" ? "Verified from official notice" : s === "partial" ? "From official common guidelines" : "Unverified";
}
