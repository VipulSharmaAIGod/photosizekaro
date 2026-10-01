import { statusLabel, type Status } from "@/data/presets";

export function StatusBadge({ status }: { status: Status }) {
  const cls = status === "verified" ? "bg-emerald-100 text-emerald-900" : status === "partial" ? "bg-sky-100 text-sky-900" : "bg-amber-100 text-amber-900";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ${cls}`} data-status={status}>{status === "unverified" ? "⚠ " : "✓ "}{statusLabel(status)}</span>;
}
