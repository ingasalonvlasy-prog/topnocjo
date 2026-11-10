# TASK-040: Gap analyza — co zbyva ze Shopify screenshotu + UX audit

## Stav implementace TASK-039

### HOTOVO (uz implementovano):
- **Objednavky seznam** — stat karty se sparkline, bohata tabulka s checkboxy a bulk akcemi, fulfillment badges, paginace 50
- **Objednavky detail** — fulfillment sekce, product thumbnaily, DPH, metapole, konverze, riziko (planovano/implementovano)
- **Expedice** — nova stranka `/admin/objednavky/expedice` s tabs, fulfillment tabulkou
- **Dashboard** — 4 hero stat karty se sparkline, obdobi selector, drill-down view s line chart a period comparison (planovano)
- **Sidebar** — prestrukturovano na Shopify styl: Domu, Objednavky+Expedice, Produkty, Zakaznici, Obsah, Finance, Analytika, Marketing, Katalog, Provozni
- **Placeholder stranky** — Finance, Opustene pokladny, Rust

### CHYBI ze Shopify screenshotu:

#### 1. Dashboard: "Aktualni navstevnici" real-time widget
**Priorita: NIZKA (nice-to-have)**

Shopify ukazuje "Aktualni navstevnici 0" widget vpravo nahore s mestem a casem posledni navstevy.

**Problem:** Toto vyzaduje real-time analytics backend (WebSocket/SSE/polling). Shopify ma vlastni analytics engine. My nemame:
- Zadny session tracking v DB
- Zadny real-time analytics endpoint
- Nesledujeme page views v nasem systemu (pouzivame externí analytics)

**Doporuceni:** ODLOZIT. Bylo by potreba:
1. Pridat session/pageview tracking tabulku do Prisma schema
2. Vytvorit API endpoint pro real-time data
3. Client component s pollingem/SSE
4. Privacy compliance (cookies, GDPR)

To je velky feature jen pro maly widget. Alternativa: propojit s Google Analytics API — ale to je external dependency.

**Pokud se presto implementuje (light verze):**
- Pridat `PageView` model (ip hash, path, timestamp, city via GeoIP)
- Middleware pro tracking
- Polling endpoint `/api/admin/live-visitors`
- Widget na dashboardu s 30s auto-refresh

#### 2. Dashboard: Promo/info karty pod grafem
**Priorita: STREDNI**

Shopify ukazuje pod grafem karty typu:
- "Odeslat email o opustenem kosiku" (CTA)
- "Novinky v Shopify" (info)
- "Holiday sezona banner" (sezonni)
- "Pridejte platebni metody" (onboarding)

**Doporuceni:** Implementovat jako jednoduche staticke karty s CTA linkama. Zadny backend — jen hardcoded karty ktere jsou relevantni pro aktualni stav e-shopu.

**Implementace:**

Novy soubor: `src/components/admin/DashboardPromoCards.tsx`

```tsx
// Server Component — cte stav z DB a ukazuje relevantni karty
export async function DashboardPromoCards() {
  // Urcit ktere karty zobrazit na zaklade stavu
  const cards: PromoCard[] = [];

  // 1. Pokud existuji opustene kosiky (TODO: az bude tracking)
  // cards.push({ title: "Odeslat email o opustenem kosiku", ... });

  // 2. Pokud nemame nastaveny email
  if (!process.env.RESEND_API_KEY) {
    cards.push({
      title: "Nastavte emailove notifikace",
      description: "Zakaznici nedostavaji emaily o objednavkach.",
      cta: "Nastavit",
      href: "/admin/nastaveni",
      color: "amber",
    });
  }

  // 3. Pokud mame malo produktu
  const productCount = await prisma.product.count({ where: { status: "ACTIVE" } });
  if (productCount < 10) {
    cards.push({
      title: "Pridejte vice produktu",
      description: `Mate pouze ${productCount} aktivnich produktu. Vicce produktu = vice prodaju.`,
      cta: "Pridat produkt",
      href: "/admin/produkty/novy",
      color: "blue",
    });
  }

  // 4. Sezonni — pokud je Q4 (rijen-prosinec)
  const month = new Date().getMonth();
  if (month >= 9 && month <= 11) {
    cards.push({
      title: "Vanocni sezona",
      description: "Nastavte vanocni slevy a pripravte se na sezonu.",
      cta: "Vytvorit slevu",
      href: "/admin/slevy/novy",
      color: "green",
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {cards.map(card => (
        <PromoCardUI key={card.title} {...card} />
      ))}
    </div>
  );
}
```

