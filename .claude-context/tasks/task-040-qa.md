# QA Report: TASK-040 — Quick Wins + Finance (Task #26)

**Datum:** 2026-11-10  
**Kontrolor:** Evžen-the-King  
**Výsledek: PASS**

---

## 1. Dashboard promo karty (admin/page.tsx, řádky 432–476)

- [x] 3 info karty v grid `md:grid-cols-3` — OK
- [x] Karta 1 "Obnovte prodeje e-mailem" — ikona email (blue-50/blue-600), odkaz na `/admin/opustene-pokladny` — OK
- [x] Karta 2 "Růst e-shopu" — ikona trend (green-50/green-600), odkaz na `/admin/rust` — OK
- [x] Karta 3 "Analytika" — ikona bar chart (purple-50/purple-600), odkaz na `/admin/analytika` — OK
- [x] Každá karta: ikona v kroužku, nadpis, popis, "Nastavit/Zobrazit" link — Shopify styl — OK
- [x] Umístění: pod stat kartami, nad Poslední objednávky — OK

**Hodnocení: 6/6 PASS**

---

## 2. Zákazníci stat karty (zakaznici/page.tsx, řádky 100–124)

- [x] 4 StatCards v grid `sm:grid-cols-2 lg:grid-cols-4` — OK
- [x] "Celkem zákazníků" — hodnota + sparkline (new customers per day, 30 dní) — OK
- [x] "Noví (30 dní)" — hodnota + change "X% z celku" — OK
- [x] "Opakující se" — zákazníci s >1 PAID objednávkou + "X% zákazníků" — OK
- [x] "Prům. hodnota objednávky" — formatPrice(avgOrderValue) — OK
- [x] Sparkline: customerSparkline agregace po dnech (30 dní) — OK
- [x] changeType: up/neutral dle hodnoty — OK
- [x] DB dotazy: `allCustomers` s `orders` select pro stats, `Promise.all` — OK

**Hodnocení: 8/8 PASS**

---

## 3. Značky thumbnail (znacky/page.tsx, řádky 88–99)

- [x] Sloupec "Logo" v tabulce — OK
- [x] Pokud `brand.logo` existuje: `<img>` s `w-8 h-8 object-contain rounded` — OK
- [x] Pokud `brand.logo` je null: fallback `<span>` s prvním písmenem názvu (bg-gray-100, text-gray-400, w-8 h-8) — OK
- [x] DB: `brand.logo` je `String?` v Prisma schema — potvrzeno (řádek 13)

**Hodnocení: 4/4 PASS**

---

## 4. Finance stránka (finance/page.tsx) — NOVÝ reálný obsah

### Header + období selector
- [x] Nadpis "Finance" + popis s dynamickým textem dle období — OK
- [x] Období selector: 7/30/90 dní, URL `?obdobi=X`, default 30 — OK (stejný pattern jako dashboard)
- [x] `searchParams: Promise<...>` — správně pro Next.js 15+ — OK

### Stat karty (4 ks)
- [x] "Celkové tržby" — formatPrice + sparkline (revenueByDay) — OK
- [x] "Marže" — formatPrice(totalMargin) NEBO "—" pokud chybí costPrice + change "X% z tržeb" — OK
- [x] "Počet transakcí" — počet PAID objednávek — OK
- [x] "Průměrná objednávka" — formatPrice(avgOrder) — OK

### Tržby po dnech (LineChart)
- [x] SVG line chart: polyline, y-axis labels, x-axis date labels — OK
- [x] Empty state: "Žádné tržby v tomto období" — OK

### DPH souhrn
- [x] Tržby s DPH, DPH 21% (`Math.round(totalRevenue * 0.1736)` — 21/121), Základ bez DPH — OK
- [x] Výpočet DPH je správný (0.1736 ≈ 21/121) — potvrzeno — OK

### Platební metody
- [x] Breakdown: card/transfer/cash/cod/other s count + total — OK
- [x] Řazení dle total (desc) — OK
- [x] methodLabels: Kartou online, Bankovní převod, Hotově, Dobírka, Ostatní — OK
- [x] Empty state — OK

### Marže
- [x] Tržby, Náklady (nákupní ceny), Hrubá marže (green-600), Marže % — OK
- [x] Progress bar (green-500, max 100%) — OK
- [x] Fallback pokud chybí costPrice: "Vyplňte nákupní ceny" + link na produkty — OK
- [x] Cost lookup: `variant.costPrice` z DB, `costMap` = Map — OK
- [x] DB: `costPrice Int?` na Variant modelu — potvrzeno (řádek 80)

### Poslední transakce
- [x] Tabulka: Datum, Objednávka (#link), Zákazník, Částka, Metoda, Stav (badge "Zaplaceno") — OK
- [x] Top 20 PAID objednávek — OK
- [x] Export CSV link — OK
- [x] Empty state — OK

**Hodnocení: 22/22 PASS**

---

## Technické kontroly

- [x] Všechny DB fields existují v schema: `paymentMethod`, `subtotal`, `shippingPrice`, `discountAmount`, `costPrice` — OK
- [x] `brand.logo: String?` existuje — OK
- [x] StatCard `icon?: React.ReactNode` je optional — OK (ověřeno dříve)
- [x] Server Actions v znacky: `createBrand`, `deleteBrand` s `"use server"` a `revalidatePath` — OK
- [x] Finance: žádné server actions (read-only stránka) — OK

---

## Shrnutí

| Oblast | Kontrolní body | Status |
|--------|---------------|--------|
| Dashboard promo karty | 6/6 | PASS |
| Zákazníci stat karty | 8/8 | PASS |
| Značky thumbnail | 4/4 | PASS |
| Finance stránka | 22/22 | PASS |
| **Celkem** | **40/40** | **PASS** |

**Závěr: Vše odpovídá Shopify kvalitě. Finance stránka je výrazný upgrade z placeholder na plnohodnotný finanční dashboard. QA PASSED.**
