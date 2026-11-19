# Chrome Test Results — TASK-041 Admin Pages

**Date:** 2026-11-11
**Tested by:** test-chrome agent
**Dev server:** http://localhost:9999

---

## 1. Dashboard — `/admin`

- **Loads:** YES (200 OK)
- **Sidebar highlight:** Correct ("Domů" highlighted)
- **Content rendered:** YES — full content, not placeholder
- **Details:**
  - H1: "Dashboard"
  - 4 stat cards present: Celkove prodeje, Objednavky, Konverzni pomer, Prumerna objednavka
  - Period selector: 7 dni / 30 dni / 90 dni
  - Promo cards: 3 (email recovery, rust, analytika)
  - Sections: Posledni objednavky, Nizke zasoby (43 variant listed), Posledni aktivita, Rychle akce
  - 27 SVG icons rendered
- **Visual issues:** None

---

## 2. Objednavky — `/admin/objednavky`

- **Loads:** YES (200 OK)
- **Sidebar highlight:** Correct ("Objednavky" highlighted)
- **Content rendered:** YES — full content
- **Details:**
  - H1: "Objednavky"
  - 6 stat cards: Objednavky dnes, Objednane polozky, Vraceni, Splnene, Dorucene, Doba plneni (NOTE: only shows 6 metric values, stat cards count shows 0 from DOM because they use different class naming than "stat/Stat/metric/Metric")
  - Status filter tabs: Vsechny stavy, Nova, Potvrzena, Pripravuje se, Ceka na dodavatele, Odeslana, Dorucena, Zrusena
  - Payment filter tabs: Vsechny platby, Ceka na platbu, Zaplaceno, Zruseno, Vraceno
  - Action buttons: Exportovat CSV, Dalsi akce, Vytvorit objednavku (5 buttons)
  - Empty state: "Zadne objednavky nenalezeny."
- **Visual issues:** None

---

## 3. Expedice — `/admin/objednavky/expedice`

- **Loads:** YES (200 OK)
- **Sidebar highlight:** Correct ("Expedice" highlighted)
- **Content rendered:** YES — full content
- **Details:**
  - H1: "Expedice"
  - Description: "Prehled objednavek k odeslani a splnenych zasilek"
  - Tabs: Nesplnene (0), Splnene (0), Vse
  - Action buttons: Packing slipy, Exportovat CSV, Predavaci protokol
  - Empty state: "Zadne objednavky k expedici."
- **Visual issues:** None

---

## 4. Doprava — `/admin/doprava`

- **Loads:** YES (200 OK)
- **Sidebar highlight:** Correct ("Doprava" highlighted)
- **Content rendered:** YES — full content with real data
- **Details:**
  - H1: "Doprava"
  - Tabs: Aktivni (3), Neaktivni (0), Vse (3)
  - 3 shipping method cards displayed:
    1. Zasilkovna — Vydejni misto, 49 Kc (zdarma od 2000 Kc), Aktivni, API key masked
    2. GLS — Na adresu, 89 Kc (zdarma od 2000 Kc), Aktivni
    3. Osobni vyzvednuti — Osobni, Zdarma, Aktivni
  - Each card has "Upravit" link
- **Visual issues:** None

---

## 5. Opustene pokladny — `/admin/opustene-pokladny`

- **Loads:** NO — SERVER ERROR
- **Error:** "This page couldn't load — A server error occurred. Reload to try again." (ERROR 960628247)
- **Sidebar highlight:** N/A (error page, sidebar not rendered)
- **Content rendered:** NO
- **Root cause:** The page queries `prisma.abandonedCheckout` which maps to `abandoned_checkouts` table. The Prisma schema defines the model, but the table likely doesn't exist in the database yet (needs `prisma db push`). The page source code at `src/app/(admin)/admin/opustene-pokladny/page.tsx` is well-structured with 4 stat cards, tabs, search, and table — the error is purely a database/runtime issue, not a code structure problem.

---

## 6. Rust (Growth) — `/admin/rust`

