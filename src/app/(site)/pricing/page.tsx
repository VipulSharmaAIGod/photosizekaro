import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { PRICES, rupees, UNLOCK_VALIDITY_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: `Pricing – Free Resizer, ${rupees(PRICES.kit.amountPaise)} Exam Kit`,
  description: `All exam photo and signature downloads are free. Optional Exam Kit ${rupees(PRICES.kit.amountPaise)} one-time: batch ZIP for many exams and print-ready passport photo sheets.`,
  alternates: { canonical: "/pricing" },
};

export default function Pricing() {
  return (
    <LegalPage title="Pricing">
      <p>All prices are in Indian Rupees (INR) and are the final amount you pay. Payments are one-time — no subscription and no auto-renewal.</p>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>₹0</td>
            <td>Every exam preset and the custom-size tool: crop, background whitening, signature cleanup, name/date strip, exact pixels and KB. Unlimited downloads, no watermark, no login.</td>
          </tr>
          <tr>
            <td>{PRICES.kit.label}</td>
            <td>{rupees(PRICES.kit.amountPaise)}</td>
            <td>{PRICES.kit.features.join("; ")}.</td>
          </tr>
        </tbody>
      </table>
      <h2>What exactly am I buying?</h2>
      <p>
        A digital unlock of the Exam Kit features on this website for {UNLOCK_VALIDITY_DAYS} days. Files are generated instantly in your browser. The unlock is saved in your browser; you can restore it on another
        device with your Razorpay payment ID.
      </p>
      <h2>Payment methods</h2>
      <p>UPI (Google Pay, PhonePe, Paytm, BHIM), debit/credit cards, netbanking and wallets, processed securely by Razorpay. We never see or store your card or UPI details.</p>
      <h2>Delivery and refunds</h2>
      <p>
        Instant and digital — see our <Link href="/shipping-policy">Delivery Policy</Link> and <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
      </p>
    </LegalPage>
  );
}
