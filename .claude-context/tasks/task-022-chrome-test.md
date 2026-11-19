# TASK-022: Chrome Test — Kolo 2
**Datum:** 2026-11-11
**Tester:** test-chrome

## CELKOVÝ VÝSLEDEK: PASS ✅

---

## 1. Admin slevy `/admin/slevy` ✅

- Stat karty: Aktivní kódy (0), Celkem využití (0), Vypršelé (0) ✅
- Export CSV button (href: `/api/admin/discounts/export`) ✅
- Nový kód button ✅
- Empty state: "Zatím žádné slevové kódy / Vytvořte první slevový kód pro vaše zákazníky." ✅

---

## 2. Košík cross-sell `/kosik` ✅

- Košík s produktem Mizuno Morelia Neo IV (vel. 42, 6 490 Kč) ✅
- Souhrn objednávky: Mezisoučet, Ušetříš, Doprava, Celkem ✅
- **Sekce "Mohlo by se ti hodit"** zobrazuje 3 cross-sell produkty: ✅
  - Leki Pro Shield (−17%, 2 490 Kč, vel. S-M/L-XL)
  - Mizuno Wave Sky 7 (4 690 Kč, vel. 40–44)
  - On Cloud 5 (3 690 Kč, vel. 39–43)
- Každý cross-sell má: název, cenu, dostupné velikosti, "PŘIDAT DO KOŠÍKU" button ✅

---

## 3. OG meta tagy na statických stránkách ✅

Všechny stránky mají `og:title` + `og:description`:

| Stránka | og:title | og:description |
|---------|----------|----------------|
| /doprava-a-platba | Doprava a platba \| Qsport.cz | Informace o způsobech dopravy... |
| /vraceni-zbozi | Vrácení zboží \| Qsport.cz | Podmínky vrácení zboží... 14 dní... |
| /o-nas | O nás \| Qsport.cz | Kdo stojí za Qsport.cz... |
| /kontakt | Kontakt \| Qsport.cz | Kontaktujte nás — e-mail, telefon... |
| /obchodni-podminky | Obchodní podmínky \| Qsport.cz | Obchodní podmínky e-shopu... |

---

## 4. Error boundaries ✅

- `/neexistujici-stranka` → 404 stránka "Stránka nenalezena" ✅
- `/admin/neexistujici-stranka` → 404 stránka (admin not-found) ✅
- `src/app/(admin)/admin/error.tsx` existuje (admin error boundary) ✅
- `src/app/(public)/error.tsx` existuje (public error boundary) ✅
- `src/app/not-found.tsx` existuje (global 404) ✅

---

## Žádné bugy nalezeny.
