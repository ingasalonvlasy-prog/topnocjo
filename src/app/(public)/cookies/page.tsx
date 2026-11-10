import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Cookies | Qsport.cz",
  description: "Informace o používání cookies na Qsport.cz",
};

export default function CookiesPage() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs items={[{ label: "Zásady cookies" }]} />

      <div className="max-w-[720px]">
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
          Zásady používání cookies
        </h1>

        <div className="prose prose-sm max-w-none text-[14px] text-ink leading-relaxed space-y-6">
          <p>
            Tento web používá soubory cookies, aby vám zajistil co nejlepší zážitek z nakupování.
            Níže najdete informace o tom, jaké cookies používáme a k čemu slouží.
          </p>

          <h2 className="text-[18px] font-bold text-navy mt-8 mb-3">Co jsou cookies?</h2>
          <p>
            Cookies jsou malé textové soubory, které se ukládají do vašeho prohlížeče při návštěvě
            webových stránek. Umožňují webu zapamatovat si vaše preference a zlepšit vaši zkušenost.
          </p>

          <h2 className="text-[18px] font-bold text-navy mt-8 mb-3">Nezbytné cookies</h2>
          <p>
            Tyto cookies jsou nutné pro správné fungování webu. Bez nich by nefungoval nákupní košík,
            přihlášení nebo zpracování objednávky. Nelze je vypnout.
          </p>
          <div className="bg-wash rounded-[8px] p-4">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2 font-bold">Cookie</th>
                  <th className="pb-2 font-bold">Účel</th>
                  <th className="pb-2 font-bold">Platnost</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                <tr className="border-t border-line/50">
                  <td className="py-2 font-medium">qsport_session</td>
                  <td className="py-2">Přihlášení uživatele</td>
                  <td className="py-2">30 dní</td>
                </tr>
                <tr className="border-t border-line/50">
                  <td className="py-2 font-medium">qsport_cart</td>
                  <td className="py-2">Nákupní košík</td>
                  <td className="py-2">30 dní</td>
                </tr>
                <tr className="border-t border-line/50">
                  <td className="py-2 font-medium">qsport_cookie_consent</td>
                  <td className="py-2">Váš souhlas s cookies</td>
                  <td className="py-2">1 rok</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-[18px] font-bold text-navy mt-8 mb-3">Analytické cookies</h2>
          <p>
            Pomáhají nám pochopit, jak návštěvníci web používají — které stránky jsou nejnavštěvovanější,
            odkud přicházejí a jak se na webu pohybují. Všechna data jsou anonymní.
          </p>

          <h2 className="text-[18px] font-bold text-navy mt-8 mb-3">Marketingové cookies</h2>
          <p>
            Slouží k zobrazování relevantních reklam na základě vašich zájmů. Mohou být nastaveny
            našimi reklamními partnery přes náš web.
          </p>

          <h2 className="text-[18px] font-bold text-navy mt-8 mb-3">Správa cookies</h2>
          <p>
            Své preference můžete kdykoliv změnit v nastavení cookies na našem webu (banner ve spodní
            části stránky) nebo v nastavení svého prohlížeče.
          </p>
          <p>
            Odstranění nebo zablokování cookies může ovlivnit funkčnost některých částí webu.
          </p>

          <h2 className="text-[18px] font-bold text-navy mt-8 mb-3">Kontakt</h2>
          <p>
            Máte-li dotazy ohledně zpracování cookies, kontaktujte nás na{" "}
            <Link href="/kontakt" className="text-blue hover:underline">
              stránce kontakt
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
