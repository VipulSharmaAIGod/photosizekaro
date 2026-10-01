import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { BRAND, SITE_URL } from "@/lib/site";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const ui = Noto_Sans({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Exam Photo & Signature Resizer – SSC, IBPS, UPSC, NEET 2026 | ${BRAND}`,
    template: `%s | ${BRAND}`,
  },
  description:
    "Resize your photo, signature, thumb impression and declaration to the exact pixels and KB for SSC, UPSC, IBPS, SBI, RRB, NEET, JEE, CUET, GATE, CTET and state PSC forms. Free, in your browser — nothing is uploaded.",
  applicationName: BRAND,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: BRAND, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1546a0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${ui.variable} ${deva.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
