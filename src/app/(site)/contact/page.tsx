import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { BRAND, OWNER } from "@/lib/site";

export const metadata: Metadata = { title: "Contact Us", description: `Contact ${BRAND} for help with a preset, a changed exam rule or a payment.`, alternates: { canonical: "/contact" } };

export default function Contact() {
  return (
    <LegalPage title="Contact Us" updated={false}>
      <p>We reply to every email, usually within 1–2 working days. If an exam changed its photo/signature rules, please send us the notification link — we update presets quickly.</p>
      <table>
        <tbody>
          <tr>
            <th>Operated by</th>
            <td>{OWNER.legalName}</td>
          </tr>
          <tr>
            <th>Email</th>
            <td>{OWNER.email}</td>
          </tr>
          <tr>
            <th>Phone</th>
            <td>{OWNER.phone}</td>
          </tr>
          <tr>
            <th>Address</th>
            <td>{OWNER.address}</td>
          </tr>
          <tr>
            <th>Support hours</th>
            <td>Monday–Saturday, 10:00 AM – 6:00 PM IST</td>
          </tr>
        </tbody>
      </table>
      <h2>Payment issue?</h2>
      <p>
        Include your Razorpay payment ID (starts with <code>pay_</code>). Most issues are fixed instantly with “Restore purchase” on the {BRAND} Exam Kit page.
      </p>
    </LegalPage>
  );
}
