import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-[14px] font-semibold text-slate-700">
          <Link href="/#exams" className="hidden rounded-lg px-3 py-2 hover:bg-slate-100 sm:block">
            Exams
          </Link>
          <Link href="/custom-size" className="hidden rounded-lg px-3 py-2 hover:bg-slate-100 sm:block">
            Custom size
          </Link>
          <Link href="/exam-kit" className="rounded-xl bg-brand px-3.5 py-2 text-white shadow-sm hover:bg-brand-dark">
            Exam Kit
          </Link>
        </nav>
      </div>
    </header>
  );
}
