import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { BRAND, OWNER, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: `How ${BRAND} handles your data — your photos never leave your device.`, alternates: { canonical: "/privacy-policy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains how {BRAND} ({SITE_URL}), operated by {OWNER.legalName} (“we”, “us”), handles information when you use our exam photo and signature resizer. We built the product so
        that we collect as little personal data as possible.
      </p>
      <h2>1. Your photos and signatures stay on your device</h2>
      <p>
        Images you choose are opened, cropped, cleaned, resized and compressed entirely inside your browser using your device&apos;s own processing. They are not uploaded to, stored on, or viewable by our
        servers. The name and date you type for a photo strip are also used only in your browser. Closing the page discards them.
      </p>
      <h2>2. Payments</h2>
      <p>
        If you buy the Exam Kit, payment is processed by Razorpay Software Private Limited, which collects the information needed for the transaction (for example phone number, email and payment
        method) under its own privacy policy. We receive the payment ID, order ID, amount and status to verify the payment and issue your unlock. We do not receive card numbers, UPI PINs or
        banking passwords. Your unlock code is stored in your browser&apos;s local storage.
      </p>
      <h2>3. Logs, cookies and analytics</h2>
      <p>
        Our hosting provider (Render) records basic technical logs (such as IP address, browser type and time of request) for security, abuse prevention and rate-limiting. We do not use
        advertising cookies at present. If we add analytics or advertising (such as Google AdSense) in future, we will update this policy and, where required, ask for your consent.
      </p>
      <h2>4. Sharing</h2>
      <p>We do not sell personal data. We share data only with the service providers described above (hosting, payments) or when required by law.</p>
      <h2>5. Children</h2>
      <p>Students under 18 should use the paid features with the consent of a parent or guardian.</p>
      <h2>6. Your rights</h2>
      <p>
        Because your images are never stored by us, there is nothing to delete on our side. To remove your unlock code, clear your browser storage. For any privacy question or a request under
        the Digital Personal Data Protection Act, 2023, contact us at {OWNER.email}.
      </p>
      <h2>7. Changes</h2>
      <p>We may update this policy. The “Last updated” date above shows the latest version.</p>
      <h2>8. Contact / Grievance Officer</h2>
      <p>
        {OWNER.legalName}
        <br />
        Email: {OWNER.email}
        <br />
        Phone: {OWNER.phone}
        <br />
        Address: {OWNER.address}
      </p>
    </LegalPage>
  );
}
