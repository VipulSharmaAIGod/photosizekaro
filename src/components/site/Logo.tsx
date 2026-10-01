import Link from "next/link";
import { BRAND } from "@/lib/site";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#1546a0" />
      <rect x="14" y="12" width="28" height="36" rx="4" fill="#fff" />
      <circle cx="28" cy="25" r="6" fill="#1546a0" />
      <path d="M18 44c1-7 5-10 10-10s9 3 10 10z" fill="#1546a0" />
      <path d="M40 40l10 10M50 40v10H40" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${BRAND} home`}>
      <LogoMark />
      <span className="text-[19px] font-extrabold tracking-tight text-slate-900">
        PhotoSize<span className="text-brand">Karo</span>
      </span>
    </Link>
  );
}
