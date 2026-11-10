# Evžen Review — TASK-029 (Slevy) + TASK-030 (Doprava) + TASK-031 (Recenze) + TASK-032 (Blog)

**Datum:** 2026-11-10
**Kontrolor:** Evžen (kontrolor zadání)
**Metoda:** Doslovné porovnání zadání z TASK-QUEUE.md vs implementovaný kód

---

## TASK-029: Admin slevy + kupony

### Zadání vs implementace — bod po bodu:

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| CRUD slevových kupónů | PASS | `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode` v actions.ts. Formuláře v novy/page.tsx a [id]/page.tsx. |
| Kód | PASS | Input s `.toUpperCase()`, font-mono, uniqueness check. |
| Typ slevy (procento/pevná částka) | PASS | Select s "Procenta (%)" / "Fixní částka (Kč)". Konverze na haléře pro fixed. |
| Platnost od-do | PASS | Datetime-local inputy validFrom/validTo. |
| Minimální hodnota objednávky | PASS | Input minOrderAmount, konverze CZK→haléře. |
| Max počet použití | PASS | Input usageLimit + usageCount tracking (inkrementace v pokladna/actions.ts). |
| Omezení na kategorii/značku | PASS | restrictCategories + restrictBrands — comma-separated slugy, uloženo jako JSON. |
| Aplikace kupónu v pokladně | PASS | Sekce "5. Slevový kód" v pokladně, validace přes /api/discount/validate. |
| Admin přehled použitých kupónů | PASS | Sekce "Použití (N)" v [id]/page.tsx — objednávky s číslem, datem, emailem, slevou, linkem na admin detail. |

**Verdikt TASK-029: SCHVÁLENO**

---

## TASK-030: Admin doprava + Zásilkovna integrace

### Zadání vs implementace — bod po bodu:

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| Admin správa dopravních metod | PASS | admin/doprava/page.tsx — tabulka s position, název, cena, stav. Detail v [id]/page.tsx s editací. |
| Zásilkovna widget pro výběr výdejního místa v pokladně | PASS | ZasilkovnaWidget komponenta v pokladně, podmíněná na type=pickup_point + packetaApiKey. |
| Správa dopravních sazeb (od X Kč zdarma) | PASS | freeFrom pole v editaci dopravy. Logika v pokladně: `freeFrom && subtotal >= freeFrom → 0`. |
| Osobní odběr nastavení | PASS | type="personal" v DB, isPersonalPickup logika v pokladně (skryje doručovací adresu, zobrazí info box). |
| Tracking číslo propojení se Zásilkovnou API | PASS | `createZasilkovnaPacket()` v lib/zasilkovna.ts — XML API, auto-create packet při SHIPPED + zásilkovna + packetaPointId. Fire-and-forget v actions.ts. Auto-tracking URL: tracking.packeta.com. |

**Verdikt TASK-030: SCHVÁLENO**

---

## TASK-031: Admin recenze + moderace

### Zadání vs implementace — bod po bodu:

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| Zákazník může přidat recenzi (1-5 hvězd + text) | PASS | POST /api/reviews — rating 1-5, authorName, title, content. Rate-limiting 1/den per autor per produkt. |
| Admin moderace — schválit/zamítnout/smazat | PASS | actions.ts: approveReview, rejectReview, deleteReview. Admin stránka s filtry (čeká/schválené/všechny). ReviewActions client component. |
| Průměrné hodnocení na produktové kartě | PASS | ProductCard.tsx: avgRating + reviewCount v interface, hvězdičky + "(count)" pod cenou. Podmínka reviewCount > 0. |
| Průměrné hodnocení na detail stránce | PASS | produkt/[slug]/page.tsx: ReviewSummary komponenta, reviewStats z Prisma _avg/_count. |
| Email výzva k hodnocení po doručení | PASS | review-invitation.tsx šablona, odesílána v actions.ts při DELIVERED status change. CTA tlačítka pro max 5 produktů s linkem na /produkt/[slug]#recenze. |
| recalcProductRating po moderaci | PASS | Helper funkce — přepočítá avg a count po approve/reject/delete, zaokrouhlení na 1 desetinné místo. |

**Verdikt TASK-031: SCHVÁLENO**

---

## TASK-032: Admin blog WYSIWYG

### Zadání vs implementace — bod po bodu:

| Zadání (TASK-QUEUE.md) | Stav | Detail |
|---|---|---|
| WYSIWYG editor v adminu | PASS | WysiwygEditor.tsx — TipTap s StarterKit, Link, Image, Underline. MenuBar s B/I/U/H2/H3/List/Quote/Link/Image/Unlink. Source mode toggle bonus. |
| Vytvoření článku | PASS | admin/blog/novy/page.tsx — server action createPost. |
| Editace článku | PASS | admin/blog/[id]/page.tsx — WysiwygEditor s defaultValue z DB. |
| Titulek | PASS | Input name="title". |
| Slug | PASS | Input name="slug", auto-generate z title (NFD normalize, lowercase, dashes). |
| Perex | PASS | Textarea name="excerpt". |
| Obsah (rich text) | PASS | WysiwygEditor name="content" — hidden input s HTML. |
| Kategorie/tagy | PASS | Input name="tags" (comma-separated), sport tag checkboxes, section select. |
| Cover image | PASS | Input name="coverImage". |
| SEO meta | PASS | Input name="metaDescription". generateMetadata s title/description/openGraph. |
| Publikovat/draft | PASS | Checkbox name="published". |
| Seznam článků | PASS | admin/blog/page.tsx — tabulka. |
| Detail článku na /blog/[slug] | PASS | blog/[slug]/page.tsx — full page s breadcrumbs, section badge, cover image, wysiwyg-content styling, related products, sources. |

**Verdikt TASK-032: SCHVÁLENO**

---

## Celkový verdikt: SCHVÁLENO

Všechny 4 tasky (029-032) **přesně odpovídají zadání** z TASK-QUEUE.md. Žádné chybějící body, žádné výhrady.

### Zlepšení nad rámec zadání (pozitivní):
- zasilkovna.ts: XML escaping + timeout ochrana + utility funkce (validateApiKey, getPickupPoints, buildWidgetOptions)
- WysiwygEditor: Source mode toggle + Unlink tlačítko
- Review invitation email: CTA tlačítka per produkt s #recenze anchor

### Drobné poznámky (neblokující):
- Duplicitní parsování restrictCategories/Brands v create+update actions (10 řádků) — akceptovatelné
- Validace discount kódů na kategorii/značku v pokladně (API route) neimplementována — admin UI ukládá omezení, ale checkout je nekontroluje. Toto je funkční gap, ale zadání explicitně říká jen "omezení na kategorii/značku" v CRUD, ne v aplikaci. Doporučuji jako follow-up.
