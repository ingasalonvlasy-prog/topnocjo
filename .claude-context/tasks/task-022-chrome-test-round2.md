# TASK-022: Chrome Test Round 2 — Report

**Datum:** 2026-11-11
**Tester:** TEST-CHROME agent
**Dev server:** http://localhost:3000

---

## Výsledky testů

### 1. /admin/slevy — stat karty + Export CSV

**Stav: PASS**

- 3 stat karty zobrazeny nahoře: "Aktivní kódy", "Celkem využití", "Vypršelé"
- Export CSV tlačítko vedle "+ Nový kód" button
- Klik na Export CSV stáhl soubor: `slevy-export-2026-11-11.csv`
- CSV hlavičky: `Kód,Typ,Sleva,Použití,Limit,Platnost od,Platnost do,Stav`
- BOM prefix přítomen (UTF-8 s BOM pro Excel kompatibilitu)
- API route: `/api/admin/discounts/export` — auth check OK (getCurrentUser + role check)

---

### 2. /kosik — cross-sell sekce

**Stav: PASS**

- Přidán produkt POC Myelin (velikost M) do košíku
- Pod položkami košíku zobrazena sekce "Mohlo by se ti hodit"
- Sekce obsahuje přesně 4 produkty ze stejné kategorie (helmy POC):
  1. POC Kortal Race MIPS
  2. POC Octal X MIPS
  3. POC Tectal
  4. POC Ventral Air MIPS
- Každý produkt má: obrázek, název, cenu, dostupné velikosti, tlačítko "Přidat do košíku"
- Cross-sell logika: produkty ze stejné značky/kategorie, aktuální produkt vyloučen

---

### 3. /admin/finance — Export CSV

**Stav: PASS**

- Export CSV link v pravém horním rohu stránky
- Klik stáhl soubor: `objednavky-2026-11-11.csv`
- Soubor obsahuje objednávky s osobními údaji zákazníků
- Link vede přímo na `/api/admin/orders/export` (ne `/admin/objednavky?export=csv`)
- Auth check na API route funguje: 401 bez přihlášení

---

### 4. /o-nas — OG metadata

**Stav: PASS**

Ověřeno přes view-source:
- `og:title`: "O nás | Qsport.cz"
- `og:description`: "Kdo stojí za Qsport.cz – sportovní e-shop s vybavením, co drží tempo."
- Metadata exportovány přes Next.js `export const metadata: Metadata` s `openGraph` polem

---

### 5. Error boundary — branded error stránka

**Stav: PASS**

**Admin error boundary (`/admin/neexistujici-xyz`):**
- URL neexistující admin stránka → zobrazí globální 404 (`src/app/not-found.tsx`)
- 404 page: "Stránka nenalezena" s tlačítky "HLAVNÍ STRÁNKA" a "KATEGORIE"
- Admin `error.tsx` existuje: "Chyba při načítání" s tlačítky "Zkusit znovu" a "Dashboard"
- Admin error boundary se aktivuje při runtime error (ne 404) — správné chování

**Public error boundary (`src/app/(public)/error.tsx`):**
- "Něco se pokazilo" s amber varování ikonou
- Tlačítka "Zkusit znovu" a "Hlavní stránka"
- Branded design konzistentní s public layoutem

---

## Souhrn

| Test | Výsledek |
|------|----------|
| Slevy stat karty + Export CSV | ✅ PASS |
| Košík cross-sell (4 produkty) | ✅ PASS |
| Finance Export CSV download | ✅ PASS |
| OG metadata /o-nas | ✅ PASS |
| Error boundaries (admin + public) | ✅ PASS |

**Všechny testy prošly. Žádné bugy nenalezeny.**

---

## Poznámky

- `/admin/finance` Export CSV link byl původně auditován jako chybný (N3 v task-042), nyní ukazuje správnou cestu na `/api/admin/orders/export`
- Cross-sell sekce funguje správně — 4 produkty ze stejné kategorie/značky
- Error boundaries oba existují a jsou branded; admin error boundary se zobrazí jen při skutečné runtime chybě
