# QA Report — Tasky #13, #14, #16, #17, #19

**Datum:** 2026-11-10  
**Kontrolor:** kontrolor agent  
**Zdroje:** zdrojový kód, `npx next build`

---

## 1. Build

**Výsledek: PASSED**

`npx next build` proběhl bez chyb ani varování. Stránky `/bazar`, `/velikosti`, `/znacky` jsou v buildu přítomny (static `○`), `/znacky/[slug]` jako dynamic `ƒ`.

---

## 2. Stránka /bazar (#13)

**Výsledek: PASSED**

### Hero — wash bg

| Kontrola | Stav |
|----------|------|
| `bg-wash text-ink` hero (odlišné od navy heroů) | ✅ |
| Breadcrumb: Domů / Bazar | ✅ `text-muted` / `text-ink/70` |
| Badge "Bazar" — `bg-navy text-white` pill | ✅ |
| H1: "Druhá šance pro výbavu." — `text-navy`, `tracking-[-0.04em]` | ✅ |
| Modrá linka pod "pro výbavu." (`bg-blue h-[4px]`) | ✅ |
| Popis `text-muted font-medium max-w-[440px]` | ✅ |

### Filtry a grid

| Kontrola | Stav |
|----------|------|
| Prisma dotaz `category.findUnique({ where: { slug: "bazar" } })` | ✅ |
| `getFilteredProducts({ categoryId: category?.id, ... })` — kategorie bazar | ✅ |
| Sidebar filtry `hidden lg:block` | ✅ |
| MobileFilterDrawer `lg:hidden` | ✅ |
| Grid `grid-cols-2 lg:grid-cols-3 gap-4` | ✅ |
| Pagination s `baseUrl="/bazar"` | ✅ |
| `perPage: 24` | ✅ |

### Empty state

| Kontrola | Stav |
|----------|------|
| "V bazaru momentálně nic není." | ✅ |
| "Nové kousky přibývají průběžně — mrkni sem zase později." | ✅ |

### SEO

| Kontrola | Stav |
|----------|------|
| `title: "Bazar \| Qsport.cz"` | ✅ |
| `description` — "Secondhand sportovní vybavení za skvělé ceny..." | ✅ |
| `openGraph.title` a `openGraph.description` | ✅ |
| JSON-LD BreadcrumbList | ✅ |

### Diakritika

| Text | Stav |
|------|------|
| "Druhá šance pro výbavu." | ✅ |
| "Použité sportovní vybavení v dobrém stavu za zlomek ceny." | ✅ |
| "Každý kus prověřený, poctivě popsaný." | ✅ |
| "V bazaru momentálně nic není." | ✅ |
| "Nové kousky přibývají průběžně" | ✅ |
| "produktů" | ✅ |

---

## 3. Admin bulk akce (#14)

**Výsledek: PASSED**

### Checkboxy

| Kontrola | Stav |
|----------|------|
| "Vybrat vše" checkbox v thead | ✅ `checked={allSelected}` + `onChange={toggleAll}` |
| Per-row checkbox `checked={selected.has(product.id)}` | ✅ |
| Vybraný řádek zvýrazněn `bg-green-50` | ✅ |
| `toggleAll()` — přidá všechny / odstraní všechny | ✅ logika přes `Set<string>` |

### Bulk action bar

| Kontrola | Stav |
|----------|------|
| Zobrazuje se pouze když `selected.size > 0` | ✅ |
| Počet s českým skloňováním: "1 produkt vybrán", "2-4 produkty vybrány", "5+ produktů vybráno" | ✅ |
| Tlačítko "Aktivovat" → `bulkUpdateProductStatus(..., "ACTIVE")` | ✅ |
| Tlačítko "Deaktivovat" → `bulkUpdateProductStatus(..., "DRAFT")` | ✅ |
| Tlačítko "Archivovat" → `bulkUpdateProductStatus(..., "ARCHIVED")` | ✅ |
| Tlačítko "Smazat" → spustí confirm dialog | ✅ |
| Tlačítko "Zrušit výběr" → `setSelected(new Set())` | ✅ |
| `disabled={isPending}` na všech akcích | ✅ |

### Confirm dialog

| Kontrola | Stav |
|----------|------|
| Modal s `fixed inset-0 z-50 bg-black/50` | ✅ |
| "Smazat produkty?" jako nadpis | ✅ |
| Text s počtem a skloňováním ("produkt" / "produkty" / "produktů") | ✅ |
| "Tato akce je nevratná." varování | ✅ |
| Tlačítka "Zrušit" a "Smazat" (červené) | ✅ |
| `{isPending ? "Mazání..." : "Smazat"}` loading state | ✅ |

### Server actions

