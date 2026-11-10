import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reklamace | Qsport.cz",
  description: "Reklamační řád a podmínky pro uplatnění reklamace na Qsport.cz",
};

export default function ComplaintsPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">Reklamace</span>
      </nav>

      <div className="max-w-[780px]">
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
          Reklamace
        </h1>

        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Pokud jste obdrželi vadné zboží, máte právo uplatnit reklamaci v zákonné lhůtě 24 měsíců
          od převzetí.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Jak reklamovat</h2>
        <ol className="list-decimal pl-5 space-y-2 text-[16px] text-ink mb-4">
          <li>Kontaktujte nás na <a href="mailto:obchod@qsport.cz" className="text-blue hover:underline">obchod@qsport.cz</a> s popisem vady a číslem objednávky</li>
          <li>Přiložte fotodokumentaci vady</li>
          <li>Zboží odešlete na naši adresu spolu s kopií dokladu o nákupu</li>
        </ol>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Záruční podmínky</h2>
        <ul className="list-disc pl-5 space-y-2 text-[16px] text-ink mb-4">
          <li>Záruční doba je 24 měsíců od převzetí zboží</li>
          <li>Reklamace se nevztahuje na běžné opotřebení a mechanické poškození</li>
          <li>Reklamaci vyřídíme nejpozději do 30 kalendářních dní</li>
        </ul>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Kontakt pro reklamace</h2>
        <p className="text-[16px] text-ink leading-relaxed">
          E-mail: <a href="mailto:obchod@qsport.cz" className="text-blue hover:underline">obchod@qsport.cz</a><br />
          Telefon: <a href="tel:+420777447464" className="text-blue hover:underline">+420 777 447 464</a>
        </p>
      </div>
    </div>
  );
}
