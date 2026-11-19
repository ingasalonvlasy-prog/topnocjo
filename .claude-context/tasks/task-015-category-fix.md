# TASK #15: FIX BUG-2 — /kategorie/muzi vraci "Kategorie nenalezena"

**Status:** Vysetreno — data v DB jsou OK, bug je jinde
**Priorita:** STREDNI

---

## ODPOVEDI NA 3 OTAZKY

### 1. Jake slugy maji parent kategorie v DB?

Primo SQL dotaz na Turso DB (overeno TEĎ):

| slug | name | children | position |
|------|------|----------|----------|
| `muzi` | Muži | 7 | 0 |
| `zeny` | Ženy | 9 | 1 |
| `deti` | Děti | 7 | 2 |
| `beh` | Běh | 8 | 3 |
| `zima` | Zima | 32 | 4 |
| `hory-a-outdoor` | Hory a outdoor | 5 | 5 |
| `obleceni` | Oblečení | 1 | 6 |
| `doplnky` | Doplňky | 3 | 7 |
| `bazar` | BAZAR | 0 | 8 |
| `frontpage` | Domovská stránka | 0 | 999 |
| + 5 dalsich Shopify kolekci | | 0 | 999 |

**SLUG `muzi` EXISTUJE** s `parentId: null`, `id: cat-eb18a7af`, 7 children (panske-bundy, panske-kabaty-a-vesty, panske-kalhoty, panske-kratasy, panske-mikiny, panske-tricka, panske-termopradlo).

### 2. Layout.tsx najde muzi a navigace funguje — tak proc kategorie stranka vraci notFound?

**Kategorie stranka by NEMELA vracet notFound.** Kod na radku 41-52:
```ts
const category = await prisma.category.findUnique({
  where: { slug },  // slug = "muzi"
  include: { children: ..., parent: ... },
});
if (!category) notFound();
```

Toto by MELO fungovat — `findUnique({ where: { slug: "muzi" } })` MUSI najit zaznam, protoze v DB existuje.

**MOZNE VYSVETLENI proc to nefungovalo pri browser testu:**

**A. Browser test testoval STARY deployment na Vercelu.**
Posledni zmeny (Task #1 — pridani CategorySidebar, HorizontalFilters) import neexistujicich komponent by zpusobil runtime crash. Chyba by se projevila jako 500 error, ne 404 — ale browser test mohl interpretovat error page jako "nenalezena".

**B. Browser test testoval LOCALHOST bez spusteneho dev serveru.**
Pokud dev server nebezel, `localhost:3000` by vratil connection refused.

**C. Prisma runtime error (nepravdepodobne).**
Pokud by Prisma adapter mel problem s Turso pripojenim, `findUnique` by hodil exception, ne vratil null. Exception by se projevil jako 500 error (ne notFound).

### 3. Je mozne ze layout query selhava tise a navigace se nezobrazuje?

**ANO, to je mozne ale NENI to pricina tohoto bugu.**

Layout `getNavCategories()` (layout.tsx:12-37):
```ts
async function getNavCategories(): Promise<NavCategory[]> {
  try {
    const cats = await prisma.category.findMany({...});
    return NAV_SLUGS.map(...).filter(...);
  } catch {
    return [];  // ← tichy fail, navigace by byla prazdna
  }
}
```

Pokud by toto selhalo:
- MegaMenu by nemel zadne polozky (Muzi/Zeny/Deti by chybely)
- Ale to je NEZAVISLY problem od kategorie stranky — stranka se renderuje pres page.tsx s vlastnim DB dotazem

**ALE:** Browser test hlasil ze navigace FUNGUJE (klikl na Muzi v nav). To znamena ze layout query funguje = DB pripojeni je OK = `findUnique` v page.tsx by TAKY mel fungovat.

---

## ROOT CAUSE ZAVER

Data v DB jsou v poradku. Kod logika je spravna. Build prochazi.

**Nejpravdepodobnejsi pricina: stary deployment na Vercelu** ktery nema posledni zmeny. Konkretne:
- Task #1 pridal `CategorySidebar` a `HorizontalFilters` komponenty
- Task #1 zmenil layout kategorie stranky z `FilterBar` sidebar na novy layout
- Pokud tyto zmeny NEBYLY pushnute na Vercel, produkce importuje neexistujici komponenty → runtime crash → error page

---

## FIX PLAN

### Krok 1: Overit lokalne (2 min)
```bash
cd /Users/zen/qsport
npx next dev
# Otevrit http://localhost:3000/kategorie/muzi
```

**Ocekavany vysledek:** Stranka se zobrazi spravne s produkty, sidebar navigaci a horizontal filtry.

### Krok 2: Pokud lokalne funguje → deployment issue
Commitnout a pushnout na Vercel. Build projde (overeno — `npx next build` uspesny).

### Krok 3: Pokud lokalne NEFUNGUJE → cist error v konzoli
Dev server zobrazi presnou chybovou hlasku. Na zaklade toho fixnout.

### Krok 4: (Preventivni) Pridat error boundary
**Soubor:** `src/app/(public)/kategorie/[slug]/error.tsx`

```tsx
"use client";
export default function CategoryError({ error }: { error: Error }) {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-16 text-center">
      <h1 className="text-[24px] font-bold text-ink mb-2">Chyba pri nacitani kategorie</h1>
      <p className="text-muted">{error.message}</p>
    </div>
  );
}
```

Toto zabrani aby runtime chyba zobrazila generickou Next.js error stranku.

---

## SOUBORY

| Soubor | Akce | Popis |
|--------|------|-------|
| — | VERIFY | `npx next dev` → `/kategorie/muzi` |
| — | DEPLOY | git push na Vercel |
| `src/app/(public)/kategorie/[slug]/error.tsx` | NEW (optional) | Error boundary pro lepsi UX |

---

## EVIDENCE

SQL dotaz na produkci Turso DB (spusten 2026-11-18):
```
slug="muzi"  name="Muži"  children=7  pos=0
slug="zeny"  name="Ženy"  children=9  pos=1  
slug="deti"  name="Děti"  children=7  pos=2
```

Kategorie `muzi` existuje, ma 7 children, 3+464 produktu. `findUnique({ where: { slug: "muzi" } })` MUSI vratit vysledek.
