import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GenericPageView } from "@/components/seo/GenericPage";
import { ExamPage } from "@/components/seo/ExamPage";
import { examDescription, examTitle, GENERIC_BY_SLUG, GENERIC_PAGES } from "@/content/seo";
import { PRESET_BY_SLUG, PRESETS } from "@/data/presets";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...PRESETS.map((p) => ({ slug: p.slug })), ...GENERIC_PAGES.map((g) => ({ slug: g.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = PRESET_BY_SLUG[slug];
  if (p) {
    const title = examTitle(p);
    const description = examDescription(p);
    return {
      title: { absolute: title },
      description,
      keywords: p.keywords,
      alternates: { canonical: `/${p.slug}` },
      openGraph: { title, description, url: `/${p.slug}`, type: "article" },
    };
  }
  const g = GENERIC_BY_SLUG[slug];
  if (!g) return {};
  return {
    title: { absolute: g.title },
    description: g.description,
    alternates: { canonical: `/${g.slug}` },
    openGraph: { title: g.title, description: g.description, url: `/${g.slug}`, locale: g.lang === "hi" ? "hi_IN" : "en_IN" },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PRESET_BY_SLUG[slug];
  if (p) return <ExamPage p={p} />;
  const g = GENERIC_BY_SLUG[slug];
  if (!g) notFound();
  return <GenericPageView g={g} />;
}
