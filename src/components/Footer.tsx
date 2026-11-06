import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-navy text-white mt-auto">
      <div className="max-w-[var(--container)] mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr] gap-10 mb-12">
          {/* Brand — white SVG logo */}
          <div>
            <Image
              src="/qsport-logo-web-bila.svg"
              alt="QSPORT.cz"
              width={140}
              height={38}
              className="h-[28px] w-auto mb-2"
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-0">
              výkon bez kompromisů
            </p>
          </div>

          {/* NAKUPOVÁNÍ */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">Nakupování</h4>
            <ul className="space-y-2.5">
              <li><Link href="/kategorie/beh" className="text-[13px] text-white/70 hover:text-white transition-colors">Běh</Link></li>
              <li><Link href="/kategorie/hory-a-outdoor" className="text-[13px] text-white/70 hover:text-white transition-colors">Hory a outdoor</Link></li>
              <li><Link href="/kategorie/zima" className="text-[13px] text-white/70 hover:text-white transition-colors">Zima</Link></li>
              <li><Link href="/bazar" className="text-[13px] text-white/70 hover:text-white transition-colors">Bazar</Link></li>
              <li><Link href="/akce" className="text-[13px] text-white/70 hover:text-white transition-colors">Akce</Link></li>
            </ul>
          </div>

          {/* ZÁKAZNICKÝ SERVIS */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">Zákaznický servis</h4>
            <ul className="space-y-2.5">
              <li><Link href="/doprava" className="text-[13px] text-white/70 hover:text-white transition-colors">Doprava a platba</Link></li>
              <li><Link href="/reklamace" className="text-[13px] text-white/70 hover:text-white transition-colors">Vrácení zboží</Link></li>
              <li><Link href="/reklamace" className="text-[13px] text-white/70 hover:text-white transition-colors">Reklamace</Link></li>
              <li><Link href="/velikosti" className="text-[13px] text-white/70 hover:text-white transition-colors">Velikosti</Link></li>
            </ul>
          </div>

          {/* O NÁS */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">O nás</h4>
            <ul className="space-y-2.5">
              <li><Link href="/o-nas" className="text-[13px] text-white/70 hover:text-white transition-colors">Kdo jsme</Link></li>
              <li><Link href="/znacky" className="text-[13px] text-white/70 hover:text-white transition-colors">Značky</Link></li>
              <li><Link href="/obchodni-podminky" className="text-[13px] text-white/70 hover:text-white transition-colors">Obchodní podmínky</Link></li>
            </ul>
          </div>

          {/* KONTAKT */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">Kontakt</h4>
            <ul className="space-y-2.5">
              <li><a href="mailto:obchod@qsport.cz" className="text-[13px] text-white/70 hover:text-white transition-colors">obchod@qsport.cz</a></li>
              <li><a href="tel:+420777447464" className="text-[13px] text-white/70 hover:text-white transition-colors">+420 777 447 464</a></li>
              <li className="flex gap-3 pt-1">
                <a href="https://instagram.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40 hover:text-white transition-colors">Instagram</a>
                <a href="https://facebook.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40 hover:text-white transition-colors">Facebook</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[12px] text-white/30">
          <span>&copy; 2026 Qsport.cz</span>
        </div>
      </div>
    </footer>
  );
}
