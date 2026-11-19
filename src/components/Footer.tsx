import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-navy text-white mt-auto">
      <div className="max-w-[var(--container)] mx-auto px-6 pt-14 pb-8">
        {/* Desktop: grid layout */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr] gap-10 mb-12">
          {/* Brand — white SVG logo */}
          <div>
            <Image
              src="/qsport-logo-web-bila.svg"
              alt="QSPORT.cz"
              width={140}
              height={38}
              className="h-[28px] w-auto mb-3"
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-0">
              výkon bez kompromisů
            </p>
          </div>

          {/* NAKUPOVÁNÍ */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">Nakupování</h4>
            <ul className="space-y-2.5">
              <li><Link href="/kategorie/muzi" className="text-[13px] text-white/70 hover:text-white transition-colors">Muži</Link></li>
              <li><Link href="/kategorie/zeny" className="text-[13px] text-white/70 hover:text-white transition-colors">Ženy</Link></li>
              <li><Link href="/kategorie/deti" className="text-[13px] text-white/70 hover:text-white transition-colors">Děti</Link></li>
              <li><Link href="/bazar" className="text-[13px] text-white/70 hover:text-white transition-colors">Bazar</Link></li>
              <li><Link href="/akce" className="text-[13px] text-white/70 hover:text-white transition-colors">Akce</Link></li>
            </ul>
          </div>

          {/* ZÁKAZNICKÝ SERVIS */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">Zákaznický servis</h4>
            <ul className="space-y-2.5">
              <li><Link href="/doprava-a-platba" className="text-[13px] text-white/70 hover:text-white transition-colors">Doprava a platba</Link></li>
              <li><Link href="/vraceni-zbozi" className="text-[13px] text-white/70 hover:text-white transition-colors">Vrácení zboží</Link></li>
              <li><Link href="/reklamace" className="text-[13px] text-white/70 hover:text-white transition-colors">Reklamace</Link></li>
              <li><Link href="/velikosti" className="text-[13px] text-white/70 hover:text-white transition-colors">Velikosti</Link></li>
              <li><Link href="/kontakt" className="text-[13px] text-white/70 hover:text-white transition-colors">Kontakt</Link></li>
            </ul>
          </div>

          {/* O NÁS */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">O nás</h4>
            <ul className="space-y-2.5">
              <li><Link href="/o-nas" className="text-[13px] text-white/70 hover:text-white transition-colors">Kdo jsme</Link></li>
              <li><Link href="/znacky" className="text-[13px] text-white/70 hover:text-white transition-colors">Značky</Link></li>
              <li><Link href="/blog" className="text-[13px] text-white/70 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/obchodni-podminky" className="text-[13px] text-white/70 hover:text-white transition-colors">Obchodní podmínky</Link></li>
              <li><Link href="/cookies" className="text-[13px] text-white/70 hover:text-white transition-colors">Cookies</Link></li>
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

        {/* Mobile: accordion with details/summary */}
        <div className="sm:hidden mb-10 space-y-0 divide-y divide-white/10">
          <div className="pb-5">
            <Image
              src="/qsport-logo-web-bila.svg"
              alt="QSPORT.cz"
              width={140}
              height={38}
              className="h-[24px] w-auto mb-2"
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
              výkon bez kompromisů
            </p>
          </div>

          <details className="group">
            <summary className="flex items-center justify-between py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/60">Nakupování</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 transition-transform group-open:rotate-180">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </summary>
            <ul className="space-y-1 pb-4">
              <li><Link href="/kategorie/muzi" className="text-[14px] text-white/70 block py-1.5">Muži</Link></li>
              <li><Link href="/kategorie/zeny" className="text-[14px] text-white/70 block py-1.5">Ženy</Link></li>
              <li><Link href="/kategorie/deti" className="text-[14px] text-white/70 block py-1.5">Děti</Link></li>
              <li><Link href="/bazar" className="text-[14px] text-white/70 block py-1.5">Bazar</Link></li>
              <li><Link href="/akce" className="text-[14px] text-white/70 block py-1.5">Akce</Link></li>
            </ul>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/60">Zákaznický servis</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 transition-transform group-open:rotate-180">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </summary>
            <ul className="space-y-1 pb-4">
              <li><Link href="/doprava-a-platba" className="text-[14px] text-white/70 block py-1.5">Doprava a platba</Link></li>
              <li><Link href="/vraceni-zbozi" className="text-[14px] text-white/70 block py-1.5">Vrácení zboží</Link></li>
              <li><Link href="/reklamace" className="text-[14px] text-white/70 block py-1.5">Reklamace</Link></li>
              <li><Link href="/velikosti" className="text-[14px] text-white/70 block py-1.5">Velikosti</Link></li>
              <li><Link href="/kontakt" className="text-[14px] text-white/70 block py-1.5">Kontakt</Link></li>
            </ul>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/60">O nás</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 transition-transform group-open:rotate-180">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </summary>
            <ul className="space-y-1 pb-4">
              <li><Link href="/o-nas" className="text-[14px] text-white/70 block py-1.5">Kdo jsme</Link></li>
              <li><Link href="/znacky" className="text-[14px] text-white/70 block py-1.5">Značky</Link></li>
              <li><Link href="/blog" className="text-[14px] text-white/70 block py-1.5">Blog</Link></li>
              <li><Link href="/obchodni-podminky" className="text-[14px] text-white/70 block py-1.5">Obchodní podmínky</Link></li>
              <li><Link href="/cookies" className="text-[14px] text-white/70 block py-1.5">Cookies</Link></li>
            </ul>
          </details>

          <div className="py-4">
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/60 block mb-3">Kontakt</span>
            <ul className="space-y-1">
              <li><a href="mailto:obchod@qsport.cz" className="text-[14px] text-white/70 block py-1.5">obchod@qsport.cz</a></li>
              <li><a href="tel:+420777447464" className="text-[14px] text-white/70 block py-1.5">+420 777 447 464</a></li>
              <li className="flex gap-3 pt-1">
                <a href="https://instagram.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40">Instagram</a>
                <a href="https://facebook.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40">Facebook</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[12px] text-white/30">
          <span>&copy; {new Date().getFullYear()} Qsport.cz</span>
        </div>
      </div>
    </footer>
  );
}
