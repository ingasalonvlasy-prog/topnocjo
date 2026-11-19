# TASK-042: Kompletní audit celého e-shopu

## KRITICKÉ PROBLÉMY (musí se opravit)

### K1. ADMIN NEMÁ AUTENTIZACI
**Závažnost: KRITICKÁ**

Celý admin (`/admin/*`) je přístupný KOMUKOLIV bez přihlášení. Neexistuje:
- Žádný proxy.ts/middleware na ochranu admin routes
- Žádná role/isAdmin kontrola v `src/lib/auth.ts`
- User model nemá `role` field
- Admin layout (`src/app/(admin)/layout.tsx`) NEKONTROLUJE přihlášení — jen načte `newOrderCount`

**Důsledek:** Kdokoliv může navštívit `/admin` a mít plný přístup k objednávkám, zákazníkům, produktům, nastavení.

**Řešení:**
1. Přidat `role String @default("customer")` do User modelu
2. Vytvořit `proxy.ts` s ochranou `/admin/*` routes (redirect na přihlášení + kontrola role)
3. Nebo jednoduššeji: přidat kontrolu `getCurrentUser()` + email whitelist do admin layoutu

---

### K2. ZAPOMENUTÉ HESLO NEEXISTUJE
**Závažnost: VYSOKÁ**

Na přihlašovací stránce (`/prihlaseni`) chybí odkaz "Zapomněli jste heslo?" a celý reset password flow:
- Žádný `/zapomenute-heslo` route
- Žádný reset token v User modelu
- Žádná email šablona pro reset hesla

**Důsledek:** Zákazník, který zapomene heslo, nemůže obnovit přístup ke svému účtu.

**Řešení:**
1. Přidat `resetToken String?` a `resetTokenExpiresAt DateTime?` do User modelu
2. Nová stránka `/zapomenute-heslo` — formulář s emailem
3. Server action: vygenerovat token, odeslat email s linkem
4. Nová stránka `/obnova-hesla?token=xxx` — nastavit nové heslo
5. Email šablona "Obnova hesla"

---

### K3. OBJEDNÁVKA DETAIL JE VEŘEJNÝ BEZ AUTH
**Závažnost: VYSOKÁ**

Stránka `/objednavka/[orderNumber]` zobrazí detail objednávky KOMUKOLIV, kdo zná číslo objednávky. Nekontroluje:
- Přihlášení uživatele
- Vlastnictví objednávky (userId match)

**Důsledek:** Čísla objednávek jsou sekvenční/předvídatelná — kdokoliv může procházet cizí objednávky.

**Řešení:** Přidat buď:
- Auth check (userId match) — ale pak nefunguje pro nepřihlášené zákazníky
- Nebo přidat `viewToken` (UUID) do Order modelu a používat `/objednavka/[orderNumber]?token=xxx` — lepší pro emaily

---

## CHYBĚJÍCÍ FUNKCE (důležité)

### F1. FINANCE STRÁNKA — PLACEHOLDER
**Stav:** "Připravujeme" text
**Soubor:** `src/app/(admin)/admin/finance/page.tsx`
**Plán existuje:** Ano, v `task-040-remaining-plan.md` (bod 5)

### F2. RŮST STRÁNKA — PLACEHOLDER
**Stav:** "Připravujeme" text
**Soubor:** `src/app/(admin)/admin/rust/page.tsx`
**Plán existuje:** Ano, v `task-041-growth-plan.md`

