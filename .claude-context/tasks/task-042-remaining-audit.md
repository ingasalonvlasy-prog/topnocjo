# TASK-042: Audit zbývajících nedostatků

**Datum:** 2026-11-11
**Auditor:** Plánovač agent

---

## KRITICKÉ (security/GDPR)

### K1: Server actions nemají auth kontrolu
**Závažnost: KRITICKÁ**

Admin layout.tsx volá `requireAdmin()`, což chrání **page rendering**. Ale server actions (definované v `actions.ts`) jsou volatelné přímo přes POST request bez session — Next.js je exponuje jako API endpointy.

**Neochráněné server actions:**
- `src/app/(admin)/admin/produkty/actions.ts` — `bulkUpdateProductStatus`, `bulkDeleteProducts`
- `src/app/(admin)/admin/slevy/actions.ts` — `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode`
- `src/app/(admin)/admin/recenze/actions.ts` — `approveReview`, `rejectReview`, `deleteReview`
- `src/app/(admin)/admin/objednavky/[id]/actions.ts` — `updateOrderStatus`, `updateTracking`, `updateAdminNote`, `markSupplierOrdered`, `markSupplierReceived`
- `src/app/(admin)/admin/nastaveni/actions.ts` — `saveStoreSettings`, `saveEmailSettings`, `saveSocialSettings`, `saveSeoSettings`
- `src/app/(admin)/admin/opustene-pokladny/actions.ts` — `sendRecoveryEmail`, `deleteAbandonedCheckout`
- `src/app/(admin)/admin/dodavatele/page.tsx` (inline actions) — `createSupplier`, `triggerImport`
- `src/app/(admin)/admin/znacky/page.tsx` (inline actions) — `createBrand`, `deleteBrand`
- `src/app/(admin)/admin/znacky/[id]/page.tsx` (inline actions) — `updateBrand`

**FIX:** Přidat `await requireAdmin();` na začátek každé server action.

### K2: Admin API routes nemají auth
**Závažnost: KRITICKÁ** (detailně pokryto v task-042-admin-api-auth-impl-plan.md)

- `GET /api/admin/orders/export` — export objednávek s osobními údaji
- `GET /api/admin/customers/export` — export zákazníků
- `POST /api/admin/zasilkovna/test` — test API klíčů

---

## VYSOKÁ PRIORITA

### V1: Chybí robots.txt a sitemap.xml
**Soubor:** Neexistuje `src/app/robots.ts` ani `src/app/sitemap.ts`
**Dopad:** Vyhledávače nemají návod co indexovat, nevidí všechny stránky.
**FIX:**
- Vytvořit `src/app/robots.ts` — povolit vše kromě /admin, /api, /pokladna, /ucet
- Vytvořit `src/app/sitemap.ts` — dynamicky generovat z produktů, kategorií, značek, blogpostů

### V2: Statické stránky nemají openGraph metadata
**Dotčené stránky (nemají `openGraph` v metadata):**
- `/o-nas` (`src/app/(public)/o-nas/page.tsx`)
- `/kontakt` (`src/app/(public)/kontakt/page.tsx`)
- `/obchodni-podminky` (`src/app/(public)/obchodni-podminky/page.tsx`)
- `/doprava-a-platba` (`src/app/(public)/doprava-a-platba/page.tsx`)
- `/vraceni-zbozi` (`src/app/(public)/vraceni-zbozi/page.tsx`)
- `/reklamace` (`src/app/(public)/reklamace/page.tsx`)
- `/cookies` (`src/app/(public)/cookies/page.tsx`)
- `/velikosti` (`src/app/(public)/velikosti/page.tsx`)
- `/registrace` (`src/app/(public)/registrace/page.tsx`)
- `/prihlaseni` (`src/app/(public)/prihlaseni/page.tsx`)
- `/hledat` (`src/app/(public)/hledat/page.tsx`)

**FIX:** Přidat `openGraph: { title, description }` ke každému `metadata` exportu. OG image dědí z root `opengraph-image.tsx` (existuje), stačí title+description.

### V3: Chybí error.tsx boundary pro admin i public
**Dopad:** Neošetřená chyba = Next.js default error stránka (bílá s "Application error").
**FIX:**
- Vytvořit `src/app/(admin)/admin/error.tsx` — "Něco se pokazilo" + retry button
- Vytvořit `src/app/(public)/error.tsx` — branded error stránka

---

## STŘEDNÍ PRIORITA

### S1: Slevy — lepší empty state + export
**Soubor:** `src/app/(admin)/admin/slevy/page.tsx`
**Aktuální empty state (řádek 38-40):** Jen text "Zatím žádné slevové kódy."
**Chybí:**
- Export CSV tlačítko
- Stat karty (celkem aktivních, celkem využití, celkový objem slev)
- Lepší empty state s ikonou a CTA

