import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { BRAND, OWNER } from "@/lib/site";

export const metadata: Metadata = { title: "About Us", description: `About ${BRAND}, the free exam photo and signature resizer.`, alternates: { canonical: "/about" } };

export default function About() {
  return (
    <LegalPage title={`About ${BRAND}`} updated={false}>
      <p>
        {BRAND} helps students and job aspirants in India prepare the photo, signature, thumb impression and declaration files that government exam forms demand — at the exact pixel size
        and KB range — on a phone, in a minute, for free.
      </p>
      <p>
        Every preset is built from the official notification or portal instructions, with a link and the date we last checked it. Where we could not confirm a rule officially, the preset is
        marked “Unverified”. All image processing runs in your browser; we never receive your photos.
      </p>
      <p>
        {BRAND} is an independent tool run by {OWNER.legalName} from {OWNER.city}, India. It is not affiliated with SSC, UPSC, IBPS, SBI, RRBs, NTA, CBSE, IITs or any public service commission.
        Questions or a rule that changed? <Link href="/contact">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