| Kontrola | Stav |
|----------|------|
| `"use server"` direktiva na vrcholu souboru | ✅ |
| `bulkUpdateProductStatus` — `prisma.product.updateMany` | ✅ |
| `bulkDeleteProducts` — `prisma.product.deleteMany` | ✅ |
| `revalidatePath("/admin/produkty")` po každé akci | ✅ |
| `logAdminAction(...)` volání pro audit log | ✅ |

### Diakritika (bulk)

| Text | Stav |
|------|------|
| "produkt vybrán" / "produkty vybrány" / "produktů vybráno" | ✅ |
| "Aktivovat" / "Deaktivovat" / "Archivovat" / "Smazat" | ✅ |
| "Zrušit výběr" / "Zrušit" | ✅ |
| "Smazat produkty?" / "Tato akce je nevratná." | ✅ |
| "Mazání..." | ✅ |

---

## 4. Social sharing — ShareButtons (#16)

**Výsledek: PASSED**

### Tlačítka

| Kontrola | Stav |
|----------|------|
| Facebook `https://www.facebook.com/sharer/sharer.php?u={encodedUrl}` | ✅ |
| WhatsApp `https://wa.me/?text={encodedText}` (název + URL) | ✅ |
| Clipboard — `navigator.clipboard.writeText(url)` | ✅ |
| Fallback pro starší browsery (`document.execCommand("copy")`) | ✅ |
| Copied feedback — checkmark SVG + tooltip "Zkopírováno" | ✅ |
| Timeout reset `setCopied(false)` po 2s | ✅ |
| `target="_blank" rel="noopener noreferrer"` na externích odkazech | ✅ |
| `aria-label` na všech tlačítkách | ✅ |

### Umístění na produkt detailu

| Kontrola | Stav |
|----------|------|
| Import `ShareButtons` v `produkt/[slug]/page.tsx` | ✅ řádek 13 |
| Umístění: po trust lines (`{/* Social sharing */}`) | ✅ řádek 221-225 |
| Pod blokem trust lines (skladem/doprava/vrácení) | ✅ — za uzavíracím `</div>` trust sekce |
| URL: `https://qsport.cz/produkt/${product.slug}` | ✅ absolutní URL |

### CSS

| Kontrola | Stav |
|----------|------|
| "Sdílet:" label `text-muted font-medium` | ✅ |
| Ikony `w-8 h-8 rounded-full border border-line text-muted` | ✅ |
| Facebook hover `hover:text-[#1877F2] hover:border-[#1877F2]` | ✅ |
| WhatsApp hover `hover:text-[#25D366] hover:border-[#25D366]` | ✅ |
| Clipboard hover `hover:text-navy hover:border-navy` | ✅ |

### Diakritika

| Text | Stav |
|------|------|
| "Sdílet:" | ✅ |
| "Sdílet na Facebooku" (aria-label) | ✅ |
| "Sdílet přes WhatsApp" (aria-label) | ✅ |
| "Kopírovat odkaz" (aria-label) | ✅ |
| "Zkopírováno" (tooltip) | ✅ |

---

## 5. Stránka /znacky (#17)

**Výsledek: PASSED**

### Hero navy

| Kontrola | Stav |
|----------|------|
| `bg-navy text-white py-10 lg:py-14` hero | ✅ |
| Breadcrumb: Domů / Značky | ✅ |
| H1: "Prémiové značky." s modrou podtrženou linkou | ✅ `bg-blue h-[4px]` |
| Popis: "Spolupracujeme s nejlepšími značkami... {brands.length} značek v nabídce." | ✅ dynamické počítání |

### Pastel karty a logo grid

