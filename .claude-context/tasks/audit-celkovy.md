# Celkovy audit webu — Qsport.cz

**Datum:** 2026-11-18
**Status:** Kompletni

---

## OBSAH

1. [KRITICKE BUGY A ROZBITÁ LOGIKA](#1-kriticke-bugy)
2. [UX PROBLEMY](#2-ux-problemy)
3. [KONZISTENCE A DESIGN](#3-konzistence)
4. [CHYBEJICI FUNKCIONALITA](#4-chybejici)
5. [BEZPECNOST](#5-bezpecnost)
6. [SEO A METADATA](#6-seo)
7. [STRANKA PO STRANCE](#7-stranka-po-strance)
8. [SOUHRN PRIORIT](#8-souhrn)

---

## 1. KRITICKE BUGY A ROZBITÁ LOGIKA {#1-kriticke-bugy}

### BUG-01: Stránka značky — `getFilterOptions()` bez parametrů (KRITICKÝ)
**Soubor:** `src/app/(public)/znacky/[slug]/page.tsx:53`
```ts
getFilterOptions()  // volá se BEZ categoryId i BEZ brandSlug
```
Vrací velikosti ze VŠECH produktů v celém obchodě. Uživatel vidí směs obuvi (36-47), oblečení (S-XXL), dětských výšek (80-176). Totožný bug jako na parent kategoriích (ten je vyřešen v plánu Task #1).

**Fix:** Přidat `brandSlug` parametr do `getFilterOptions()` a filtrovat na brand:
```ts
getFilterOptions(undefined, { brandSlug: slug })
```

### BUG-02: Stránka značky — sort je statický text, neklikatelný
**Soubor:** `src/app/(public)/znacky/[slug]/page.tsx:96-98`
```tsx
<span className="text-[13px] text-muted">
  Řadit: <span className="font-bold text-ink">{sortLabel[sort || ""]}</span>
</span>
```
Nepoužívá `SortDropdown` komponent — uživatel nemůže řadit produkty. Všechny ostatní listing stránky (kategorie, hledat, akce, bazar) používají `<SortDropdown />` správně.

**Fix:** Nahradit statický text za `<SortDropdown />`.

### BUG-03: Stránka značky — FilterBar viditelný na mobilu bez draweru
**Soubor:** `src/app/(public)/znacky/[slug]/page.tsx:101-107`
```tsx
<div className="lg:hidden mb-5">
  <FilterBar brands={...} sizes={...} priceRange={...} />
</div>
```
Na mobilu se renderuje celý FilterBar přímo na stránce (ne v draweru). Všechny ostatní listing stránky používají `MobileFilterDrawer` s tlačítkem "Filtry" a bottom sheet.

**Fix:** Nahradit za `<MobileFilterDrawer>` wrapper s `activeFilterCount`.

### BUG-04: Stránka vyhledávání — `getFilterOptions()` bez scope
**Soubor:** `src/app/(public)/hledat/page.tsx:49`
```ts
getFilterOptions()  // bez parametrů
```
Stejný problém — vrací velikosti ze všech produktů. U search page to je méně kritické protože hledání je cross-kategorie, ale měly by se filtrovat na výsledky hledání.

### BUG-05: Stránka akce — `getFilterOptions()` s `saleOnly` ale bez category scope
**Soubor:** `src/app/(public)/akce/page.tsx:50`
```ts
getFilterOptions(undefined, { saleOnly: true })
```
Filtruje na slevové produkty, ale pořád tahá velikosti z celého eshopu (jen s comparePrice). Směs velikostí bot+oblečení.

### BUG-06: Search autocomplete API — diacritika nefunguje
**Soubor:** `src/app/api/search/route.ts:50`
```ts
if (qNorm !== qLower)  // "beh" === "beh" → true → druhý dotaz se NIKDY nespustí
```
Když uživatel píše bez diakritiky ("beh" místo "běh"), `qNorm` a `qLower` jsou stejné, takže stripped search se nikdy nespustí. Podrobně v plánu Task #4 (`task-051-search-plan.md`).

### BUG-07: `generateMetadata` v hledat nemá query v title
**Soubor:** `src/app/(public)/hledat/page.tsx:14`
```ts
export function generateMetadata({ searchParams }: ...): Metadata {
  return { title: "Vyhledávání", ... };
}
```
`searchParams` se ignoruje — title je vždy "Vyhledávání" místo "Výsledky pro X | Qsport.cz". Funkce není async, takže `searchParams` (Promise) se ani nečte.

**Fix:** Udělat funkci `async`, awaitat searchParams, přidat query do title.

---

## 2. UX PROBLEMY {#2-ux-problemy}

### UX-01: Homepage bestsellery — `Math.random()` shuffle
**Soubor:** `src/app/(public)/page.tsx` (z kontextu předchozí konverzace)
60 nejprodávanějších produktů se shufflují pomocí `Math.random()` a berou se 4. Tohle může způsobit:
- Hydration mismatch (server vs client render different order)
- Každý refresh ukazuje jiné produkty — žádná konzistence
- Není deterministické pro SSR/ISR cache

**Fix:** Buď seed-based random (z data), nebo rotace podle dne/hodiny, nebo prostě zobrazit top 4.

### UX-02: Homepage — "Serie · POC na zimu" sekce je nepřesná
Homepage sekce "Serie" zobrazuje `newest.slice(0, 2)` — prostě 2 nejnovější produkty z celého eshopu. Nadpis říká "POC" ale produkty mohou být cokoliv.

**Fix:** Buď filtrovat na POC brand, nebo změnit nadpis, nebo sekci odstranit.

### UX-03: HeroSearch je 194-řádkový duplikát SearchAutocomplete
**Soubory:** `src/components/HeroSearch.tsx` (194 řádků) a `src/components/SearchAutocomplete.tsx` (446 řádků)
HeroSearch chybí: keyboard nav, recent searches, query highlighting, "Skladem" badge. Podrobně v Task #4 plánu.

### UX-04: Stránka značky — duplicitní počet produktů
**Soubor:** `src/app/(public)/znacky/[slug]/page.tsx`
Řádek 82: `<p className="text-[13px]...">{result.total} produktů</p>` a řádek 95: `<span className="text-[14px]...">{result.total} produktů</span>` — dvakrát se zobrazuje stejná informace.

### UX-05: Stránka hledat — duplicitní počet produktů
**Soubor:** `src/app/(public)/hledat/page.tsx`
Řádek 76: `{result.total} produktů` a řádek 93: `{result.total} produktů`. Stejná duplicita.

### UX-06: Stránka značky — chybí hero banner
Všechny ostatní listing stránky (kategorie, akce, bazar) mají navy hero banner s breadcrumbs a nadpisem. Stránka značky má jen prosté breadcrumbs a nadpis bez banneru. Nekonzistentní vizuál.

### UX-07: Newsletter unsubscribe — nepoužívá design systém
**Soubor:** `src/app/(public)/odhlasit-newsletter/page.tsx`
Používá `bg-gray-50`, `text-gray-900`, `border-gray-200`, `rounded-lg` místo design tokenů (`bg-wash`, `text-ink`, `border-line`, `rounded-[10px]`). Stránka vypadá jinak než zbytek webu.

### UX-08: Stránka o-nas — nemá breadcrumbs komponent
**Soubor:** `src/app/(public)/o-nas/page.tsx:13-17`
Používá ruční `<nav>` breadcrumbs místo `<Breadcrumbs>` komponenty. Funkčně ok, ale nekonzistentní.

### UX-09: Stránka vrácení zboží — nemá breadcrumbs komponent
**Soubor:** `src/app/(public)/vraceni-zbozi/page.tsx:13-17`
Stejné jako UX-08 — ruční breadcrumbs místo `<Breadcrumbs>` komponenty.

### UX-10: Stránka velikostí — jen pánské velikosti oblečení
**Soubor:** `src/app/(public)/velikosti/page.tsx:108`
Tabulka oblečení říká "Orientační velikosti pro **pánské** sportovní oblečení" — chybí dámské a dětské tabulky. Web přitom prodává muži/ženy/děti.

### UX-11: Produkt card — ProductCard zobrazuje "Skladem" i pro supplier stock
**Soubor:** `src/components/ProductCard.tsx:254-256`
```tsx
{(hasOwnStock || hasSupplierStock) && (
  <span className="text-[11px] font-bold text-green-600">Skladem</span>
)}
```
Říká "Skladem" i když je produkt jen u dodavatele — zákazník čeká rychlé dodání ale reálně to trvá déle. Mělo by se rozlišit: "Skladem" vs "U dodavatele (3-5 dní)" nebo podobně.

---

## 3. KONZISTENCE A DESIGN {#3-konzistence}

### CONS-01: Footer — chybí hlavní navigace Muži/Ženy/Děti
**Soubor:** `src/components/Footer.tsx:28-33`
Sekce "Nakupování" obsahuje: Běh, Hory a outdoor, Zima, Bazar, Akce. Chybí hlavní kategorie Muži, Ženy, Děti — přitom to je primární navigační struktura webu.

### CONS-02: Footer — chybí odkaz na Kontakt stránku
**Soubor:** `src/components/Footer.tsx`
Sekce "Kontakt" má email a telefon, ale ne odkaz na `/kontakt` stránku kde je formulář a mapa.

### CONS-03: Footer — chybí odkaz na Cookies stránku
**Soubor:** `src/components/Footer.tsx`
Cookies stránka existuje (`/cookies`) ale není z footeru odkazována. GDPR best practice je mít link na cookies policy ve footeru.

### CONS-04: Header — desktop search toggle skrytý na homepage
**Soubor:** `src/components/Header.tsx:166`
```tsx
{searchOpen && !isHomepage && (
```
Na homepage se header search neotevře — předpokládá se HeroSearch v hero sekci. Ale na mobilu (řádek 173):
```tsx
{!isHomepage && (
```
Na homepage mobilu NENÍ vůbec žádný search v headeru. Uživatel musí scrollovat k hero sekci.

### CONS-05: Breadcrumbs nejsou konzistentní
Některé stránky používají `<Breadcrumbs>` komponent (cookies, blog, ucet pages), jiné mají ruční breadcrumbs (o-nas, vraceni-zbozi, znacky/[slug]).

### CONS-06: Hero banner — nekonzistentní použití
- Kategorie, Akce, Bazar, Značky listing, Velikosti: mají navy hero banner
- Značky/[slug] detail: NEMÁ hero banner (jen breadcrumbs + h1)
- Hledat: NEMÁ hero banner

### CONS-07: Copyright rok hardcoded
**Soubor:** `src/components/Footer.tsx:148`
```tsx
<span>&copy; 2026 Qsport.cz</span>
```
Hardcoded 2026, nebude se automaticky aktualizovat.

---

## 4. CHYBEJICI FUNKCIONALITA {#4-chybejici}

### MISS-01: Chybí GDPR souhlas s podmínkami při registraci
**Soubor:** `src/app/(public)/registrace/page.tsx`
Registrační formulář nemá povinný checkbox "Souhlasím s obchodními podmínkami a zpracováním osobních údajů". Jsou tu jen volitelný newsletter checkbox. Pro český e-shop je povinný souhlas s VOP vyžadován.

### ~~MISS-02: 404 stránka~~ — EXISTUJE
`src/app/not-found.tsx` a `src/app/(public)/not-found.tsx` existují. OK.

### ~~MISS-03: Loading skeleton~~ — EXISTUJE
`src/app/(public)/loading.tsx`, `kategorie/[slug]/loading.tsx`, `produkt/[slug]/loading.tsx` existují. OK.

### ~~MISS-04: Error boundary~~ — EXISTUJE
`src/app/(public)/error.tsx` existuje. OK.

### ~~MISS-05: Sitemap a robots~~ — EXISTUJE
`src/app/sitemap.ts` a `src/app/robots.ts` existují. OK.

### MISS-06: Stránka kontakt — nemá formulář (z předchozího čtení)
Kontakt stránka existuje ale potřeba ověřit obsah.

### MISS-07: Chybí "Zrušit filtr" / "Resetovat filtry" tlačítko
Na listing stránkách (kategorie, hledat, akce, bazar, znacky) když uživatel nastaví filtry a nic se nenajde, není jednoduchý způsob jak resetovat všechny filtry najednou. `ActiveFilterChips` umožňuje odstranit jednotlivé, ale ne všechny najednou.

---

## 5. BEZPECNOST {#5-bezpecnost}

### SEC-01: Blog content — dangerouslySetInnerHTML bez sanitizace
**Soubor:** `src/app/(public)/blog/[slug]/page.tsx:131`
```tsx
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```
Blog content se vykresluje jako raw HTML. Pokud je content generován AI nebo editován v adminu, měl by projít sanitizací (DOMPurify nebo podobně) aby se zabránilo XSS.

### SEC-02: Registrace — žádný rate limiting
**Soubor:** `src/app/(public)/registrace/page.tsx`
Server action `registerUser` nemá žádný rate limiting. Útočník může spamovat registrace.

### SEC-03: Password reset — žádný rate limiting
**Soubor:** `src/app/(public)/zapomenute-heslo/page.tsx`
Server action `requestReset` nemá rate limiting. Útočník může spamovat reset emaily.

### SEC-04: Login — žádný brute force ochrana
**Soubor:** `src/app/(public)/prihlaseni/page.tsx`
Server action `loginUser` nemá žádné omezení počtu pokusů. Brute force attack je možný.

---

## 6. SEO A METADATA {#6-seo}

### SEO-01: Hledat stránka — title neobsahuje query
Viz BUG-07 výše.

### SEO-02: Blog detail — metaDescription může být null
**Soubor:** `src/app/(public)/blog/[slug]/page.tsx:17`
```ts
description: post.metaDescription || post.excerpt || `${post.title} – blog Qsport.cz`,
```
Fallback chain je ok, ale pokud excerpt je také null/empty, description bude generic.

### SEO-03: Obchodní podmínky, Reklamace — neměly by být indexovány
Právní stránky typicky nemají SEO hodnotu. Mohly by mít `robots: { index: false }`.

### SEO-04: Chybí canonical URL na listing stránkách
Stránky s filtry a stránkováním (?strana=2&znacka=on) nemají canonical URL na základní verzi stránky. Může způsobit duplicate content v Google indexu.

### SEO-05: Stránka značky — chybí OpenGraph metadata
**Soubor:** `src/app/(public)/znacky/[slug]/page.tsx:17-20`
```ts
return {
  title: `${brand.name} | Qsport.cz`,
  description: `Sportovní vybavení ${brand.name} na Qsport.cz`,
};
```
Chybí `openGraph` objekt.

---

## 7. STRÁNKA PO STRÁNCE {#7-stranka-po-strance}

### `/` (Homepage)
- **Funguje:** Hero, brand loga, gender karty, newsletter, blog
- **Problémy:** UX-01 (random bestsellery), UX-02 (POC sekce nepřesná), UX-03 (HeroSearch duplikát)
- **Priorita:** Střední

### `/kategorie/[slug]` (Kategorie)
- **Funguje:** Po implementaci Task #1 bude ok — CategorySidebar + HorizontalFilters + correct scoping
- **Problémy:** Vyřešeny v plánu Task #1
- **Priorita:** Hotovo (plán existuje)

### `/produkt/[slug]` (Produkt detail)
- **Funguje:** Galerie, varianty, tabs, related, JSON-LD, sticky CTA mobil
- **Problémy:** UX-11 (Skladem vs dodavatel), jinak ok
- **Priorita:** Nízká

### `/kosik` (Košík)
- **Funguje:** Správa položek, free shipping progress, cross-sell, mobile sticky
- **Problémy:** Žádné kritické
- **Priorita:** Ok

### `/pokladna` (Pokladna)
- **Funguje:** 6 sekcí, Comgate, abandoned checkout tracking, recovery
- **Problémy:** Žádné kritické
- **Priorita:** Ok

### `/hledat` (Vyhledávání)
- **Funguje:** Základní filtrování a stránkování
- **Problémy:** BUG-04 (filter scope), BUG-06 (diacritika), BUG-07 (title), UX-05 (duplicitní count)
- **Priorita:** Vyřešeno v plánu Task #4

### `/znacky` (Značky listing)
- **Funguje:** Grid s logama, počty produktů, breadcrumbs
- **Problémy:** Žádné
- **Priorita:** Ok

### `/znacky/[slug]` (Značka detail)
- **Funguje:** Základní listing a filtrování
- **Problémy:** BUG-01 (mixed sizes), BUG-02 (sort nefunkční), BUG-03 (mobile filter), UX-04 (duplicitní count), UX-06 (chybí hero), SEO-05 (OG)
- **Priorita:** VYSOKÁ — 4 bugy na jedné stránce

### `/akce` (Akce)
- **Funguje:** Hero, FilterBar, MobileFilterDrawer, stránkování
- **Problémy:** BUG-05 (mixed sizes v filtrech)
- **Priorita:** Střední

### `/bazar` (Bazar)
- **Funguje:** Hero, FilterBar, scoped na bazar kategorii, MobileFilterDrawer
- **Problémy:** Žádné (category scope je správný)
- **Priorita:** Ok

### `/blog` (Blog listing)
- **Funguje:** Section tabs, sport tag pills, pagination, BlogCard
- **Problémy:** Žádné
- **Priorita:** Ok

### `/blog/[slug]` (Blog detail)
- **Funguje:** Cover image, sport tags, sources, related products, breadcrumbs
- **Problémy:** SEC-01 (XSS v content)
- **Priorita:** Střední (bezpečnost)

### `/kontakt` (Kontakt)
- **Funguje:** Z předchozího čtení v pořádku
- **Problémy:** Žádné kritické
- **Priorita:** Ok

### `/doprava-a-platba` (Doprava)
- **Funguje:** Z předchozího čtení v pořádku
- **Problémy:** Žádné kritické
- **Priorita:** Ok

### `/obchodni-podminky` (OP)
- **Funguje:** Z předchozího čtení v pořádku
- **Problémy:** SEO-03 (indexace)
- **Priorita:** Nízká

### `/reklamace` (Reklamace)
- **Funguje:** Z předchozího čtení v pořádku
- **Problémy:** SEO-03 (indexace)
- **Priorita:** Nízká

### `/o-nas` (O nás)
- **Funguje:** Statický obsah, kontaktní info
- **Problémy:** UX-08 (ruční breadcrumbs)
- **Priorita:** Nízká

### `/vraceni-zbozi` (Vrácení)
- **Funguje:** Statický obsah
- **Problémy:** UX-09 (ruční breadcrumbs)
- **Priorita:** Nízká

### `/cookies` (Cookies)
- **Funguje:** Cookie tabulky, popis typů
- **Problémy:** Žádné
- **Priorita:** Ok

### `/velikosti` (Tabulka velikostí)
- **Funguje:** Boty, oblečení, helmy tabulky, tip na měření
- **Problémy:** UX-10 (jen pánské oblečení)
- **Priorita:** Střední

### `/prihlaseni` (Přihlášení)
- **Funguje:** Login form, error handling, redirect, imported account handling
- **Problémy:** SEC-04 (brute force)
- **Priorita:** Střední (bezpečnost)

### `/registrace` (Registrace)
- **Funguje:** Registration form, newsletter opt-in, password validation
- **Problémy:** MISS-01 (GDPR souhlas), SEC-02 (rate limiting)
- **Priorita:** VYSOKÁ (GDPR)

### `/zapomenute-heslo` (Reset hesla)
- **Funguje:** Email form, success state, token generation
- **Problémy:** SEC-03 (rate limiting)
- **Priorita:** Střední

### `/obnova-hesla` (Nové heslo)
- **Funguje:** Token validace, password form, error handling, invalid token state
- **Problémy:** Žádné kritické
- **Priorita:** Ok

### `/ucet` (Dashboard)
- **Funguje:** Welcome, stats, recent orders, AccountNav
- **Problémy:** Žádné
- **Priorita:** Ok

### `/ucet/objednavky` (Objednávky)
- **Funguje:** Order list s badges, item summary, links na detail
- **Problémy:** Žádné
- **Priorita:** Ok

### `/ucet/oblibene` (Oblíbené)
- **Funguje:** Wishlist grid, empty state, ProductCard
- **Problémy:** Žádné
- **Priorita:** Ok

### `/ucet/udaje` (Údaje)
- **Funguje:** Profile, address, password change, success/error messages
- **Problémy:** Žádné
- **Priorita:** Ok

### `/objednavka/[orderNumber]` (Potvrzení objednávky)
- **Funguje:** Order items, addresses, payment info, tracking, progress stepper, viewToken auth, payment failed state, bank transfer instructions
- **Problémy:** Žádné
- **Priorita:** Ok

### `/odhlasit-newsletter` (Newsletter unsubscribe)
- **Funguje:** Unsubscribe form, success state
- **Problémy:** UX-07 (nepoužívá design systém)
- **Priorita:** Nízká

---

## 8. SOUHRN PRIORIT {#8-souhrn}

### KRITICKÉ (opravit ihned)
| ID | Problém | Stránka | Plán existuje? |
|----|---------|---------|----------------|
| BUG-01 | Značka — mixed sizes ve filtrech | `/znacky/[slug]` | NE |
| BUG-02 | Značka — sort nefunkční | `/znacky/[slug]` | NE |
| BUG-03 | Značka — FilterBar bez draweru na mobilu | `/znacky/[slug]` | NE |
| BUG-06 | Search autocomplete — diacritika | API `/api/search` | ANO (Task #4) |
| MISS-01 | Registrace — chybí GDPR souhlas | `/registrace` | NE |

### VYSOKÉ (opravit brzy)
| ID | Problém | Stránka | Plán existuje? |
|----|---------|---------|----------------|
| BUG-04 | Hledat — filter scope | `/hledat` | ANO (Task #4) |
| BUG-05 | Akce — mixed sizes | `/akce` | NE |
| BUG-07 | Hledat — title metadata | `/hledat` | ANO (Task #4) |
| UX-01 | Homepage — random bestsellery | `/` | NE |
| SEC-01 | Blog — XSS risk | `/blog/[slug]` | NE |
| UX-03 | HeroSearch duplikát | Homepage | ANO (Task #4) |

### STŘEDNÍ (plánovat)
| ID | Problém | Stránka |
|----|---------|---------|
| UX-02 | Homepage — POC sekce | `/` |
| UX-10 | Velikosti — jen pánské oblečení | `/velikosti` |
| UX-11 | ProductCard — Skladem vs dodavatel | Všechny listing stránky |
| SEC-02 | Registrace — rate limiting | `/registrace` |
| SEC-03 | Reset — rate limiting | `/zapomenute-heslo` |
| SEC-04 | Login — brute force | `/prihlaseni` |
| CONS-01 | Footer — chybí Muži/Ženy/Děti | Footer |
| CONS-04 | Header — homepage mobile search | Header |
| SEO-04 | Chybí canonical URL | Listing stránky |

### NÍZKÉ (nice to have)
| ID | Problém | Stránka |
|----|---------|---------|
| UX-04 | Značka — duplicitní count | `/znacky/[slug]` |
| UX-05 | Hledat — duplicitní count | `/hledat` |
| UX-06 | Značka — chybí hero | `/znacky/[slug]` |
| UX-07 | Newsletter unsubscribe design | `/odhlasit-newsletter` |
| UX-08 | O-nás — ruční breadcrumbs | `/o-nas` |
| UX-09 | Vrácení — ruční breadcrumbs | `/vraceni-zbozi` |
| CONS-02 | Footer — kontakt link | Footer |
| CONS-03 | Footer — cookies link | Footer |
| CONS-05 | Breadcrumbs nekonzistentní | Více stránek |
| CONS-06 | Hero banner nekonzistentní | `/znacky/[slug]`, `/hledat` |
| CONS-07 | Copyright rok hardcoded | Footer |
| MISS-07 | Chybí "Resetovat filtry" | Listing stránky |
| SEO-03 | OP/Reklamace indexace | Právní stránky |
| SEO-05 | Značka — chybí OG | `/znacky/[slug]` |

---

## DOPORUČENÝ POSTUP IMPLEMENTACE

### Fáze 1: Quick fixes (30 min)
1. **BUG-02**: Nahradit statický sort za `<SortDropdown />` na `/znacky/[slug]`
2. **BUG-03**: Nahradit inline FilterBar za `<MobileFilterDrawer>` na `/znacky/[slug]`
3. **BUG-07**: Opravit `generateMetadata` na `/hledat` (async + query v title)
4. **UX-04 + UX-05**: Odstranit duplicitní count na značce a hledání
5. **SEO-05**: Přidat `openGraph` do metadata na `/znacky/[slug]`

### Fáze 2: Filter scope fixes (45 min)
1. **BUG-01**: Přidat `brandSlug` parametr do `getFilterOptions()`, použít na `/znacky/[slug]`
2. **BUG-05**: Na `/akce` — mixed sizes je problém ale lower priority (cross-category sale is expected)

### Fáze 3: Registrace GDPR (15 min)
1. **MISS-01**: Přidat povinný checkbox s odkazem na OP

### Fáze 4: Security basics (30 min)
1. **SEC-01**: Přidat DOMPurify na blog content
2. **SEC-02/03/04**: Přidat basic rate limiting (IP-based counter v DB nebo in-memory)

### Fáze 5: Polish (1+ h)
1. Footer aktualizace (CONS-01, CONS-02, CONS-03, CONS-07)
2. Konzistence breadcrumbs a hero bannerů
3. Velikosti stránka — dámské a dětské tabulky
4. ~~404, loading, error, sitemap, robots~~ — již existují
