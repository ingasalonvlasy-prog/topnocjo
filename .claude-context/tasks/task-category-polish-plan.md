# Task: Vizuální polish kategorie stránky

**Soubory k úpravě:**
- `src/app/(public)/kategorie/[slug]/page.tsx` (hlavní stránka)
- `src/components/FilterBar.tsx` (sidebar filtry)
- `src/components/ActiveFilterChips.tsx` (aktivní filtr chipy)
- `src/components/SortDropdown.tsx` (řazení dropdown)
- `src/components/MobileFilterDrawer.tsx` (mobilní filtry)
- `src/components/ProductCard.tsx` (produktové karty)
- `src/lib/filter-options.ts` (filter options — přidat Pohlaví)

**Referenční soubory (READ ONLY):**
- `.brand/navrh/navrh-webu/web-kategorie.png` (mockup)
- `.claude-context/tasks/qsport-brand-brief.md` (brand brief)
- `prisma/schema.prisma` (DB schéma — Category má parentId/children pro subcategories)

---

## Analýza: Co mockup ukazuje vs. aktuální stav

### HERO BANNER — stav: HOTOVO (90%)
Aktuální kód už má navy hero banner s breadcrumb, velkým nadpisem s podtržením posledního slova a popisem. Odpovídá mockupu.

**Drobné úpravy:**
1. ~~Subcategory chips~~ → Mockup ukazuje chipsy "Vše / Trailové / Silniční / Dámské / Pánské" v hero banneru. Aktuální kód je NEMÁ.
2. Hero popis (`seoDesc`) — text v mockupu `max-w-[400px]`, aktuálně je to stejné. OK.

### SUBCATEGORY CHIPS v HERO — stav: CHYBÍ
Mockup má řadu chipů v pravé dolní části hero banneru: "Vše" (plný navy), "Trailové", "Silniční", "Dámské", "Pánské" (outlined bílé).

**Implementace:**
- DB model Category má `parentId` + `children` relaci → pro danou kategorii načíst `children` (sub-kategorie)
- Chipy jsou odkazy na `/kategorie/[child-slug]`
- "Vše" chip = aktuální stránka (aktivní stav: plný navy bg, bílý text)
- Ostatní chipy = outlined styl (border bílá, text bílý, hover bg bílá/10%)

### SIDEBAR FILTRY — stav: HOTOVO (80%)
Aktuální FilterBar má: Značka (checkboxy), Velikost skladem (chips), Dostupnost, Cena.

**Chybí oproti mockupu:**
1. **Filtr "Pohlaví"** — mockup ukazuje Pánské/Dámské checkboxy. V DB ale NENÍ gender field na Product ani Variant. Řešení: implementovat jako tag-based filtr (produkty mají `tags` JSON pole) NEBO odložit na budoucí iteraci.

**Doporučení:** Filtr Pohlaví odložit — vyžaduje data-enrichment (tagy/metadata). Aktuální filtry odpovídají dostupným datům.

2. **Cenové rozsahy v mockupu:** "do 3 000 Kč", "3 000–5 000 Kč", "nad 5 000 Kč" — aktuální kód má jiné rozsahy. Sjednotit s mockupem.

### PRODUCT GRID — stav: HOTOVO (95%)
3-column grid na desktopu, 2-column na mobilu. Karty mají pastel bg, badge, hover efekty.

**Drobné úpravy:**
1. Mockup ukazuje rounded karty s jemným okrajem — aktuální `rounded-[10px]` je OK.
2. **Badge styl:** Mockup ukazuje badge "BESTSELLER" / "NOVINKA" / "-25 %" — aktuální kód to podporuje, ale badge se nepředává z category page. Category page nepředává `badge` prop do `ProductCard`.

### TOP BAR (počet + řazení) — stav: HOTOVO
"42 produktů" vlevo, "Řadit: Nejprodávanější" vpravo. Odpovídá mockupu. Drobný rozdíl: mockup má "Nejprodávanější" jako defaultní sort, kód má "Nejnovější".

---

## Implementační kroky (seřazeno dle priority)

### Krok 1: Subcategory chips v hero banneru
**Soubor:** `src/app/(public)/kategorie/[slug]/page.tsx`

1. V Prisma query přidat `include: { children: true, parent: true }` k `findUnique`
2. Po `<p>` s `seoDesc` přidat subcategory chips komponentu:
   ```
   Pokud category má children (je rodič):
     - "Vše" chip (aktivní) + children chipy (neaktivní)
   Pokud category má parent (je dítě):
     - Link "Vše" → parent slug + siblings jako chipy
   ```
3. Styl chipů (z mockupu):
   - Aktivní: `bg-navy text-white px-5 py-2.5 rounded-full text-[14px] font-bold`
   - Neaktivní: `border border-white/30 text-white px-5 py-2.5 rounded-full text-[14px] font-medium hover:bg-white/10`
4. Layout: chipy zarovnané doprava ve flex kontejneru s `justify-between` nebo absolutně pozicované v rámci hero

