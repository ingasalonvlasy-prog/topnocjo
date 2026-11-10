# TASK-039: Admin upgrade na Shopify level

## Analza stavu

### Co existuje:
- **Objednavky seznam** (`src/app/(admin)/admin/objednavky/page.tsx`): zakladni tabulka (cislo, zakaznik, datum, doprava, stav, platba, celkem), filtry (stav, platba, datum od/do, search), stat linky (4 quick stat badges), export CSV, paginace po 20
- **Objednavky detail** (`src/app/(admin)/admin/objednavky/[id]/page.tsx`): 2-sloupcovy layout, polozky tabulka, supplier banner, admin poznamka, customer note, timeline, sidebar (stav, platba, doprava, tracking, zakaznik, adresy), faktura + balici list
- **Doprava** (`src/app/(admin)/admin/doprava/page.tsx`): jednoducha tabulka s edit strankama
- **Sidebar** (`src/components/admin/AdminSidebar.tsx`): Dashboard, Prodej (objednavky, doprava), Katalog (produkty, kategorie, znacky, dodavatele), Zakaznici, Marketing (blog, slevy, recenze, analytika), Log, Nastaveni
- **StatCard** (`src/components/admin/StatCard.tsx`): jednoduchy label+value+change, BEZ sparkline grafu

### Co chybi oproti Shopify:
1. **Objednavky seznam**: sparkline mini-grafy v stat kartach, checkbox bulk select, vice sloupcu (polozky count, termin plneni, kanal, stav doruceni, metoda doruceni), tlacitko "Vytvorit objednavku", "Dalsi akce"
2. **Fulfillment/ShipD pohled**: uplne chybi - tabs (vse/nesplnene/splnene), akce (stitky, packing slipy, predavaci protokol), tracking stavy, dopravce detail (Z-BOX nazev a adresa)
3. **Objednavky detail**: chybi fulfillment sekce s deadline, dopravce detail, dodavatel, rozsah doruceni, riziko objednavky, konverzni shrnutí, metapole (marze, nakupni cena, sklady), badge "Zaplaceno"/"Probiha" v headeru
4. **Doprava**: tabulkova forma je neprehledna, potrebuje karty/tabs
5. **Sidebar**: chybi Opustene pokladny, Finance, Rust

---

## Plan implementace

### FAZE 1: Objednavky seznam — Shopify level
**Soubory k editaci:**
- `src/app/(admin)/admin/objednavky/page.tsx` (hlavni prepis)
- `src/components/admin/StatCard.tsx` (pridat sparkline SVG)
- `src/components/admin/OrderFilters.tsx` (rozsirit filtry)

**Zmeny:**

#### 1.1 StatCard s sparkline mini-grafem
Aktualni StatCard ma jen label, value, change, icon. Shopify ma stat karty s malymi sparkline grafy (7-dennich trendovych dat).

**Uprava `StatCard.tsx`:**
- Pridat optional prop `sparkline?: number[]` — pole 7 cisel (poslednich 7 dni)
- Kdyz je sparkline pritomen, renderovat SVG polyline (vyska cca 30px, sirka 60px, zelena/cervena barva podle trendu)
- Zachovat zpetnou kompatibilitu — stavy pouziti bez sparkline zustanou beze zmeny

```tsx
interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  sparkline?: number[];  // NEW — optional 7-day trend data
}
```

**Sparkline SVG implementace:**
```tsx
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const h = 28, w = 56;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

#### 1.2 Stat karty s real daty na objednavky seznamu
Shopify ma nahoře 6 stat karet: Objednavky (dnes), Objedane polozky (% zmena), Vraceni prodeju, Splnene objednavky, Dorucene objednavky, Doba od objednani do plneni.

**Data query v `page.tsx`** — pridat do Promise.all:
```ts
// Pro sparkline: posledních 7 dní, po dnech
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
sevenDaysAgo.setHours(0, 0, 0, 0);

const dailyOrders = await prisma.order.findMany({
  where: { createdAt: { gte: sevenDaysAgo } },
  select: { createdAt: true, status: true, total: true, items: { select: { quantity: true } } },
});

