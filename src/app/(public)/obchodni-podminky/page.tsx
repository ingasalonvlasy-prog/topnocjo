import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description: "Obchodní podmínky e-shopu Qsport.cz",
  openGraph: { title: "Obchodní podmínky", description: "Obchodní podmínky e-shopu Qsport.cz" },
};

export default function TermsPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">Obchodní podmínky</span>
      </nav>

      <div className="max-w-[780px]">
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
          Obchodní podmínky
        </h1>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">1. Úvodní ustanovení</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Tyto obchodní podmínky upravují vzájemná práva a povinnosti prodávajícího a kupujícího
          vzniklé v souvislosti s nákupem zboží prostřednictvím e-shopu Qsport.cz.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">2. Objednávka a uzavření smlouvy</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Objednávka odeslaná prostřednictvím e-shopu je závazná. Smlouva je uzavřena okamžikem
          potvrzení objednávky prodávajícím.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">3. Ceny a platba</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Všechny ceny jsou uvedeny včetně DPH. Platbu je možné provést kartou online
          nebo bankovním převodem přes platební bránu Comgate.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">4. Dodání zboží</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Zboží doručujeme prostřednictvím Zásilkovny. Standardní doba dodání je 2–5 pracovních dní.
          Osobní vyzvednutí je možné po předchozí domluvě.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">5. Odstoupení od smlouvy</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Kupující má právo odstoupit od smlouvy bez udání důvodu do 14 dnů od převzetí zboží.
          Podrobnosti naleznete na stránce{" "}
          <Link href="/vraceni-zbozi" className="text-blue hover:underline">Vrácení zboží</Link>.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">6. Reklamace</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Reklamace se řídí platným reklamačním řádem. Podrobnosti na stránce{" "}
          <Link href="/reklamace" className="text-blue hover:underline">Reklamace</Link>.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">7. Ochrana osobních údajů</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Osobní údaje zpracováváme v souladu s nařízením GDPR. Údaje slouží výhradně ke zpracování
          objednávek a komunikaci se zákazníkem. Podrobnosti budou upřesněny v samostatném dokumentu.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">8. Závěrečná ustanovení</h2>
        <p className="text-[16px] text-ink leading-relaxed">
          Tyto obchodní podmínky jsou platné od 1. 11. 2026. Prodávající si vyhrazuje právo
          na jejich změnu. Aktuální verze je vždy dostupná na této stránce.
        </p>
      </div>
    </div>
  );
}
