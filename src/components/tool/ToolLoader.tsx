"use client";
import dynamic from "next/dynamic";

const Loading = () => <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-busy />;

/** The resizer is client-only (canvas). Loading it lazily keeps SEO pages light and fast. */
export const ExamToolLazy = dynamic(() => import("./ExamTool").then((m) => m.ExamTool), { ssr: false, loading: Loading });
export const CustomToolLazy = dynamic(() => import("./CustomTool").then((m) => m.CustomTool), { ssr: false, loading: Loading });
export const KitToolLazy = dynamic(() => import("./KitTool").then((m) => m.KitTool), { ssr: false, loading: Loading });