**Odhad:** ~80 radku, 1 novy soubor. Trivialni implementace.

#### 3. Doprava — karty misto tabulky
**Priorita: STREDNI**

Z TASK-039 FAZE 4 — doprava stranka ma byt prepracovana z tabulky na karty s tabs. **Stav: NAPLANOVANO ale mozna neimplementovano.** Overit aktualni stav.

---

## UX AUDIT vsech admin stranek

### A. Stranky na DOBRE urovni (nepotrebuji zmeny):

| Stranka | Poznamka |
|---------|----------|
| `/admin/objednavky` | Po TASK-039 upgrade — Shopify level |
| `/admin/objednavky/[id]` | Po TASK-039 upgrade — Shopify level |
| `/admin/objednavky/expedice` | Novy, Shopify/ShipD level |
| `/admin/objednavky/[id]/faktura` | Profesionalni, print-ready |
| `/admin/objednavky/[id]/balici-list` | Profesionalni, print-ready |
| `/admin/produkty` | ProductTable client component, filtry, search, paginace — solidni |
| `/admin/produkty/[id]` | Detailni edit, varianty — solidni |
| `/admin/produkty/novy` | Formular — solidni |
| `/admin/slevy` | Tabulka + novy/edit — solidni |
| `/admin/recenze` | Filtry (ceka/schvalene/vsechny), approve/delete akce — solidni |
| `/admin/blog` | Seznam + novy/edit s WYSIWYG — solidni |
| `/admin/dodavatele` | Feed import, trigger, konfigurace — solidni |
| `/admin/nastaveni` | Tabs (store, email, social, SEO) — solidni |
| `/admin/log` | Filtry, paginace, barevne badges — solidni |
| `/admin/analytika` | Period selector, stat karty, top products/brands/categories — solidni |

### B. Stranky na ZAKLADNI urovni (potrebuji upgrade):

#### B1. Zakaznici seznam (`/admin/zakaznici`) — STREDNI priorita
**Aktualni stav:** Zakladni tabulka (jmeno, email, datum registrace, objednavky count, utraceno). Search + paginace. Export CSV.

**Chybi oproti Shopify:**
- Stat karty nahore: celkem zakazniku, novych tento mesic, prumerna utrata, vracejici se %
- Filtry: segmentace (nove/vracejici se/VIP), datum registrace range
- Zakaznik detail: timeline objednavek, celkova utrata graf, segmentace badge

**Doporuceni:** Pridat 4 stat karty nahore + segment filtry. Detail zakaznika uz existuje a je solidni.

**Odhad:** ~100 radku zmen v `zakaznici/page.tsx`

#### B2. Zakaznici detail (`/admin/zakaznici/[id]`) — NIZKA priorita
**Aktualni stav:** Solidni — profil, objednavky seznam, admin poznamka, statistiky (celkem utraceno, pocet objednavek).

**Chybi:** Vizualni timeline (misto tabulky objednavek), segment badge (VIP/Novy/Vracejici se).

**Doporuceni:** Male vylepseni — pridat segment badge a vizualizovat objednavky jako timeline. Neni kriticke.

#### B3. Kategorie seznam (`/admin/kategorie`) — NIZKA priorita
**Aktualni stav:** Tabulka s drag-and-drop poradi, edit/delete. Funguje.

**Chybi:** Stromova vizualizace (parent-child), drag between levels.

