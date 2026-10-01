import { LAST_UPDATED } from "@/lib/site";

export function LegalPage({ title, children, updated = true }: { title: string; children: React.ReactNode; updated?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-[30px] font-extrabold text-slate-900">{title}</h1>
      {updated && <p className="mt-1 text-[13px] text-slate-500">Last updated: {LAST_UPDATED}</p>}
      <div className="prose-x mt-6">{children}</div>
    </div>
  );
}
