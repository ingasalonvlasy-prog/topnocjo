import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O nás | Qsport.cz",
  description: "Kdo stojí za Qsport.cz – sportovní e-shop s vybavením, co drží tempo.",
  openGraph: { title: "O nás | Qsport.cz", description: "Kdo stojí za Qsport.cz – sportovní e-shop s vybavením, co drží tempo." },
};

export default function AboutPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">O nás</span>
      </nav>

      <div className="max-w-[780px]">
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
          O nás
        </h1>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Kdo jsme</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Qsport.cz je český e-shop se sportovním vybavením. Věříme, že kvalitní výbava je základ
          každého sportovního zážitku — ať už běháte maraton, sjíždíte sjezdovky, nebo se vydáváte
          na trek do hor.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Náš příběh</h2>
        <p className="text-[16px] text-ink leading-relaxed mb-4">
          Vznikli jsme z lásky ke sportu a frustrace z nepřehledných e-shopů. Chceme, aby nákup
          sportovního vybavení byl jednoduchý, přehledný a spolehlivý. Vybíráme jen značky, kterým
          sami důvěřujeme — On Running, Mizuno, POC, Husky a další.
        </p>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Proč Qsport</h2>
        <ul className="list-disc pl-5 space-y-2 text-[16px] text-ink mb-4">
          <li>Pečlivě vybraný sortiment od prověřených značek</li>
          <li>Rychlé doručení přes Zásilkovnu</li>
          <li>Nákup bez registrace, jednoduché vrácení</li>
          <li>Osobní přístup a odborné poradenství</li>
        </ul>

        <h2 className="text-[22px] font-extrabold text-navy mt-10 mb-4">Kde nás najdete</h2>
        <p className="text-[16px] text-ink leading-relaxed">
          Jsme online — obsluhujeme celou Českou republiku. Máte dotaz? Napište nám
          na{" "}
          <a href="mailto:obchod@qsport.cz" className="text-blue hover:underline">obchod@qsport.cz</a>
          {" "}nebo zavolejte na{" "}
          <a href="tel:+420777447464" className="text-blue hover:underline">+420 777 447 464</a>.
        </p>
      </div>
    </div>
  );
}
