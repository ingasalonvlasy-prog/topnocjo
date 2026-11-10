import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="text-center max-w-md">
        <div className="text-[72px] font-extrabold text-wash leading-none mb-2">
          404
        </div>
        <h1 className="text-[22px] font-extrabold text-navy mb-2">
          Stránka nenalezena
        </h1>
        <p className="text-[14px] text-muted mb-8">
          Omlouváme se, hledaná stránka neexistuje nebo byla přesunuta.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="h-[44px] px-6 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors flex items-center"
          >
            Hlavní stránka
          </Link>
          <Link
            href="/kategorie"
            className="h-[44px] px-6 border border-line text-ink text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)] hover:border-navy transition-colors flex items-center"
          >
            Kategorie
          </Link>
        </div>
      </div>
    </div>
  );
}
