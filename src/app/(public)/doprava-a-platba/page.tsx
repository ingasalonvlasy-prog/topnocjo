import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doprava a platba | Qsport.cz",
  description: "Informace o způsobech dopravy a platby na Qsport.cz",
  openGraph: { title: "Doprava a platba | Qsport.cz", description: "Informace o způsobech dopravy a platby na Qsport.cz" },
};

export default function ShippingPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">Doprava a platba</span>
      </nav>

      <div className="max-w-[780px]">
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
          Doprava a platba
        </h1>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Doprava</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Objednávky doručujeme prostřednictvím Zásilkovny na výdejní místa po celé České republice.
          Standardní doba doručení je 2–5 pracovních dní.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-[16px] text-ink mb-4">
          <li><strong>Zásilkovna</strong> — od 49 Kč (výdejní místo)</li>
          <li><strong>Osobní vyzvednutí</strong> — zdarma (po domluvě)</li>
        </ul>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Platba</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Platbu zpracováváme bezpečně přes platební bránu Comgate.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-[16px] text-ink">
          <li><strong>Platba kartou</strong> — Visa, Mastercard</li>
          <li><strong>Bankovní převod</strong> — po potvrzení objednávky</li>
        </ul>
      </div>
    </div>
  );
}
