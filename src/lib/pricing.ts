/**
 * Pricing (INR) — one optional paid product, everything compliant stays free.
 *
 * Why ₹29 "Exam Kit" (and not ads-off or per-file fees):
 *  - The free single-file download IS the SEO product: anyone landing on "SSC CGL signature size" must get a
 *    compliant file with zero friction, otherwise they bounce and rankings drop. So nothing that is needed to
 *    apply is ever paywalled or watermarked.
 *  - What people genuinely pay for offline is time and printing: a cyber café charges ₹20–50 to resize/print
 *    exam photos. The kit replaces that trip: (1) one tap → a ZIP with photo + signature (+ thumb/declaration)
 *    sized for EVERY exam they pick (aspirants apply to 5–10 exams a year), and (2) print-ready passport-photo
 *    sheets (A4 PDF with 30 photos at true 3.5×4.5 cm, 4×6″ sheet with 8, NEET postcard 4×6″) — SSC asks
 *    non-Aadhaar candidates to bring 2 photos, NEET asks for 6–8 passport + 4–6 postcard prints.
 *  - ₹29 is an impulse UPI amount (below the ₹49 BiodataKaro basic), still ~₹28.3 net after Razorpay's
 *    ~2% + GST. ₹19 would leave the same fee but less margin with no conversion gain expected at this level.
 *  - "No ads" is intentionally NOT sold yet because no ads run today; add it to the kit when AdSense goes live.
 * Payments stay disabled in production until Razorpay keys exist (see lib/payments).
 */
export type Sku = "kit";

export const PRICES: Record<Sku, { amountPaise: number; label: string; features: string[] }> = {
  kit: {
    amountPaise: 2900,
    label: "Exam Kit",
    features: [
      "One-tap ZIP: photo + signature (+ thumb & declaration) for every exam you select",
      "Print-ready passport photo sheets: A4 PDF (30 photos, true 3.5×4.5 cm) and 4×6″ sheet (8 photos)",
      "NEET postcard (4×6″) print file",
      "Unlimited use on this device for 1 year · restore anywhere with your payment ID",
    ],
  },
};

export const UNLOCK_VALIDITY_DAYS = 365;

export function rupees(paise: number) {
  return `₹${Math.round(paise / 100)}`;
}
