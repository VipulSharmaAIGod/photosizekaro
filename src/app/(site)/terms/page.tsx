import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { BRAND, OWNER, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms and Conditions", description: `Terms of use for ${BRAND}.`, alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms and Conditions">
      <p>
        These Terms govern your use of {BRAND} at {SITE_URL} (the “Service”), operated by {OWNER.legalName}, an individual based in {OWNER.city}, India (“we”, “us”). By using the Service you agree to
        these Terms.
      </p>
      <h2>1. The Service</h2>
      <p>
        {BRAND} is an online tool that resizes and compresses images (photographs, signatures, thumb impressions, declarations) to the sizes published by exam conducting bodies. Single-file
        use is free. The optional Exam Kit is described on our <Link href="/pricing">Pricing</Link> page.
      </p>
      <h2>2. No affiliation; your responsibility</h2>
      <ul>
        <li>We are not affiliated with any commission, board, bank, university or government body. Presets reflect our reading of official documents on the “last verified” date shown on each page.</li>
        <li>Rules change between notification cycles. You are responsible for checking the current official notification and the limits shown on the application portal before uploading.</li>
        <li>We are not responsible for rejection of any application. Where a preset is marked “Unverified”, treat its numbers as a starting point only.</li>
      </ul>
      <h2>3. Your images</h2>
      <ul>
        <li>Use only your own photo/signature, or images you are authorised to use. Do not use the Service to forge, impersonate or alter identity documents.</li>
        <li>Processing happens on your device; we do not receive or keep your images.</li>
      </ul>
      <h2>4. Payments</h2>
      <ul>
        <li>Prices are shown in INR before payment. Payments are processed by Razorpay; their terms also apply.</li>
        <li>The Exam Kit unlock is valid for 365 days from purchase and is stored in your browser. You can restore it with your payment ID.</li>
        <li>Refunds are governed by our <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</li>
      </ul>
      <h2>5. Acceptable use</h2>
      <p>Do not attempt to bypass payment, overload or attack the Service, or scrape it. We may rate-limit or block abusive use.</p>
      <h2>6. Intellectual property</h2>
      <p>The website, presets compilation and code belong to us. Files you generate are yours.</p>
      <h2>7. Disclaimer and limitation of liability</h2>
      <p>The Service is provided “as is”. To the maximum extent permitted by law, our total liability for any claim is limited to the amount you paid us for the relevant purchase.</p>
      <h2>8. Governing law</h2>
      <p>These Terms are governed by the laws of India. Courts at {OWNER.city} shall have exclusive jurisdiction.</p>
      <h2>9. Contact</h2>
      <p>
        {OWNER.legalName} · {OWNER.email} · {OWNER.phone} · {OWNER.address}
      </p>
    </LegalPage>
  );
}