### F3. OPUŠTĚNÉ POKLADNY — IMPLEMENTACE PROBÍHÁ
**Stav:** Implementátor na tom pracuje (Task #30)
**Plán existuje:** Ano, v `task-041-abandoned-checkouts-plan.md`

### F4. NEWSLETTER — POUZE SBĚR, ŽÁDNÉ ODESÍLÁNÍ
Newsletter subscribers se sbírají (`/api/newsletter` POST + `NewsletterSubscriber` model), ale:
- Neexistuje admin stránka pro správu odběratelů
- Neexistuje možnost odeslat newsletter/kampaň
- Neexistuje "Odhlásit z newsletteru" link

**Řešení:** Minimálně přidat:
1. Seznam odběratelů v admin (stránka nebo sekce v zákaznících)
2. Export CSV odběratelů (pro Mailchimp/externí nástroj)
3. Unsubscribe endpoint (`/api/newsletter/unsubscribe?token=xxx`)

### F5. KONTAKTNÍ FORMULÁŘ CHYBÍ
Stránka `/kontakt` má pouze kontaktní údaje (email, telefon) ale žádný formulář pro odeslání zprávy.

**Řešení:** Přidat jednoduchý formulář (jméno, email, zpráva) + server action pro odeslání emailu na `obchod@qsport.cz`.

### F6. SLEDOVÁNÍ ZÁSILKY — POUZE ADMIN
Tracking číslo a URL se ukládají v objednávce (`trackingNumber`, `trackingUrl`), ale:
- Na veřejné stránce `/objednavka/[orderNumber]` se tracking NEZOBRAZUJE zákazníkovi
- Email "Odesláno" pravděpodobně obsahuje tracking, ale web stránka ne

**Řešení:** Přidat tracking link do stránky `/objednavka/[orderNumber]` pokud `order.trackingUrl` existuje.

---

## NEDOSTATKY UX (důležité, ne kritické)

### U1. POKLADNA — CHYBÍ PŘEDVYPLNĚNÍ PRO PŘIHLÁŠENÉ
Přihlášený zákazník na pokladně musí vyplnit email, jméno, adresu znovu — i když to má uložené v účtu.

**Řešení:** Pokud je uživatel přihlášen, předvyplnit formulář z `User` dat (email, firstName, lastName, phone, street, city, zip).

### U2. ZÁKAZNÍCI ADMIN — CHYBÍ STAT KARTY
**Plán existuje:** Ano, v `task-040-remaining-plan.md` (bod B1)
Chybí stat karty nahoře: celkem zákazníků, novych tento měsíc, průměrná útrata, vracející se %.

### U3. ZNAČKY ADMIN — CHYBÍ LOGO THUMBNAIL
**Plán existuje:** Ano, v `task-040-remaining-plan.md` (bod B4)
Tabulka značek nemá logo preview.

### U4. ADMIN LOADING STATE
Existuje `src/app/(admin)/admin/loading.tsx` ale neověřeno zda funguje konzistentně.

### U5. HOMEPAGE "BESTSELLERS" JSOU NEJSTARŠÍ PRODUKTY
V `src/app/(public)/page.tsx` řádek 63: `orderBy: { createdAt: "asc" }` — "bestsellers" sekce zobrazuje nejstarší produkty místo skutečných bestsellerů.

**Řešení:** Buď:
- Přidat `salesCount` field na Product a řadit podle něj
- Nebo dotázat OrderItem + agregovat TOP prodávané produkty (stejně jako v analytice)

### U6. KOŠÍK NEMÁ UPSELL/CROSS-SELL
Shopify na košíku ukazuje "Mohlo by se ti líbit" produkty. Qsport nemá.

### U7. PRODUKT DETAIL — CHYBÍ VELIKOSTNÍ TABULKA LINK
Na produktu je varianta s velikostí, ale chybí odkaz na `/velikosti` stránku (ta existuje).

---

## TECHNICKÉ NEDOSTATKY

### T1. SESSION SECRET FALLBACK
V `src/lib/auth.ts:10`: `process.env.SESSION_SECRET || "dev-fallback-secret-change-me"`
Pokud env variable chybí, session cookie je podepsán slabým known secret.

**Řešení:** V produkci vyhodit fallback a vyžadovat `SESSION_SECRET`. Minimálně logovat warning.

### T2. COMGATE CALLBACK BEZ SIGNATURE VERIFICATION
V `src/app/api/comgate/callback/route.ts` se ověřuje přes `getPaymentStatus()` API (double-check) — to je OK. Ale samotný callback endpoint nemá IP whitelist ani HMAC ověření. Comgate push notification by měla být ověřena.

### T3. CHYBÍ `proxy.ts` MIDDLEWARE
Next.js 16 používá `proxy.ts` místo `middleware.ts`. Projekt nemá žádný middleware/proxy — žádná ochrana routes, žádný rate limiting, žádná auth redirect logika.

**Řešení:** Vytvořit `src/proxy.ts` s:
1. Ochrana `/admin/*` routes (redirect na login)
2. Ochrana `/ucet/*` routes (redirect na login)
3. Volitelně: rate limiting pro API routes

### T4. ADMIN API ROUTES BEZ AUTH
API endpointy `/api/admin/orders/export`, `/api/admin/customers/export`, `/api/admin/zasilkovna/test` — žádný nemá auth kontrolu.

### T5. CRON ENDPOINT — SECRET V URL
`/api/cron/abandoned-checkouts?secret=CRON_SECRET` — secret je v URL, může se logovat v access logech. Lepší je ověřovat přes header (`Authorization: Bearer xxx`).

### T6. ORDER NUMBER PATTERN
Čísla objednávek (`generateOrderNumber()`) — neověřeno zda jsou dostatečně náhodná nebo sekvenční. Pokud sekvenční → bezpečnostní problém viz K3.

---

## CHYBĚJÍCÍ SEO/MARKETING

### S1. AKCE STRÁNKA — CHYBÍ V SITEMAP
`/akce` a `/bazar` nejsou v `src/app/sitemap.ts` — chybí v sitemap.xml.

### S2. COOKIES STRÁNKA — NEMĚŘÍ SE ANALYTICS
Stránka `/cookies` existuje, ale cookie consent (`CookieConsent` component) pravděpodobně neblokuje analytické cookies (Google Analytics apod.). Neověřeno zda je propojení s GA.

### S3. INSTAGRAM FEED — NEOVĚŘEN
Homepage načítá Instagram posty (`getInstagramPosts(6)`), ale neověřeno zda API token funguje/je platný.

### S4. OPEN GRAPH IMAGES
Většina statických stránek (kontakt, doprava, reklamace, vraceni-zbozi, o-nas, cookies) nemá OG image.

---

## STAV ADMIN STRÁNEK

| Stránka | Stav | Poznámka |
|---------|------|----------|
| Dashboard (`/admin`) | SHOPIFY LEVEL | 4 stat karty, sparklines, drill-down, promo cards, recent orders, low stock |
| Objednávky seznam | SHOPIFY LEVEL | Stat karty, filtry, rich tabulka, paginace |
| Objednávky detail | SHOPIFY LEVEL | Fulfillment, DPH, timeline, sidebar cards |
| Expedice | SHOPIFY LEVEL | Tabs, fulfillment badges |
| Produkty seznam | SOLIDNÍ | Client component, filtry, search, paginace |
| Produkt detail/edit | SOLIDNÍ | Varianty, fotky, SEO |
| Produkt nový | SOLIDNÍ | Formulář |
| Slevy | SOLIDNÍ | Seznam + nový/edit |
| Recenze | SOLIDNÍ | Filtry, approve/delete |
| Blog | SOLIDNÍ | Seznam + nový/edit s WYSIWYG |
| Dodavatelé | SOLIDNÍ | Feed import, konfigurace |
| Nastavení | SOLIDNÍ | 4 tabs (store, email, social, SEO) |
| Log | SOLIDNÍ | Filtry, paginace, barevné badges |
| Analytika | SOLIDNÍ | Period selector, stat karty, top products/brands/categories |
| Zákazníci | ZÁKLADNÍ | Chybí stat karty nahoře, segment filtry |
| Kategorie | ZÁKLADNÍ | Funguje, chybí strom. vizualizace |
| Značky | ZÁKLADNÍ | Chybí logo thumbnail |
| Doprava | ZÁKLADNÍ | Tabulka — plán přepsat na karty existuje |
| **Finance** | **PLACEHOLDER** | "Připravujeme" |
| **Růst** | **PLACEHOLDER** | "Připravujeme" — plán hotový |
| **Opuštěné pokladny** | **IMPLEMENTACE** | Probíhá (Task #30) |

## STAV VEŘEJNÝCH STRÁNEK

| Stránka | Stav | Poznámka |
|---------|------|----------|
| Homepage | SOLIDNÍ | Hero, kategorie, produkty, blog, newsletter, Instagram |
| Kategorie listing | SOLIDNÍ | Filtry, sort, paginace, mobile drawer |
| Produkt detail | SOLIDNÍ | Gallery, varianty, recenze, related, share, JSON-LD |
| Značky listing | SOLIDNÍ | Grid značek |
| Značka detail | SOLIDNÍ | Filtry, produkty |
| Blog listing | SOLIDNÍ | Sekce, tagy |
| Blog detail | SOLIDNÍ | Obsah, sdílení |
| Košík | SOLIDNÍ | Free shipping bar, qty +/-, sleva |
| Pokladna | SOLIDNÍ | 6 sekcí, Zásilkovna widget, slevový kód, validace |
| Objednávka potvrzení | SOLIDNÍ | Detail, platební instrukce |
| Hledání | SOLIDNÍ | Autocomplete, filtry, sort |
| Akce | SOLIDNÍ | Zlevněné produkty, filtry |
| Bazar | SOLIDNÍ | Secondhand produkty, filtry |
| Přihlášení | SOLIDNÍ | Formulář, redirect |
| Registrace | SOLIDNÍ | Formulář, newsletter opt-in |
| Účet | SOLIDNÍ | Přehled, objednávky, oblíbené, údaje |
| Kontakt | OK | Chybí formulář |
| Doprava a platba | OK | Informační stránka |
| Obchodní podmínky | OK | Právní text |
| Reklamace | OK | Právní text |
| Vrácení zboží | OK | Právní text |
| Cookies | OK | Cookie policy |
| Velikosti | OK | Tabulky velikostí |
| O nás | OK | Informace o obchodu |
| 404 | OK | Custom design |
| Error | OK | Custom error page |

---

## PRIORITIZOVANÝ AKČNÍ PLÁN

### OKAMŽITĚ (bezpečnost):
1. **Admin auth ochrana** — proxy.ts nebo layout-level auth (K1) — KRITICKÉ
2. **Admin API auth** — přidat auth kontrolu do export/test endpointů (T4)
3. **Objednávka veřejný detail** — přidat viewToken nebo auth (K3)

### TENTO SPRINT (funkčnost):
4. **Zapomenuté heslo** — reset password flow (K2)
5. **Finance stránka** — naplnit reálným obsahem (F1)
6. **Růst stránka** — implementovat dle plánu (F2)
7. **Pokladna předvyplnění** — pro přihlášené uživatele (U1)
8. **Tracking na veřejné objednávce** — zobrazit tracking link (F6)

### DALŠÍ SPRINT (vylepšení):
9. **Zákazníci stat karty** — admin upgrade (U2)
10. **Značky logo thumbnail** — admin upgrade (U3)
11. **Bestsellers oprava** — reálné bestsellery místo nejstarších (U5)
12. **Kontaktní formulář** — přidat formulář na /kontakt (F5)
13. **Newsletter správa** — admin stránka + unsubscribe (F4)
14. **Sitemap aktualizace** — přidat /akce a /bazar (S1)

### ROADMAP (nice-to-have):
15. **Session secret warning** — logovat/blokovat v produkci (T1)
16. **Proxy.ts rate limiting** — ochrana API (T3)
17. **OG images** — pro statické stránky (S4)
18. **Košík cross-sell** — doporučené produkty (U6)
19. **Velikostní tabulka link** — na produktu (U7)

---

---

## SHOPIFY SCREENSHOT GAP ANALÝZA (nové screenshoty)

### SG1. PRODUKTY — stat karty a tabulka (STŘEDNÍ priorita)

**Shopify má:**
- 3 stat karty nahoře: Průměrná obrátka zásob (%), Produkty podle dnů do vyčerpání zásob, ABC analýza produktů
- Tlačítka: Zobrazit jako, Importovat, Exportovat, Další akce, Přidat produkt
- Tabulka: checkbox, thumbnail, Produkt, Stav, Skladové zásoby ("0 skladem u X variant"), Kategorie, Kanály, Katalogy, Typ produktu, Dodavatel
- Sidebar sub-items: Kolekce, Skladové zásoby, Nákupní objednávky, Převody, Dárkové karty

**My máme:**
- Žádné stat karty
- Tlačítka: pouze "Nový produkt"
- Tabulka: checkbox, thumbnail, Produkt (+ variant count), Značka, Typ, Cena, Sklad (číslo), Stav badge
- Filtry: search, stav dropdown, značka dropdown
- Bulk akce: Aktivovat, Deaktivovat, Archivovat, Smazat
- Sidebar: Produkty (bez sub-items kromě kategorie/značky jinde)

**GAP — co chybí:**
1. **Stat karty** — přidat 3 karty: celkem aktivních / celkem variant / nízký sklad count
2. **Tlačítka** — přidat Export CSV, Import (nice-to-have)
3. **Tabulka sloupce** — přidat: Kategorie (máme data), lepší sklad info ("0 skladem u X variant" místo čísla)
4. **Sidebar sub-items** — Kolekce (= naše Kategorie — máme), Skladové zásoby (dedicated stránka — nemáme), Nákupní objednávky/Převody (nemáme, nice-to-have), Dárkové karty (nemáme, nice-to-have)

**Odhad:** ~80 řádků změn v `produkty/page.tsx` pro stat karty + sloupce. Export CSV je ~40 řádků nový endpoint.

---

### SG2. ZÁKAZNÍCI — segmenty a sloupce (NÍZKÁ priorita — většina už implementována!)

**Shopify má:**
- Tlačítka: Exportovat, Importovat, Přidat zákazníka
- "Popište segment" dropdown
- Tabulka: checkbox, Jméno zákazníka, Odběr e-mailů (badge "Přihlášeno k odběru" / "Nepřihlášeno"), Lokalita (město), Objednávky, Utracená částka
- Sidebar sub-items: Segmenty, Společnosti

**My máme:**
- Stat karty: 4 karty (celkem, noví 30d, opakující se, prům. hodnota) se sparklines — LEPŠÍ než Shopify screenshot!
- Tlačítka: Export CSV
- Tabulka: Jméno+email, Telefon, Registrace, Objednávky, Útrata
- Search, paginace s čísly

**GAP — co chybí:**
1. **Newsletter badge** — přidat sloupec "Odběr" s badge (User.newsletter field existuje!)
2. **Lokalita** — přidat sloupec Město (User.city field existuje!)
3. **Checkbox** — pro bulk akce (nemáme)
4. **Segment dropdown** — filtrace dle segmentu (nový/vracející se/VIP) — nice-to-have
5. **Přidat zákazníka** — CTA tlačítko (nemáme manuální přidání)
6. **Import** — nice-to-have

**Odhad:** Newsletter badge + město = ~15 řádků změn v tabulce. Segment filter = ~40 řádků.

---

### SG3. SLEVY — Export a empty state (NÍZKÁ priorita)

**Shopify má:**
- Tlačítka: Exportovat, Vytvořit slevu
- Pěkný empty state s ilustrací a CTA

**My máme:**
- Tlačítko: + Nový kód
- Tabulka: kód, typ, sleva, použití, platnost, stav badge
- Empty state: jen text "Zatím žádné slevové kódy."

**GAP — co chybí:**
1. **Export** — tlačítko pro export CSV (nice-to-have)
2. **Lepší empty state** — přidat ilustraci a CTA "Zjistit více o slevách" (kosmetické)

**Odhad:** ~20 řádků pro lepší empty state.

---

### SG4. TRHY (Markets) — STRÁNKA NEEXISTUJE (ROADMAP)

**Shopify má:**
- Kompletní "Trhy" stránka: správa trhů (Česko, EU, Německo), B2B segmenty, lokalizace
- Sidebar sub-items: Katalogy, Zavádění aktualizací

**My nemáme:**
- Žádnou stránku Trhy
- Žádný multi-market/lokalizace systém
- Žádnou B2B cenovou strukturu

**Hodnocení:** Toto je enterprise feature relevantní pro multi-country e-shopy. Qsport.cz zatím operuje pouze v Česku. **ODLOŽIT** na roadmap — implementovat až při expanzi na další trhy.

**Pokud se bude implementovat:**
- Nový model `Market` (name, currency, countries, active)
- Nový model `PriceList` (marketId, variantId, price) — override cen per market
- Admin stránka `/admin/trhy` se seznamem trhů
- Middleware/proxy pro detekci country a přepnutí cen

---

### SG5. RŮST/MARKETING — Attribution a Analytics (STŘEDNÍ priorita — částečně plánováno)

**Shopify má:**
- Campaign Autopilot promo
- "Výkonnost marketingu" s period selectorem
- Graf: "Prodeje připisované marketingu" — 54,772 Kč z celkových 83,243 Kč
- 3 karty: Relace podle typu návštěvnosti (paid/direct/organic/unknown), Google Search (relace, tržby, konverzní poměr), ChatGPT (relace, tržby, konverzní poměr)
- Sidebar sub-items: Atribuce, Autopilot, Kampaně

**My máme (plán v task-041-growth-plan.md):**
- Konverzní přehled (stat karty z DB dat)
- SEO zdraví (automatický audit)
- Doporučení pro růst (dynamické karty)
- Zákaznická retence (segmentace)
- Rychlé akce

**GAP — co NEMŮŽEME implementovat bez externích API:**
1. **Marketing attribution** — vyžaduje UTM tracking + session persistence. Nemáme session/pageview tracking.
2. **Traffic sources** (paid/direct/organic) — vyžaduje analytics integration (GA4 API nebo vlastní tracking)
3. **Google Search metriky** — vyžaduje Google Search Console API integration
4. **Campaign Autopilot** — vyžaduje email marketing platform (Mailchimp/Klaviyo API)
5. **ChatGPT attribution** — vyžaduje referrer tracking

**Co MŮŽEME přidat k existujícímu plánu:**
1. **UTM parametry tracking** — přidat `utmSource, utmMedium, utmCampaign` fields na Order model. Zachytit z URL při vytvoření objednávky. Pak zobrazit v admin.
2. **Referrer tracking** — přidat `referrer` field na Order. Jednoduchý JS na pokladně.
3. **Prodeje dle zdroje** — graf na Růst stránce z UTM dat (po implementaci bodu 1-2)

**Odhad UTM trackingu:** ~50 řádků (3 fields v schema, zachycení v pokladně, zobrazení v admin)

---

## AKTUALIZOVANÉ PRIORITY (po Shopify screenshotech)

### OKAMŽITĚ (bezpečnost) — beze změn:
1. Admin auth ochrana (K1)
2. Admin API auth (T4)
3. Objednávka veřejný detail ochrana (K3)

### TENTO SPRINT (funkčnost):
4. Zapomenuté heslo (K2)
5. **Produkty stat karty + sloupce upgrade** (SG1) — NOVÉ
6. Finance stránka (F1)
7. Růst stránka (F2)
8. Pokladna předvyplnění pro přihlášené (U1)
9. Tracking na veřejné objednávce (F6)

### DALŠÍ SPRINT (vylepšení):
10. **Zákazníci: newsletter badge + město sloupec** (SG2) — NOVÉ
11. **UTM tracking na objednávkách** (SG5) — NOVÉ
12. Značky logo thumbnail (U3)
13. Bestsellers oprava (U5)
14. Kontaktní formulář (F5)
15. Newsletter správa + unsubscribe (F4)
16. Sitemap aktualizace (S1)
17. **Slevy: lepší empty state + export** (SG3) — NOVÉ

### ROADMAP (nice-to-have):
18. **Trhy/Markets stránka** — až při expanzi za Česko (SG4)
19. **Marketing attribution** — vyžaduje GA4 API nebo vlastní tracking (SG5)
20. **Produkty: Import funkce** — nice-to-have (SG1)
21. **Produkty: Skladové zásoby dedicated stránka** — nice-to-have (SG1)
22. **Zákazníci: Segment dropdown** — nice-to-have (SG2)
23. Session/pageview tracking (T3)
24. OG images (S4)
25. Košík cross-sell (U6)

---

## CELKOVÉ HODNOCENÍ

**Public web: 8/10** — profesionální, kompletní nákupní flow, SEO, structured data. Chybí reset hesla a pár UX detailů.

**Admin panel: 7/10** — Dashboard a objednávky na Shopify úrovni. 2 placeholder stránky (finance, růst). Zákazníci a značky potřebují drobné upgrady.

**Bezpečnost: 4/10** — KRITICKÝ problém: admin bez auth, objednávky bez auth, API endpointy bez auth. Toto musí být opraveno OKAMŽITĚ před production deploy.

**Infrastruktura: 7/10** — Comgate platby, Zásilkovna, emaily (Resend), feed import — vše funguje. Chybí proxy.ts middleware, reset hesla, newsletter management.
