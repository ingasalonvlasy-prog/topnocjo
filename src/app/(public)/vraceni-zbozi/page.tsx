import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vrácení zboží | Qsport.cz",
  description: "Podmínky vrácení zboží na Qsport.cz — 14 dní na vrácení bez udání důvodu.",
  openGraph: { title: "Vrácení zboží | Qsport.cz", description: "Podmínky vrácení zboží na Qsport.cz — 14 dní na vrácení bez udání důvodu." },
};

export default function ReturnsPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">Vrácení zboží</span>
      </nav>

      <div className="max-w-[780px]">
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
          Vrácení zboží
        </h1>

        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Máte právo odstoupit od kupní smlouvy bez udání důvodu do 14 dnů od převzetí zboží.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Podmínky vrácení</h2>
        <ul className="list-disc pl-5 space-y-2 text-[16px] text-ink mb-4">
          <li>Zboží musí být nepoužité, nepoškozené a v původním obalu</li>
          <li>Přiložte kopii dokladu o nákupu</li>
          <li>Lhůta 14 dnů začíná dnem převzetí zboží</li>
        </ul>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Jak na to</h2>
        <ol className="list-decimal pl-5 space-y-2 text-[16px] text-ink mb-4">
          <li>Napište nám na <a href="mailto:obchod@qsport.cz" className="text-blue hover:underline">obchod@qsport.cz</a> s číslem objednávky</li>
          <li>Zabalte zboží do původního obalu a odešlete na naši adresu</li>
          <li>Po kontrole zboží vám vrátíme peníze do 14 dnů</li>
        </ol>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Vrácení peněz</h2>
        <p className="text-[16px] text-ink leading-relaxed">
          Peníze vrátíme stejným způsobem, jakým byla provedena platba, a to nejpozději
          do 14 dnů od doručení vráceného zboží.
        </p>
      </div>
    </div>
  );
}