| Kontrola | Stav |
|----------|------|
| `pastelBgs = ["bg-mint", "bg-sky", "bg-peach", "bg-lilac"]` — rotace | ✅ `i % pastelBgs.length` |
| Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4` | ✅ |
| Karta: `bg-white rounded-[var(--radius-card)] border border-line` | ✅ |
| Logo area: `aspect-[3/2]` s pastel bg, `mix-blend-mode: multiply` | ✅ |
| Fallback bez loga: první písmeno `text-[36px] font-extrabold text-navy/60` | ✅ |
| Počet produktů: `{brand._count.products} produktů` | ✅ |

### Hover efekty

| Kontrola | Stav |
|----------|------|
| `hover:border-navy hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)] hover:-translate-y-1 transition-all` | ✅ |
| Název značky `group-hover:text-blue transition-colors` | ✅ |

### SEO

| Kontrola | Stav |
|----------|------|
| `title: "Prémiové značky \| Qsport.cz"` | ✅ |
| `description` — "Spolupracujeme s nejlepšími sportovními značkami..." | ✅ |
| `openGraph.title` a `openGraph.description` | ✅ |
| Prisma filtr: `where: { products: { some: { status: "ACTIVE" } } }` — jen značky s produkty | ✅ |
| JSON-LD BreadcrumbList | ✅ |

### Diakritika

| Text | Stav |
|------|------|
| "Prémiové značky." | ✅ |
| "Spolupracujeme s nejlepšími značkami pro tvůj sportovní výkon." | ✅ |
| "značek v nabídce" | ✅ |
| "produktů" (počítadlo) | ✅ |

---

## 6. Stránka /velikosti (#19)

**Výsledek: PASSED**

### Tabulky EU/UK/US/cm

| Kontrola | Stav |
|----------|------|
| Tabulka bot: EU, UK, US, Délka (cm) — 17 řádků (36–47) | ✅ |
| Tabulka oblečení: Velikost, Hrudník, Pas, Boky — XS až XXL | ✅ |
| Tabulka helem: Velikost, Obvod hlavy — XS až XXL | ✅ |
| `border-collapse`, `overflow-x-auto` pro mobil | ✅ |
| Zebra řádkování `bg-white` / `bg-wash` | ✅ |
| Hlavička `bg-navy text-white font-bold` | ✅ |
| EU sloupec `font-bold text-navy` | ✅ |

### Tip na měření

| Kontrola | Stav |
|----------|------|
| `bg-wash rounded-[10px] p-6 mb-10` box | ✅ |
| "Jak správně změřit nohu" H2 `text-navy font-extrabold` | ✅ |
| Číslovaný seznam 4 kroků (`list-decimal`) | ✅ |
| Tip pro večerní měření + běžecké boty o půl čísla větší | ✅ |

### ProductActions link

| Kontrola | Stav |
|----------|------|
| V `ProductActions.tsx` řádek 38: `<a href="/velikosti" target="_blank">Tabulka velikostí</a>` | ✅ |
| `target="_blank"` — otevírá v nové záložce | ✅ |
| `text-blue font-medium hover:underline` | ✅ |

### SEO

| Kontrola | Stav |
|----------|------|
| `title: "Tabulka velikostí \| Qsport.cz"` | ✅ |
| `description` — "Převodní tabulky velikostí bot a oblečení..." | ✅ |
| Stránka je static `○` v buildu | ✅ |

### Diakritika

| Text | Stav |
|------|------|
| "Tabulka velikostí." (H1) | ✅ |
| "Převodní tabulky pro boty a oblečení." | ✅ |
| "Jak správně změřit nohu" | ✅ |
| "Postav se na list papíru bosou nohou (celou vahou)." | ✅ |
| "Tužkou obkresli obrys nohy" | ✅ |
| "Změř vzdálenost od paty po špičku" | ✅ |
| "Pokud jsi mezi dvěma velikostmi, zvol větší." | ✅ |
| "Měř nohu večer, kdy je mírně větší." | ✅ |
| "Běžecké boty a kopačky" | ✅ |
| "Délka (cm)" | ✅ |
| "Hrudník (cm)" / "Pas (cm)" / "Boky (cm)" | ✅ |
| "Měřte obvod hlavy těsně nad obočím a ušima." | ✅ |
| "Upozornění:" / "Velikosti se mohou lišit podle výrobce a modelu." | ✅ |
| "rádi poradíme" | ✅ |

---

## Celkové hodnocení

| Oblast | Výsledek |
|--------|----------|
| Build | PASSED |
| /bazar — hero wash bg, filtry, grid, empty state, SEO | PASSED |
| Admin bulk akce — checkboxy, bulk bar, confirm dialog, server actions | PASSED |
| Social sharing — Facebook, WhatsApp, clipboard, umístění | PASSED |
| /znacky — hero navy, pastel karty, logo grid, hover efekty, SEO | PASSED |
| /velikosti — tabulky EU/UK/US/cm, tip na měření, ProductActions link | PASSED |
| Diakritika (všechny stránky) | PASSED |
| CSS dle brand briefu | PASSED |

**Celkem: 8/8 bodů PASSED. Implementace je bez výhrad.**

---

## Drobné poznámky (non-blocking)

1. **Bazar hero** — odlišuje se od ostatních stránek tím, že používá `bg-wash` místo `bg-navy`. Je to záměr (bazar = "jiný charakter"), odpovídá brand briefu. ✅
2. **Značky — Prisma query** provádí `await prisma.brand.findMany(...)` v server komponentě bez oddělené `loading.tsx` stránky. Pokud bude databáze pomalejší, může být krátký flicker. Non-blocking.
3. **/velikosti** — tabulka oblečení je pouze pánská orientační. Pokud by bylo potřeba přidat dámskou tabulku, stačí rozšířit data. Non-blocking.