**Doporuceni:** Aktualni stav je funkcni. Stromova vizualizace by byla nice-to-have ale neni Shopify feature.

#### B4. Znacky seznam (`/admin/znacky`) — NIZKA priorita
**Aktualni stav:** Jednoducha tabulka s poctem produktu a edit linkem.

**Chybi:** Logo preview, filter.

**Doporuceni:** Trivialni — pridat logo thumbnail do tabulky. ~10 radku zmena.

### C. PLACEHOLDER stranky (potrebuji realne naplneni):

| Stranka | Popis | Priorita | Slozitost |
|---------|-------|----------|-----------|
| `/admin/finance` | Financni dashboard: trzby, naklady, marze, platebni transakce, export ucetnictvi | VYSOKA | VELKA — vyzaduje cost tracking, marze z variant.costPrice, platebni transakce z Comgate |
| `/admin/opustene-pokladny` | Seznam opustenych kosiku, upominkove emaily | STREDNI | VELKA — vyzaduje cart tracking model v DB, novy Prisma model, cron/background job |
| `/admin/rust` | Kampane, automatizace, SEO doporuceni | NIZKA | VELKA — rozsahly feature set, spis roadmap nez immediate |

---

## DOPORUCENY AKCNI PLAN

### Okamzite (low-hanging fruit):

1. **Dashboard promo karty** — 80 radku, 1 soubor, zero DB zmeny
   - Soubor: `src/components/admin/DashboardPromoCards.tsx`
   - Pridat do `src/app/(admin)/admin/page.tsx`

2. **Doprava karty** — overit jestli FAZE 4 z TASK-039 uz byla implementovana. Pokud ne, implementovat.

3. **Zakaznici stat karty** — ~100 radku zmen v existujicim souboru

4. **Znacky logo thumbnail** — ~10 radku

### Kratkodoba (tento sprint):

5. **Finance stranka** — naplnit realnym obsahem:
   - Trzby po mesicich (z Order.total kde PAID)
   - Marze (z Variant.costPrice vs Order items)  
   - Platebni transakce prehled (card vs transfer vs cod)
   - Export CSV pro ucetnictvi
   - **Odhad:** ~300 radku, novy obsah pro existujici placeholder

### Strednedoba (dalsi sprint):

6. **Opustene pokladny** — vyzaduje:
   - Novy Prisma model `AbandonedCart` (email, items JSON, createdAt, recoveredAt, emailSentAt)
   - Tracking v pokladne (ulozit cart pred platbou)
   - Cron job pro detekci (cart starsi nez 1h bez objednavky)
   - Email sablona
   - Admin stranka se seznamem + "Odeslat upominku" akce
   - **Odhad:** ~500 radku + Prisma migrace

### Dlouhodoba (roadmap):

7. **Rust stranka** — postupne plnit:
   - SEO doporuceni (auto-audit meta tagu, missing descriptions)
   - Konverzni trychtyr vizualizace
   - Email kampane integrace

8. **Real-time navstevnici widget** — az bude analytics backend

---

## Souhrn

| Oblast | Stav | Priorita akce |
|--------|------|---------------|
| Dashboard hero stats + drill-down | NAPLANOVANO | Implementovat plan |
| Dashboard promo karty | CHYBI | LOW effort, pridat |
| Dashboard real-time widget | CHYBI | ODLOZIT |
| Objednavky seznam | HOTOVO | - |
| Objednavky detail | HOTOVO/PLANOVANO | Implementovat plan |
| Expedice | HOTOVO | - |
| Doprava karty | NAPLANOVANO | Overit + implementovat |
| Sidebar | HOTOVO | - |
| Zakaznici stat karty | CHYBI | LOW effort, pridat |
| Finance obsah | PLACEHOLDER | STREDNI effort |
| Opustene pokladny obsah | PLACEHOLDER | VELKY effort |
| Rust obsah | PLACEHOLDER | ODLOZIT |
| Produkty/Blog/Slevy/Recenze/Nastaveni/Log | SOLIDNI | - |
