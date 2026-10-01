import type { MetadataRoute } from "next";
import { GENERIC_PAGES } from "@/content/seo";
import { LAST_VERIFIED, PRESETS } from "@/data/presets";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(LAST_VERIFIED);
  const main = [
    { path: "/", priority: 1, freq: "weekly" as const },
    ...PRESETS.map((p) => ({ path: `/${p.slug}`, priority: p.status === "unverified" ? 0.6 : 0.9, freq: "weekly" as const })),
    ...GENERIC_PAGES.map((g) => ({ path: `/${g.slug}`, priority: 0.8, freq: "monthly" as const })),
    { path: "/custom-size", priority: 0.7, freq: "monthly" as const },
    { path: "/exam-kit", priority: 0.7, freq: "monthly" as const },
    { path: "/pricing", priority: 0.4, freq: "monthly" as const },
    { path: "/about", priority: 0.3, freq: "yearly" as const },
    { path: "/contact", priority: 0.3, freq: "yearly" as const },
    { path: "/privacy-policy", priority: 0.2, freq: "yearly" as const },
    { path: "/terms", priority: 0.2, freq: "yearly" as const },
    { path: "/refund-policy", priority: 0.2, freq: "yearly" as const },
    { path: "/shipping-policy", priority: 0.2, freq: "yearly" as const },
  ];
  return main.map((m) => ({ url: `${SITE_URL}${m.path === "/" ? "" : m.path}`, lastModified: now, changeFrequency: m.freq, priority: m.priority }));
}
