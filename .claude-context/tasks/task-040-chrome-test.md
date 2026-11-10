# TASK-040 Chrome Test Report — Quick wins + Finance
**Datum:** 2026-11-10  
**Tester:** TEST-CHROME  
**Server:** http://localhost:9999  

---

## HTTP STATUS

| Status | URL |
|--------|-----|
| 200 | /admin |
| 200 | /admin/zakaznici |
| 200 | /admin/znacky |
| 200 | /admin/finance |
| 200 | /admin/finance?obdobi=7 |
| 200 | /admin/finance?obdobi=90 |

**PASS — žádná 404**

---

## 1. DASHBOARD — 3 promo karty (/admin)

Promo karty jsou umístěny pod drill-down grafem (před sekcí Poslední objednávky).

### Karta 1 — Obnovte prodeje e-mailem
- Ikona: envelope (blue-50 background)
- Text: "Upomínky na nedokončené nákupy zvýší konverzi."
- CTA: "Nastavit →" → `/admin/opustene-pokladny` → HTTP 200 ✓

### Karta 2 — Růst e-shopu
- Ikona: trend up (green-50 background)
- Text: "SEO doporučení, kampaně a automatizace."
- CTA: "Zobrazit →" → `/admin/rust` → HTTP 200 ✓

### Karta 3 — Analytika
- Ikona: bar chart (purple-50 background)
- Text: "Detailní přehledy tržeb, produktů a zákazníků."
- CTA: "Zobrazit →" → `/admin/analytika` → HTTP 200 ✓

**PASS — 3 karty s ikonami, popisem, funkčními CTA linky**

---

## 2. ZÁKAZNÍCI (/admin/zakaznici)

### 4 stat karty
- [x] Celkem zákazníků — s customerSparkline (30 dní nových zákazníků po dnech)
- [x] Noví (30 dní) — change text "X% z celku", changeType up/neutral
- [x] Opakující se — change text "X% zákazníků"
- [x] Prům. hodnota objednávky — formatPrice

### Sparkline
- [x] Sparkline je pouze na první kartě (Celkem zákazníků) — SVG polyline 30 bodů ✓

### Ostatní
- [x] Vyhledávací input (jméno, email, telefon)
- [x] Export CSV tlačítko
- [x] Tabulka zákazníků (jméno, email, objednávky, celková útrata)
- [x] Paginace (PER_PAGE = 20)

**PASS**

---

## 3. ZNAČKY (/admin/znacky)

### Logo thumbnail v tabulce
Tabulka má sloupce: Název | Slug | Logo | Produkty | Akce

Logo sloupec (src:98-99 `/znacky/page.tsx`):
- **Má logo (`brand.logo`):** `<img src={brand.logo} className="w-8 h-8 object-contain rounded" />` ✓
- **Nemá logo (fallback):** `<span className="w-8 h-8 rounded bg-gray-100 text-xs font-bold text-gray-400">` zobrazí první písmeno názvu ✓

**PASS — logo thumbnail nebo písmeno fallback pro každou značku**

---

## 4. FINANCE (/admin/finance)

### Stat karty (4 karty v gridu)
- [x] Celkové tržby — s `revenueByDay` sparkline, changeType up/neutral
- [x] Marže — hodnota nebo "—" (bez nákupních cen), change "X% z tržeb"
- [x] Počet transakcí — číslo
- [x] Průměrná objednávka — formatPrice

### SVG graf tržeb ("Tržby po dnech")
- [x] LineChart komponenta — SVG viewBox 800×240
- [x] Y-osa: 5 gridlines s hodnotami
- [x] X-osa: datum popisky (každý 5. den + poslední)
- [x] Solid polyline (stroke #111827, strokeWidth 2)
- [x] Fallback: "Žádné tržby v tomto období." při prázdných datech

### Období selector
- [x] 7 dní / 30 dní / 90 dní
- [x] Aktivní tab: bg-gray-900 text-white
- [x] URL parametr: `?obdobi=7|30|90`
- [x] Výchozí: 30 dní

### DPH souhrn (sekce vlevo)
- [x] Tržby s DPH
- [x] DPH 21% (výpočet: total * 0.1736 = 21/121)
- [x] Základ bez DPH (tučně)

### Platební metody (sekce střed)
- [x] Kartou online / Bankovní převod / Hotově / Dobírka / Ostatní
- [x] Seřazeno od nejvyšší částky
- [x] Počet transakcí + celková částka
- [x] Fallback: "Žádné transakce." při prázdných datech

### Marže (sekce vpravo)
- [x] Pokud jsou nákupní ceny: Tržby, Náklady, Hrubá marže (zelená), Marže %
- [x] Vizuální progress bar (zelená)
- [x] Pokud chybí costPrice: zpráva + link na /admin/produkty

### Tabulka transakcí ("Poslední transakce")
- [x] Sloupce: Datum | Objednávka (link) | Zákazník | Částka | Metoda | Stav
- [x] Stav: vždy "Zaplaceno" (green badge) — zobrazuje jen zaplacené
- [x] Export CSV tlačítko (→ /admin/objednavky?export=csv)
- [x] Max 20 transakcí
- [x] Fallback prázdný stav

**PASS**

---

## ZÁVĚR

**Všechny 4 body PASS. Žádné chyby, žádné 404.**

| Test | Výsledek |
|------|----------|
| Dashboard 3 promo karty | PASS |
| Zákazníci 4 stat karty + sparkline | PASS |
| Značky logo thumbnail | PASS |
| Finance kompletní stránka | PASS |