**FIX:**
- Přidat stat karty nahoře: Aktivní kódy, Celkem využití, Vypršelé
- Přidat Export CSV tlačítko vedle "+ Nový kód"
- Přidat API route `src/app/api/admin/discounts/export/route.ts` (s auth!)
- Lepší empty state: ikona + popis + "Vytvořit první slevový kód" button

### S2: Značky — chybí logo thumbnail v tabulce (na hlavní list page)
**Soubor:** `src/app/(admin)/admin/znacky/page.tsx`
**Aktuální stav (řádek 88-99):** Logo sloupec existuje a zobrazuje obrázek nebo fallback písmeno. **FUNGUJE SPRÁVNĚ.**
**Závěr:** Tento bod z auditu je FALEŠNÝ ALARM — logo thumbnail v tabulce značek už existuje.

### S3: Košík — chybí cross-sell / doporučené produkty
**Soubor:** `src/app/(public)/kosik/page.tsx`
**Aktuální stav:** Jen položky + souhrn, žádné doporučení.
**FIX:** Přidat sekci "Mohlo by se ti hodit" pod položky košíku s 3-4 produkty (random z podobné kategorie nebo nejprodávanější).
**Implementace:** Server component wrapper kolem client CartPage, nebo přidat API call pro doporučení.

### S4: Produkt stránka — velikostní tabulka link existuje, ale jen pro boty
**Soubor:** `src/components/ProductActions.tsx:37-39`
**Aktuální:** Link "/velikosti" se zobrazuje. **FUNGUJE.**
**Závěr:** Tento bod z auditu je OK — velikostní tabulka link existuje.

---

## NÍZKÁ PRIORITA (nice-to-have)

### N1: Admin loading states chybí pro většinu stránek
**Existuje:** `src/app/(admin)/admin/loading.tsx`
**Chybí:** Individuální loading.tsx pro pomalejší stránky (finance, analytika, růst)

### N2: Znacky stránka — chybí search/filtrování
**Soubor:** `src/app/(admin)/admin/znacky/page.tsx`
**Aktuální:** Jen seznam bez filtrování.
**FIX:** Přidat search input pro hledání značek (stačí pro větší počty).

### N3: Finance stránka — "Export CSV" link na `/admin/objednavky?export=csv`
**Soubor:** `src/app/(admin)/admin/finance/page.tsx:362`
**Problém:** Odkaz vede na `/admin/objednavky?export=csv`, ale tato stránka pravděpodobně neobsluhuje `export` parametr — měl by vést na `/api/admin/orders/export`.

### N4: Dodavatelé — inline server actions bez requireAdmin
Viz K1 — pokryto v kritické sekci.

### N5: Recenze — chybí pagination
**Soubor:** `src/app/(admin)/admin/recenze/page.tsx:26`
**Aktuální:** `take: 100` — zobrazí max 100 recenzí, žádná pagination.
**FIX:** Přidat pagination (jako u zákazníků).

### N6: Opuštěné pokladny — page funguje dobře
**Soubor:** `src/app/(admin)/admin/opustene-pokladny/page.tsx`
**Stav:** Stat karty, filtr, search, pagination, akce — vše implementováno. OK.

---

## SOUHRN PRIORIT

| Priorita | Položka | Odhad práce |
|----------|---------|-------------|
| **KRITICKÁ** | K1: Server actions auth | ~2 řádky na action × 20+ actions = ~50 řádků |
| **KRITICKÁ** | K2: Admin API auth | ~15 řádků (pokryto v auth plánu) |
| **VYSOKÁ** | V1: robots.txt + sitemap.ts | ~80 řádků (2 nové soubory) |
| **VYSOKÁ** | V2: OG metadata statické stránky | ~30 řádků (2 řádky na stránku × 11) |
| **VYSOKÁ** | V3: Error boundaries | ~40 řádků (2 nové soubory) |
| **STŘEDNÍ** | S1: Slevy upgrade | ~100 řádků |
| **STŘEDNÍ** | S3: Košík cross-sell | ~80 řádků |
| **NÍZKÁ** | N1-N5: Drobnosti | ~60 řádků celkem |

**Celkový odhad:** ~455 řádků nového/upraveného kódu

---

## DOPORUČENÝ POSTUP

1. **IHNED (K1+K2):** Přidat `requireAdmin()` do VŠECH server actions a API routes
2. **Dnes (V1-V3):** robots.txt, sitemap, OG metadata, error boundaries
3. **Tento sprint (S1, S3):** Slevy upgrade, košík cross-sell
4. **Backlog (N1-N5):** Nízké priority přidat do dalšího sprintu