- **Loads:** NO — SERVER ERROR
- **Error:** "This page couldn't load — A server error occurred. Reload to try again." (ERROR 2506501890)
- **Sidebar highlight:** N/A (error page, sidebar not rendered)
- **Content rendered:** NO
- **Root cause:** The page at `src/app/(admin)/admin/rust/page.tsx` queries multiple Prisma models including `prisma.newsletterSubscriber`, `prisma.abandonedCheckout`, `prisma.productReview`, and `prisma.discountCode`. If any of these tables don't exist in the database, the entire page crashes. The source code is well-structured with all expected sections (conversion stats, SEO audit, recommendations, customer retention, quick actions).

---

## 7. Finance — `/admin/finance`

- **Loads:** YES (200 OK)
- **Sidebar highlight:** Correct ("Finance" highlighted)
- **Content rendered:** YES — full content
- **Details:**
  - H1: "Finance"
  - Period selector: 7 dni / 30 dni / 90 dni
  - 4 stat cards: Celkove trzby, Marze, Pocet transakci, Prumerna objednavka
  - Sections: Trzby po dnech, DPH souhrn (trzby s DPH, DPH 21%, zaklad bez DPH), Platebni metody, Marze, Posledni transakce
  - Export CSV button
  - Marze note: "Vyplnte nakupni ceny (costPrice) u variant pro vypocet marzi"
  - Empty state messages for sections with no data
- **Visual issues:** None

---

## 8. Zakaznici — `/admin/zakaznici`

- **Loads:** YES (200 OK)
- **Sidebar highlight:** Correct ("Zakaznici" highlighted)
- **Content rendered:** YES — full content
- **Details:**
  - H1: "Zakaznici"
  - Export CSV button
  - 4 stat cards: Celkem zakazniku, Novi (30 dni), Opakujici se, Prum. hodnota objednavky
  - Search input
  - Empty state: "Zadni zakaznici nenalezeni."
- **Visual issues:** None

---

## 9. Sidebar Navigation

**All expected items present in sidebar:**

| Sidebar Item | Link | Present | Reachable |
|---|---|---|---|
| Domu | /admin | YES | YES |
| Objednavky | /admin/objednavky | YES | YES |
| Expedice | /admin/objednavky/expedice | YES | YES |
| Produkty | /admin/produkty | YES | (not tested) |
| Zakaznici | /admin/zakaznici | YES | YES |
| Blog | /admin/blog | YES | (not tested) |
| Recenze | /admin/recenze | YES | (not tested) |
| Finance | /admin/finance | YES | YES |
| Analytika | /admin/analytika | YES | (not tested) |
| Slevy | /admin/slevy | YES | (not tested) |
| Rust | /admin/rust | YES | SERVER ERROR |
| Opustene pokladny | /admin/opustene-pokladny | YES | SERVER ERROR |
| Kategorie | /admin/kategorie | YES | (not tested) |
| Znacky | /admin/znacky | YES | (not tested) |
| Dodavatele | /admin/dodavatele | YES | (not tested) |
| Doprava | /admin/doprava | YES | YES |
| Log aktivit | /admin/log | YES | (not tested) |
| Nastaveni | /admin/nastaveni | YES | (not tested) |
| Zobrazit e-shop | / | YES | (not tested) |

**Section headers in sidebar:** OBSAH (Blog, Recenze), MARKETING (Slevy, Rust, Opustene pokladny), KATALOG (Kategorie, Znacky), PROVOZNI (Dodavatele, Doprava, Log aktivit, Nastaveni)

**Sidebar highlighting:** Tested on 6 pages — correct on all. Each page highlights its own nav item with `bg-gray-800 text-white`.

---

## Summary

| Page | Status | Content | Sidebar |
|---|---|---|---|
| Dashboard | OK | Full | Correct |
| Objednavky | OK | Full | Correct |
| Expedice | OK | Full | Correct |
| Doprava | OK | Full (3 methods) | Correct |
| Opustene pokladny | **ERROR** | Server crash | N/A |
| Rust (Growth) | **ERROR** | Server crash | N/A |
| Finance | OK | Full | Correct |
| Zakaznici | OK | Full | Correct |

**6/8 pages load correctly.** 2 pages crash with server errors (Opustene pokladny, Rust).

**Likely fix:** Run `npx prisma db push` to ensure all tables (especially `abandoned_checkouts`) exist in the database. The Rust page also depends on `newsletterSubscriber`, `productReview`, and `discountCode` tables being present and accessible.