**Pozice v layoutu:**
```tsx
<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mt-6">
  <p className="text-[15px] text-white/50 ...">...</p>
  <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
    {/* chips */}
  </div>
</div>
```

### Krok 2: Aktualizace cenových rozsahů ve FilterBar
**Soubor:** `src/components/FilterBar.tsx`

Změnit `priceRanges` pole:
```ts
const priceRanges = [
  { label: "do 3 000 Kč", min: 0, max: 3000 },
  { label: "3 000 – 5 000 Kč", min: 3000, max: 5000 },
  { label: "nad 5 000 Kč", min: 5000, max: 999999 },
];
```

### Krok 3: Badge logika pro ProductCard v kategorii
**Soubor:** `src/app/(public)/kategorie/[slug]/page.tsx`

Aktuální kód nepředává `badge` prop. Přidat jednoduchou logiku:
- Produkt vytvořený v posledních 14 dnech → badge "NOVINKA"
- Produkt s nejvyšším prodejem (nebo první na stránce) → badge "BESTSELLER"
- Pokud nemáme sales data, badge logiku odložit na budoucí iteraci (vyžaduje order tracking)

**Doporučení:** Pro teď přeskočit — badge logika vyžaduje prodejní data, která ještě nejsou implementována. Stávající ProductCard badge prop je připravený, stačí ho pak využít.

### Krok 4: Default sort "Nejprodávanější"
**Soubor:** `src/components/SortDropdown.tsx`

Mockup ukazuje "Nejprodávanější" jako default. Aktuálně je to "Nejnovější". Bez sales dat nelze implementovat reálný bestseller sort. Ponechat "Nejnovější" jako default.

**Doporučení:** Odložit na iteraci, kdy budou sales/order data.

---

## Shrnutí: Co implementovat TEĎ vs. ODLOŽIT

### IMPLEMENTOVAT:
| # | Úprava | Soubor | Náročnost |
|---|--------|--------|-----------|
| 1 | Subcategory chips v hero | `kategorie/[slug]/page.tsx` | Střední |
| 2 | Cenové rozsahy sladit s mockupem | `FilterBar.tsx` | Malá |

### ODLOŽIT (chybí data):
| # | Úprava | Důvod odložení |
|---|--------|----------------|
| 3 | Filtr Pohlaví | Chybí gender data v DB/tagech |
| 4 | Badge "BESTSELLER"/"NOVINKA" z category page | Chybí sales data pro bestseller logiku |
| 5 | Sort "Nejprodávanější" | Chybí sales data |

---

## Technické detaily pro Krok 1 (subcategory chips)

### Prisma query úprava:
```ts
// Aktuální:
const category = await prisma.category.findUnique({ where: { slug } });

// Nové:
const category = await prisma.category.findUnique({
  where: { slug },
  include: {
    children: { orderBy: { position: "asc" } },
    parent: {
      include: {
        children: { orderBy: { position: "asc" } },
      },
    },
  },
});
```

### JSX pro chipy:
```tsx
{/* Subcategory chips */}
{(() => {
  const isParent = category.children.length > 0;
  const isChild = !!category.parent;
  
  if (!isParent && !isChild) return null;
  
  const parentCat = isChild ? category.parent! : category;
  const siblings = isChild ? category.parent!.children : category.children;
  
  return (
    <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
      <Link
        href={`/kategorie/${parentCat.slug}`}
        className={`px-5 py-2 rounded-full text-[14px] font-bold transition-colors ${
          !isChild
            ? "bg-white text-navy"
            : "border border-white/30 text-white hover:bg-white/10"
        }`}
      >
        Vše
      </Link>
      {siblings.map((sub) => (
        <Link
          key={sub.id}
          href={`/kategorie/${sub.slug}`}
          className={`px-5 py-2 rounded-full text-[14px] font-bold transition-colors ${
            sub.slug === slug
              ? "bg-white text-navy"
              : "border border-white/30 text-white hover:bg-white/10"
          }`}
        >
          {sub.name}
        </Link>
      ))}
    </div>
  );
})()}
```

### Layout hero banneru s chipy:
Přestavět spodní část hero na flex row (desktop) / column (mobil):
```tsx
<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
  {category.seoDesc && (
    <p className="text-[15px] text-white/50 font-medium max-w-[400px]">{category.seoDesc}</p>
  )}
  {/* subcategory chips zde */}
</div>
```

---

## Kontrolní checklist před nasazením:
- [ ] Subcategory chipy se zobrazují pouze pokud kategorie má children nebo parent
- [ ] "Vše" chip ukazuje na rodičovskou kategorii
- [ ] Aktivní chip je vizuálně odlišen (bílé bg, navy text)
- [ ] Na mobilu se chipy wrappují do dalšího řádku
- [ ] Cenové rozsahy v FilterBar odpovídají mockupu
- [ ] Stránka funguje i bez subcategories (zpětná kompatibilita)
- [ ] Žádné TypeScript chyby po úpravě Prisma query
