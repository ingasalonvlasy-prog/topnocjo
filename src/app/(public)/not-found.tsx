import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-24 text-center">
      <h1 className="text-[56px] font-extrabold text-line tracking-[-0.04em] mb-4">404</h1>
      <p className="text-[18px] font-bold text-ink mb-2">Tady nic není.</p>
      <p className="text-[14px] text-muted font-medium mb-8">Venku je tvoje hřiště.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-navy text-white text-[14px] font-extrabold uppercase tracking-[0.12em] px-8 h-12 rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
      >
        Zpět na hlavní stránku
      </Link>
    </div>
  );
}
