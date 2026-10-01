import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { BRAND, OWNER } from "@/lib/site";

export const metadata: Metadata = { title: "Shipping & Delivery Policy", description: `${BRAND} delivers digital products instantly. No physical shipping.`, alternates: { canonical: "/shipping-policy" } };

export default function Shipping() {
  return (
    <LegalPage title="Shipping & Delivery Policy">
      <p>{BRAND} sells digital products only. Nothing is shipped physically and no prints are mailed.</p>
      <ul>
        <li>Delivery is instant: as soon as your payment is confirmed, the Exam Kit features unlock on the same page.</li>
        <li>You download the ZIP and print sheets directly in your browser.</li>
        <li>If the unlock does not appear within 10 minutes of a successful payment, use “Restore purchase” on the Exam Kit page, or email {OWNER.email} with your payment ID.</li>
      </ul>
    </LegalPage>
  );
}
