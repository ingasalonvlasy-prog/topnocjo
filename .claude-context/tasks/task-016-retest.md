# Retest Report — Task #16 (aktualizováno 2026-11-18, Round 2)
**Tester:** test-chrome  
**Server:** http://localhost:9999  
**Chrome:** otevřen na homepage, /hledat?q=beh, /kategorie/muzi, /kategorie/zeny, /kategorie/deti

---

## BUG-1: Vyhledávání "beh" — OPRAVENO

**Před fixem:** 0 produktů, "Žádné výsledky"  
**Po fixu:** 8 produktů v API, 48 product linků na /hledat stránce

**API test:**
- /api/search?q=beh → products: 8, categories: 1 (Běh) ✓
- Produkty zahrnují: Běžecká obuv Mizuno, Běžecké rukavice LEKI (3 running produkty + 5 B.S.I.)

**Stránka /hledat?q=beh:**
- Title: "beh — Hledání" ✓
- H1: "Výsledky pro „beh"" ✓
- Počet product linků: 48 ✓
- Empty state: NE ✓

**VERDIKT: OPRAVENO** — zadání splněno, "beh" najde produkty včetně Běžecké boty

---

## BUG-2: /kategorie/muzi — STÁLE NEOPRAVENO (jen titulek změněn)

**Před fixem:** "Kategorie nenalezena" titulek, broken page  
**Po fixu:** Titulek se změnil, ale stránka stále nefunguje funkčně

**Stav po fixu — ověřeno v DB i v HTML:**
- HTTP status: 200 OK ✓
- Title: "Muži — sportovní vybavení | Qsport.cz" ✓ (titulek opraven)
- Breadcrumb: "Domů / Muži" ✓
- Navy hero sekce: renderuje ✓
- **Sidebar navigace: CHYBÍ** — DB: muzi má 0 children, 0 produktů
- **Subcategory pills: CHYBÍ** — žádné child kategorie v DB
- **Produkty: 0** — "Žádné produkty neodpovídají filtru"

**DB stav ověřen přes Prisma:**
```
slug: muzi | children: 0 | parent: none | products: 0
slug: zeny | children: 0 | parent: none | products: 0
slug: deti | children: 0 | parent: none | products: 0
```

**Stejné pro /kategorie/zeny a /kategorie/deti** — identický stav.

**VERDIKT: NEOPRAVENO**
- Titulek se změnil ze "Kategorie nenalezena" na "Muži — sportovní vybavení" ✓
- Ale stránka stále zobrazuje 0 produktů, žádný sidebar, žádné subcategory pills
- Zadání: "musí zobrazit stránku s produkty a sidebar navigací" — NESPLNĚNO

**Příčina:** Kategorie muzi/zeny/deti byly přidány do DB, ale bez přiřazených child kategorií a bez produktů. Page.tsx potřebuje category.children.length > 0 pro sidebar a pills.

**Co je potřeba:**
Přiřadit existující kategorie jako children muzi/zeny/deti v DB. Příklady:
- muzi → children: beh, zima, hory-a-outdoor, lyzarske-obleceni, ...
- zeny → children: odpovídající ženské kategorie
- deti → children: odpovídající dětské kategorie

---

## Souhrn

| Bug | Před | Po | Verdikt |
|-----|------|-----|---------|
| BUG-1: search "beh" | 0 produktů, empty state | 8 produktů v API, 48 linků na /hledat | OPRAVENO |
| BUG-2: /kategorie/muzi | "Kategorie nenalezena" titulek | Titulek OK, ale 0 produktů + bez sidebar + bez pills | NEOPRAVENO |
