import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktujte nás — e-mail, telefon, sociální sítě.",
  openGraph: { title: "Kontakt", description: "Kontaktujte nás — e-mail, telefon, sociální sítě." },
};

export default function ContactPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">Kontakt</span>
      </nav>

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Kontakt
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-[780px]">
        {/* Contact info */}
        <div>
          <h2 className="text-[22px] font-extrabold text-navy mb-4">Napište nám</h2>

          <dl className="space-y-4 text-[16px] text-ink">
            <div>
              <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted mb-1">E-mail</dt>
              <dd><a href="mailto:obchod@qsport.cz" className="text-blue hover:underline">obchod@qsport.cz</a></dd>
            </div>
            <div>
              <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Telefon</dt>
              <dd><a href="tel:+420777447464" className="text-blue hover:underline">+420 777 447 464</a></dd>
            </div>
            <div>
              <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Sociální sítě</dt>
              <dd className="flex gap-4">
                <a href="https://instagram.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">Instagram</a>
                <a href="https://facebook.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">Facebook</a>
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted mb-2">Provozní doba</h3>
            <p className="text-[16px] text-ink leading-relaxed">
              Po–Pá: 9:00–17:00<br />
              So–Ne: zavřeno
            </p>
          </div>
        </div>

        {/* Contact form */}
        <div>
          <h2 className="text-[22px] font-extrabold text-navy mb-4">Kontaktní formulář</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