// Agregovat po dnech do pole 7 cisel
```

**Stat karty (6 ks v gridu 2x3 nebo 3x2):**
1. **Objednavky dnes** — count orders today, sparkline posledních 7 dní
2. **Objedane polozky** — sum(items.quantity) dnes, % zmena vs vcera
3. **Trzby dnes** — formatPrice(sum total today), sparkline
4. **Splnene objednavky** — count SHIPPED dnes, sparkline
5. **Dorucene objednavky** — count DELIVERED dnes, sparkline
6. **Prumer. doba plneni** — avg(shippedAt - createdAt) v dnech

#### 1.3 Bohatsi tabulka
Shopify ma sloupce: checkbox, #cislo, Datum, Zakaznik, Termin plneni, Kanal, Celkem, Stav platby, Stav plneni, Polozky, Stav doruceni, Metoda doruceni.

**Nove sloupce pridame do tabulky:**
- **Checkbox** — `<input type="checkbox">` vlevo, s "select all" v headeru
- **Polozky** — `order.items.length` nebo `sum(items.quantity)` — male cislo
- **Metoda doruceni** — `order.shipping?.name` (uz existuje jako "Doprava")
- **Stav plneni** — nova badge: Nesplneno (PENDING/NEW/CONFIRMED), Probiha (PROCESSING/AWAITING_SUPPLIER), Splneno (SHIPPED/DELIVERED)
  - Mapovani: NEW/CONFIRMED → "Nesplneno" (yellow), PROCESSING/AWAITING_SUPPLIER → "Probiha" (blue), SHIPPED → "Splneno" (green), DELIVERED → "Doruceno" (green)
- **Termin plneni** — relativni datum "Vcera", "Pred 2 dny" (pro neodeslane), nebo "—" (pro odeslane)

**Sloupce vysledneho poradi:**
checkbox | #cislo | Datum | Zakaznik | Polozky | Celkem | Platba | Plneni | Doruceni | Doprava

#### 1.4 Bulk akce
- Checkbox select all v headeru
- Kdyz je vybrano >0, zobrazit action bar: "X vybrano" + tlacitka (Exportovat vybrane, Zmenit stav...)
- Toto vyzaduje client component pro checkboxy — vytvorit `OrderTableClient.tsx` wrapper

**Implementace:**
- Server component nacte data a preda je klientskemu `OrderTableClient`
- `OrderTableClient` drzi state `selectedIds: Set<string>` a renderuje checkboxy + bulk action bar

#### 1.5 Tlacitka vpravo nahore
- **Exportovat** (uz existuje) — presunout do button group
- **Dalsi akce** — dropdown (placeholder — budouci rozsireni)
- **+ Vytvorit objednavku** — primary button, link na `/admin/objednavky/nova` (stranka zatim nemusi existovat, link pro budouci pouziti)

#### 1.6 Paginace upgrade
- Zmena z 20 na 50 polozek na stranku (Shopify default)
- Zachovat existujici paginaci logiku

---

### FAZE 2: Fulfillment pohled (nova stranka)
**Novy soubor:** `src/app/(admin)/admin/objednavky/fulfillment/page.tsx`

Toto je ShipD-like pohled zamerenych na odeslani zasilek.

**Strukturu:**
- **Tabs**: Vse | Nesplnene | Splnene (filtrovani pres URL params)
- **Akce nahoře**: Packing slipy (batch), Exportovat CSV, Predavaci protokol (placeholder)
- **Tabulka**: Cislo objednavky, Zakaznik, Vytvoreno, Cena, Stav (badge), Tracking (cislo + datum), Doprava (GLS/Zasilkovna + nazev mista)

**Data:**
- Nesplnene = status IN (NEW, CONFIRMED, PROCESSING, AWAITING_SUPPLIER) AND paymentStatus = PAID
- Splnene = status IN (SHIPPED, DELIVERED)

**Link v sidebar:** Pridat pod "Objednavky" submenu polozku "Plneni" → `/admin/objednavky/fulfillment`

**Sidebar update (`AdminSidebar.tsx`):**
```tsx
// Pod Objednavky pridat:
{
  href: "/admin/objednavky/fulfillment",
  label: "Plneni",
  icon: /* box/package icon */
}
```

---

### FAZE 3: Objednavky detail — Shopify level
**Soubor:** `src/app/(admin)/admin/objednavky/[id]/page.tsx`

#### 3.1 Header upgrade
- Pridame Shopify-like badges vedle #cisla: `Zaplaceno` badge (zelena) + `Stav plneni` badge
- Pod header: datum + cas + zdroj "z Online Store"
- Tlacitka: Vratit penize (placeholder), Upravit (placeholder), Dalsi akce (dropdown placeholder)

#### 3.2 Fulfillment sekce
Nova karta nad polozkami:
```
Fulfillment — "Probiha" / "Nesplneno" / "Splneno"
  Dopravce: [nazev metody doruceni]
  Dodavatel: [prvni dodavatel z items — pokud existuje]
  Deadline: Splnit do [createdAt + 2 pracovni dny] v 12:00
  Doruceni: [shippedAt + 2-4 dny] (odhad)
  [Tlacitko: Oznacit jako splneno → zmena stavu na SHIPPED]
