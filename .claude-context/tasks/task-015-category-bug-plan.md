# TASK #15: BUG-2 — /kategorie/muzi vraci "Kategorie nenalezena"

**Status:** Plan ready for implementation
**Priorita:** STREDNI

---

## VYSETROVANI

### DB data: Kategorie EXISTUJI

Dotaz na Turso DB potvrdil ze vsechny tri parent kategorie existuji:

| slug | name | parentId | children |
|------|------|----------|----------|
| muzi | Muzi | null | 7 (panske-bundy, panske-kabaty-a-vesty, ...) |
| zeny | Zeny | null | children exist |
| deti | Deti | null | children exist |

Muzi ma 3 produkty primo + 464 v detskych kategoriich.

### Build: Kompilace v poradku

`npx next build` projde bez chyb. Stranka `/kategorie/[slug]` se kompiluje.

### Kod: Logika je spravna

- `prisma.category.findUnique({ where: { slug: "muzi" } })` by MEL vratit data
- CategorySidebar, HorizontalFilters — existuji a jsou spravne importovane
- Zadny null-pointer dereference — pro parent kategorii se pouziva `category` primo, ne `category.parent!`

### Mozne priciny

#### Pricina A: Vercel deployment nema posledni kod (NEJPRAVDEPODOBNEJSI)

Pokud posledni zmeny (Task #1 — CategorySidebar, HorizontalFilters) nebyly commitnuty a pushnute na Vercel, produkce bezi stary kod. Browser test testoval PRODUKCI, ne localhost.

**Overeni:** Commitnout a pushnout, overit na produkci.

#### Pricina B: Runtime chyba pri Prisma query

Prisma s Turso adapterem muze mit runtime issue — napr. connection timeout, nebo nekompatibilni query. Ale to by ovlivnilo VSECHNY stranky, ne jen `/kategorie/muzi`.

**Overeni:** Zkusit `npx next dev` lokalne a navstivit `/kategorie/muzi`.

#### Pricina C: `photos: { not: "[]" }` filter v getFilteredProducts

`getFilteredProducts` (products.ts:44) filtruje:
```ts
photos: { not: "[]" },
```

Pokud VSECHNY produkty v Muzi kategorii maji prazdne fotky, vrati 0 produktu — ale stranka se NEZHROUTÍ, jen ukaze "Zadne produkty neodpovidaji filtru."

Toto NENI pricina hlasky "Kategorie nenalezena" — to pochazi z `generateMetadata` kde `findUnique` vrati `null`.

#### Pricina D: Cache/ISR issue

Next.js muze cachovat stranky. Pokud stranka byla jednou vygenerovana kdyz kategorie jeste neexistovala (pred Shopify importem), cache muze drzet starou odpoved.

**Overeni:** Pridat `export const dynamic = "force-dynamic"` na stranku (ale pozor — layout.tsx uz to MA).

---

## ROOT CAUSE KANDIDAT

**Nejpravdepodobneji je to Pricina A — Vercel nema posledni kod.** Duvody:

1. DB data jsou v poradku (overeno primo SQL dotazem)
2. Kod logika je spravna (overeno ctenim kodu)
3. Build prochazi bez chyb
4. Memory `feedback_no_commit_vercel.md` rika ze se nepushuje automaticky — posledni zmeny mozna nejsou na Vercelu

Pokud browser test testoval `localhost:3000`, tak by to mohl byt Pricina B (runtime error). Ale pokud testoval produkci (qsport.cz), je to skoro jiste stary deployment.

---

## FIX PLAN

### Krok 1: Overit lokalne (5 min)

```bash
npx next dev
# Navstiv http://localhost:3000/kategorie/muzi
```

Pokud stranka funguje lokalne → problem je na Vercelu (stary deployment).
Pokud nefunguje → cteme error log a fixujeme.

### Krok 2: Pridat error handling do generateMetadata (prevence)

**Soubor:** `src/app/(public)/kategorie/[slug]/page.tsx:17-29`

Aktualni `generateMetadata` nedava zadne error info:
```ts
// BEFORE:
if (!category) return { title: "Kategorie nenalezena" };

// AFTER: (bez zmeny — toto je OK, jen pripomenuti ze titul je zavadejici
// pro browser test — mozna zmenit na specifictejsi text)
```

Zadna zmena kodu neni nutna — toto je informativni. Hlasku "Kategorie nenalezena" uzivatel neuvidi primo (je v HTML `<title>`).

### Krok 3: Nasadit na Vercel (pokud je problem stary deployment)

Commitnout a pushnout vsechny lokalni zmeny. Vercel automaticky buildne a deployuje.

### Krok 4: (OPTIONAL) Pridat logging na produkci

Pokud problem pretrvava i po deployi, pridat docasne `console.error` do catch bloku:

```ts
const category = await prisma.category.findUnique({
  where: { slug },
  include: { ... },
});
if (!category) {
  console.error(`[CategoryPage] Category not found: slug="${slug}"`);
  notFound();
}
```

---

## SOUBORY K IMPLEMENTACI

| Soubor | Akce | Popis |
|--------|------|-------|
| — | VERIFY | Spustit `npx next dev` a otestovat `/kategorie/muzi` lokalne |
| — | DEPLOY | Commitnout + pushnout na Vercel pokud lokalne funguje |

**Zadna zmena kodu neni pravdepodobne nutna** — data existuji, kod je spravny, problem je s největší pravděpodobností v deployment stavu.

---

## TESTING CHECKLIST

- [ ] `/kategorie/muzi` — zobrazi se stranka s produkty + sidebar s dětskými kategoriemi
- [ ] `/kategorie/zeny` — same
- [ ] `/kategorie/deti` — same
- [ ] `/kategorie/panske-bundy` — child kategorie, sidebar ukazuje sourozence
- [ ] MegaMenu navigace Muzi → klik → stranka se nacte
