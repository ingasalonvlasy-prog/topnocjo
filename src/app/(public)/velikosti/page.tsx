import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tabulka velikostí | Qsport.cz",
  description: "Převodní tabulky velikostí bot a oblečení. EU, UK, US velikosti a tipy na správné měření nohy.",
  openGraph: { title: "Tabulka velikostí | Qsport.cz", description: "Převodní tabulky velikostí bot a oblečení. EU, UK, US velikosti a tipy na správné měření nohy." },
};

const shoesSizes = [
  { eu: "36", uk: "3.5", us: "4", cm: "22.5" },
  { eu: "37", uk: "4", us: "4.5", cm: "23" },
  { eu: "37.5", uk: "4.5", us: "5", cm: "23.5" },
  { eu: "38", uk: "5", us: "5.5", cm: "24" },
  { eu: "38.5", uk: "5.5", us: "6", cm: "24.5" },
  { eu: "39", uk: "6", us: "6.5", cm: "25" },
  { eu: "40", uk: "6.5", us: "7", cm: "25.5" },
  { eu: "40.5", uk: "7", us: "7.5", cm: "26" },
  { eu: "41", uk: "7.5", us: "8", cm: "26.5" },
  { eu: "42", uk: "8", us: "8.5", cm: "27" },
  { eu: "42.5", uk: "8.5", us: "9", cm: "27.5" },
  { eu: "43", uk: "9", us: "9.5", cm: "28" },
  { eu: "44", uk: "9.5", us: "10", cm: "28.5" },
  { eu: "44.5", uk: "10", us: "10.5", cm: "29" },
  { eu: "45", uk: "10.5", us: "11", cm: "29.5" },
  { eu: "46", uk: "11", us: "11.5", cm: "30" },
  { eu: "47", uk: "12", us: "12.5", cm: "31" },
];

const clothingSizes = [
  { size: "XS", chest: "86–90", waist: "72–76", hips: "86–90" },
  { size: "S", chest: "90–96", waist: "76–82", hips: "90–96" },
  { size: "M", chest: "96–102", waist: "82–88", hips: "96–102" },
  { size: "L", chest: "102–108", waist: "88–94", hips: "102–108" },
  { size: "XL", chest: "108–114", waist: "94–100", hips: "108–114" },
  { size: "XXL", chest: "114–120", waist: "100–106", hips: "114–120" },
];

export default function SizesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-10 lg:py-14">
        <div className="max-w-[var(--container)] mx-auto px-6">
          <nav className="text-[13px] text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Domů</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/70">Tabulka velikostí</span>
          </nav>
          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] leading-tight">
            Tabulka{" "}
            <span className="relative inline-block">
              velikostí.
              <span className="absolute bottom-[2px] left-0 w-full h-[4px] bg-blue rounded-full" />
            </span>
          </h1>
          <p className="text-[15px] text-white/50 font-medium mt-3 max-w-[420px]">
            Převodní tabulky pro boty a oblečení. Změř se a objednej správnou velikost.
          </p>
        </div>
      </section>

      <div className="max-w-[var(--container)] mx-auto px-6 py-10">
        <div className="max-w-[900px]">

          {/* Tip na měření */}
          <div className="bg-wash rounded-[10px] p-6 mb-10">
            <h2 className="text-[18px] font-extrabold text-navy mb-3">Jak správně změřit nohu</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[15px] text-ink leading-relaxed">
              <li>Postav se na list papíru bosou nohou (celou vahou).</li>
              <li>Tužkou obkresli obrys nohy — drž tužku kolmo.</li>
              <li>Změř vzdálenost od paty po špičku nejdelšího prstu v centimetrech.</li>
              <li>Výsledek porovnej s tabulkou níže. Pokud jsi mezi dvěma velikostmi, zvol větší.</li>
            </ol>
            <p className="text-[13px] text-muted mt-3">
              Tip: Měř nohu večer, kdy je mírně větší. U běžeckých bot doporučujeme o půl čísla větší pro pohodlí při běhu.
            </p>
          </div>

          {/* Běžecké boty + kopačky */}
          <h2 className="text-[22px] font-extrabold text-navy mb-1">Běžecké boty a kopačky</h2>
          <p className="text-[14px] text-muted mb-4">Univerzální převodní tabulka pro sportovní obuv (On, Mizuno aj.)</p>
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="text-left px-4 py-3 font-bold">EU</th>
                  <th className="text-left px-4 py-3 font-bold">UK</th>
                  <th className="text-left px-4 py-3 font-bold">US</th>
                  <th className="text-left px-4 py-3 font-bold">Délka (cm)</th>
                </tr>
              </thead>
              <tbody>
                {shoesSizes.map((row, i) => (
                  <tr key={row.eu} className={i % 2 === 0 ? "bg-white" : "bg-wash"}>
                    <td className="px-4 py-2.5 font-bold text-navy">{row.eu}</td>
                    <td className="px-4 py-2.5 text-ink">{row.uk}</td>
                    <td className="px-4 py-2.5 text-ink">{row.us}</td>
                    <td className="px-4 py-2.5 text-ink">{row.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Oblečení */}
          <h2 className="text-[22px] font-extrabold text-navy mb-1">Oblečení</h2>
          <p className="text-[14px] text-muted mb-4">Orientační velikosti pro pánské sportovní oblečení (Maloja, POC aj.)</p>
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="text-left px-4 py-3 font-bold">Velikost</th>
                  <th className="text-left px-4 py-3 font-bold">Hrudník (cm)</th>
                  <th className="text-left px-4 py-3 font-bold">Pas (cm)</th>
                  <th className="text-left px-4 py-3 font-bold">Boky (cm)</th>
                </tr>
              </thead>
              <tbody>
                {clothingSizes.map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? "bg-white" : "bg-wash"}>
                    <td className="px-4 py-2.5 font-bold text-navy">{row.size}</td>
                    <td className="px-4 py-2.5 text-ink">{row.chest}</td>
                    <td className="px-4 py-2.5 text-ink">{row.waist}</td>
                    <td className="px-4 py-2.5 text-ink">{row.hips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Helmy */}
          <h2 className="text-[22px] font-extrabold text-navy mb-1">Helmy</h2>
          <p className="text-[14px] text-muted mb-4">Měřte obvod hlavy těsně nad obočím a ušima.</p>
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="text-left px-4 py-3 font-bold">Velikost</th>
                  <th className="text-left px-4 py-3 font-bold">Obvod hlavy (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: "XS", cm: "51–52" },
                  { size: "S", cm: "53–54" },
                  { size: "M", cm: "55–56" },
                  { size: "M/L", cm: "56–57" },
                  { size: "L", cm: "57–58" },
                  { size: "XL", cm: "59–60" },
                  { size: "XXL", cm: "61–62" },
                ].map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? "bg-white" : "bg-wash"}>
                    <td className="px-4 py-2.5 font-bold text-navy">{row.size}</td>
                    <td className="px-4 py-2.5 text-ink">{row.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="bg-wash rounded-[10px] p-6">
            <p className="text-[14px] text-muted leading-relaxed">
              <strong className="text-ink">Upozornění:</strong> Velikosti se mohou lišit podle výrobce a modelu.
              Uvedené tabulky jsou orientační. Pokud si nejste jistí, kontaktujte nás na{" "}
              <a href="mailto:obchod@qsport.cz" className="text-blue hover:underline">obchod@qsport.cz</a>{" "}
              a rádi poradíme.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