```

Tato sekce zobrazuje:
- Dopravce z `order.shipping.name`
- Dodavatel — pokud `needsSupplierOrder`, ukazat "DODAVATEL" (v budoucnu napojit na Supplier model)
- Deadline — `createdAt + 2 dny` (business days), cas 12:00
- Odhad doruceni — `shippedAt + 2-4 dny` nebo "po odeslani"

#### 3.3 Polozky s obrazky
Shopify ukazuje obrazky produktu vedle nazvu.

- Pridat `product` include do dotazu: `items: { include: { ... } }` — ale OrderItem nema prime napojeni na Product obrazky
- Reseni: pouzit `productId` z OrderItem a nacist Product.photos z DB
- Zobrazit maly thumbnail (40x40) vedle nazvu produktu

**Uprava dotazu:**
```ts
const productIds = order.items.map(i => i.productId).filter(Boolean);
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
  select: { id: true, photos: true },
});
const photoMap = new Map(products.map(p => [p.id, JSON.parse(p.photos)[0]]));
```

#### 3.4 Financni sekce "Zaplaceno"
Pod polozkami — podrobnejsi financni prehled:
- Mezisoučet
- Doprava (nazev metody)
- Sleva (pokud existuje)
- **DPH 21%** — vypocitat: `Math.round(order.total * 0.1736)` (21% z ceny vcetne DPH)
- Celkem
- Stav: Zaplaceno / Ceka na platbu

#### 3.5 Pravy sidebar — rozsireni
Pridat nove sekce:
- **Konverzni shrnutí**: "1. objednavka" / "Vracejici se zakaznik" (spocitat predchozi objednavky)
- **Riziko objednavky**: jednoduchy indikator (Nizke/Stredni/Vysoke) — default Nizke, Stredni pokud novy zakaznik a castka > 3000 Kč

#### 3.6 Metapole
Nova karta v levem sloupci:
- **Marze celkem**: pokud items maji costPrice, vypocitat `sum(totalPrice) - sum(costPrice * quantity)`
- **Nakupni cena celkem**: `sum(costPrice * quantity)` z variant
- **Sklady polozek**: barevne tecky (zelena = vlastni sklad, oranzova = dodavatel)

Pozn: costPrice je na modelu Variant, ne OrderItem. Nacist varianty pomoci variantId z OrderItem.

---

### FAZE 4: Doprava — karty misto tabulky
**Soubor:** `src/app/(admin)/admin/doprava/page.tsx`

Uzivatel rekl: "Tabulkova forma je neprehledna, potrebuje karty/tabs."

**Nova struktura:**
- Tabs nahore: "Aktivni" | "Neaktivni" | "Vse"
- Karty (grid 1-3 sloupce) misto tabulky
- Kazda karta:
  - Header: nazev + badge typu (Na adresu / Vydejni misto / Osobni)
  - Cena + Zdarma od
  - Konfigurace summary
  - Toggle aktivni/neaktivni
  - Link "Upravit"

```
┌─────────────────────────┐
│ Zásilkovna       🟢 Aktivní │
│ Výdejní místo                │
│ 79 Kč · Zdarma od 1500 Kč  │
│ API: 2bed••••41af2          │
│ [Upravit]                    │
└─────────────────────────┘
```

---

### FAZE 5: Sidebar — nove polozky
**Soubor:** `src/components/admin/AdminSidebar.tsx`

Pridat do navigace:
1. **Plneni** — pod "Objednavky" v sekci Prodej → href `/admin/objednavky/fulfillment`
2. **Opustene pokladny** — nova polozka v sekci Prodej → href `/admin/opustene-pokladny` (placeholder stranka)
3. **Finance** — nova sekce pod Prodej → href `/admin/finance` (placeholder stranka)

Placeholder stranky = jednoduchy `page.tsx` s "Pripravujeme" zpravou + popisem co tam bude.

---

## Poradi implementace (pro implementatora)

1. **StatCard sparkline** → male, izolovane, zpetne kompatibilni
2. **Objednavky seznam** → velky prepis, vyzaduje StatCard hotovy
3. **Fulfillment stranka** → novy soubor, nezavisla
4. **Objednavky detail** → velky prepis
5. **Doprava karty** → prepiš tabulku na karty
6. **Sidebar** → male zmeny, pridat linky
7. **Placeholder stranky** → trivialni

## Technicke poznamky

- **Next.js 16**: async params (`Promise<{ id: string }>`), RSC, Server Actions
- **Prisma 7 + SQLite**: vsechny ceny v halerich (Int), `formatPrice()` delí 100
- **Tailwind v4**: custom properties z globals.css, admin pouziva standardni gray/blue paletu (NE brand barvy --navy/--lime)
- **Port**: dev server na portu 9999
- **Bulk actions**: potrebuji "use client" wrapper pro state management, zbytek muze zustat RSC
- **Sparkline**: cista SVG, zadna knihovna
- **PER_PAGE**: zmenit z 20 na 50
