# TASK-039: Dashboard Shopify level — stat drill-down, period comparison

## Aktualni stav

**Soubory:**
- `src/app/(admin)/admin/page.tsx` — Dashboard, Server Component, 405 radku
- `src/app/(admin)/admin/analytika/page.tsx` — Analytika, Server Component, 496 radku
- `src/components/admin/StatCard.tsx` — StatCard se sparkline (uz ma sparkline SVG), 57 radku
- `src/components/admin/AdminSidebar.tsx` — sidebar navigace

**Aktualni dashboard features:**
- 3 order stat karty (Objednavky celkem, Nove objednavky, Trzby) — BEZ sparkline
- 4 product stat karty (Celkem produktu, Aktivni, Kategorie, Nizky sklad) — BEZ sparkline
- Rychle akce (7 tlacitek)
- Trzby za 7 dni — bar chart (CSS div bary)
- Posledni objednavky (tabulka, 5 radku)
- Nizke zasoby (list, 10 polozek)
- Posledni aktivita (log, 10 zaznamu)
- Znacky overview (grid)

**Aktualni analytika features:**
- Period selector (7/30/90 dni)
- 7 stat karet (trzby celkem/mesic, objednavky, prumer, zakaznici, konverze, nove)
- Trzby tabulka po dnech s inline bary
- Objednavky dle stavu
- Top znacky/kategorie/produkty tabulky

**Co chybi oproti Shopify:**
1. **Horni stat bar se sparkline** — 4 hlavni metriky s mini-grafy (Prodeje, Objednavky, Konverze, Prumerna hodnota)
2. **KLIKATELNY drill-down** — klik na stat kartu otevre detail view s velkym line chartem
3. **Period comparison** — aktualni vs predchozi obdobi (solid vs dashed cara)
4. **Obdobi selector** — "Poslednich 30 dni" dropdown
5. **Sidebar chybejici polozky** — Trhy, Obsah, Prodejni kanaly

---

## Implementacni plan

### KROK 1: Dashboard layout prepis — Shopify hero stats
**Soubor:** `src/app/(admin)/admin/page.tsx`

Nahradit aktualnich 3+4 stat karet za 4 hlavni Shopify-style hero karty se sparkline a klikatelnym drill-down.

**4 hlavni stat karty:**

| # | Label | Value | Sparkline | Change | Drill-down URL |
|---|-------|-------|-----------|--------|----------------|
| 1 | Celkove prodeje | formatPrice(periodRevenue) | 30-denni denni trzby | % vs predchozi obdobi | `/admin?stat=prodeje` |
| 2 | Objednavky | periodOrderCount | 30-denni denni objednavky | % vs predchozi obdobi | `/admin?stat=objednavky` |
| 3 | Konverzni pomer | `X.XX %` | 30-denni denni konverze | % vs predchozi obdobi | `/admin?stat=konverze` |
| 4 | Prumerna objednavka | formatPrice(avgOrderValue) | 30-denni denni prumer | % vs predchozi obdobi | `/admin?stat=prumer` |

**Data queries (prepsat Promise.all):**

```ts
const now = new Date();
const periodDays = 30;
const periodStart = new Date(now);
periodStart.setDate(periodStart.getDate() - periodDays);
periodStart.setHours(0, 0, 0, 0);

// Predchozi obdobi (pro % porovnani)
const prevStart = new Date(periodStart);
prevStart.setDate(prevStart.getDate() - periodDays);

const [
  // Aktualni obdobi
  currentOrders,
  // Predchozi obdobi
  prevOrders,
  // Pro zbytek dashboardu
  newOrders,
  recentOrders,
  lowStockVariants,
  logs,
] = await Promise.all([
  prisma.order.findMany({
    where: { createdAt: { gte: periodStart } },
    select: {
      createdAt: true,
      total: true,
      paymentStatus: true,
      status: true,
      items: { select: { quantity: true } },
    },
  }),
  prisma.order.findMany({
    where: { createdAt: { gte: prevStart, lt: periodStart } },
    select: {
      createdAt: true,
      total: true,
      paymentStatus: true,
    },
  }),
  prisma.order.count({ where: { status: "NEW" } }),
  prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, orderNumber: true, firstName: true, lastName: true, total: true, status: true, createdAt: true },
  }),
  // ... low stock (zachovat existujici)
  // ... logs (zachovat existujici)
]);
```

**Agregace pro stat karty + sparklines:**

```ts
// Helper: agregace po dnech
function dailyAgg(
  orders: Array<{ createdAt: Date; total: number; paymentStatus: string }>,
  days: number,
  start: Date,
  metricFn: (dayOrders: typeof orders) => number
): number[] {
  const result: number[] = [];
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(start);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayOrders = orders.filter(o => o.createdAt >= dayStart && o.createdAt <= dayEnd);
    result.push(metricFn(dayOrders));
  }
  return result;
}

// Prodeje sparkline (30 bodu)
const salesSparkline = dailyAgg(currentOrders, periodDays, periodStart,
  (day) => day.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0)
);

// Objednavky sparkline
const ordersSparkline = dailyAgg(currentOrders, periodDays, periodStart,
  (day) => day.length
);

// Konverze sparkline (denni: paid / total * 100)
const conversionSparkline = dailyAgg(currentOrders, periodDays, periodStart,
  (day) => day.length > 0 ? Math.round((day.filter(o => o.paymentStatus === "PAID").length / day.length) * 100) : 0
);

// Prumerna objednavka sparkline
const avgSparkline = dailyAgg(currentOrders, periodDays, periodStart,
  (day) => {
    const paid = day.filter(o => o.paymentStatus === "PAID");
    return paid.length > 0 ? Math.round(paid.reduce((s, o) => s + o.total, 0) / paid.length) : 0;
  }
);

// Period totals
const periodRevenue = currentOrders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
const periodOrderCount = currentOrders.length;
const periodPaidCount = currentOrders.filter(o => o.paymentStatus === "PAID").length;
const periodConversion = periodOrderCount > 0 ? ((periodPaidCount / periodOrderCount) * 100).toFixed(1) : "0";
const periodAvg = periodPaidCount > 0 ? Math.round(periodRevenue / periodPaidCount) : 0;

// Predchozi obdobi totals (pro % zmena)
const prevRevenue = prevOrders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
const prevOrderCount = prevOrders.length;
const prevPaidCount = prevOrders.filter(o => o.paymentStatus === "PAID").length;
const prevConversion = prevOrderCount > 0 ? ((prevPaidCount / prevOrderCount) * 100) : 0;
const prevAvg = prevPaidCount > 0 ? Math.round(prevRevenue / prevPaidCount) : 0;

// % zmena helper
function pctChange(current: number, previous: number): { text: string; type: "up" | "down" | "neutral" } {
  if (previous === 0) return current > 0 ? { text: "+100%", type: "up" } : { text: "0%", type: "neutral" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${pct > 0 ? "+" : ""}${pct}% vs predchozi obdobi`,
    type: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  };
}
```

**Render 4 hero stat karet:**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <Link href="/admin?stat=prodeje">
    <StatCard
      label="Celkove prodeje"
      value={formatPrice(periodRevenue)}
      change={pctChange(periodRevenue, prevRevenue).text}
      changeType={pctChange(periodRevenue, prevRevenue).type}
      sparkline={salesSparkline}
    />
  </Link>
  <Link href="/admin?stat=objednavky">
    <StatCard
      label="Objednavky"
      value={String(periodOrderCount)}
      change={pctChange(periodOrderCount, prevOrderCount).text}
      changeType={pctChange(periodOrderCount, prevOrderCount).type}
      sparkline={ordersSparkline}
    />
  </Link>
  <Link href="/admin?stat=konverze">
    <StatCard
      label="Konverzni pomer"
      value={`${periodConversion} %`}
      change={pctChange(Number(periodConversion), prevConversion).text}
      changeType={pctChange(Number(periodConversion), prevConversion).type}
      sparkline={conversionSparkline}
    />
  </Link>
  <Link href="/admin?stat=prumer">
    <StatCard
      label="Prumerna objednavka"
      value={formatPrice(periodAvg)}
      change={pctChange(periodAvg, prevAvg).text}
      changeType={pctChange(periodAvg, prevAvg).type}
      sparkline={avgSparkline}
    />
  </Link>
</div>
```

---

### KROK 2: Stat drill-down view
**Soubor:** `src/app/(admin)/admin/page.tsx` (podminka na `searchParams.stat`)

Kdyz je v URL `?stat=prodeje|objednavky|konverze|prumer`, zobrazit drill-down misto normalniho dashboardu (pod stat kartami).

**Drill-down layout (Shopify styl):**

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Zpet na dashboard                                            │
│                                                                 │
│ Celkove prodeje v case                                         │
│ 83 127 Kc                              +24% vs predchozi       │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │   ╱╲    ╱╲                                                  │ │
│ │  ╱  ╲  ╱  ╲   ╱╲                    ← solid = aktualni    │ │
│ │ ╱    ╲╱    ╲ ╱  ╲                                          │ │
│ │╱            ╲╱    ╲╱                                        │ │
│ │                                                             │ │
│ │  - - -  - - -  - - - - - - - -       ← dashed = predchozi │ │
│ │                                                             │ │
│ │ 12.10  17.10  22.10  27.10  1.11  6.11  10.11             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ● 11.10.2026 – 10.11.2026  ○ 10.09.2026 – 10.10.2026         │
└─────────────────────────────────────────────────────────────────┘
```

**Implementace — SVG line chart:**

```tsx
function LineChart({
  current,
  previous,
  labels,
  formatValue,
}: {
  current: number[];
  previous: number[];
  labels: string[];
  formatValue: (v: number) => string;
}) {
  const allValues = [...current, ...previous];
  const max = Math.max(...allValues, 1);
  const w = 800;
  const h = 300;
  const padX = 50;
  const padY = 30;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  function toPoints(data: number[]): string {
    return data
      .map((v, i) => {
        const x = padX + (i / (data.length - 1)) * chartW;
        const y = padY + chartH - (v / max) * chartH;
        return `${x},${y}`;
      })
      .join(" ");
  }

  // Y-axis grid lines (5 linii)
  const yLines = Array.from({ length: 5 }, (_, i) => {
    const val = (max / 4) * i;
    const y = padY + chartH - (val / max) * chartH;
    return { y, label: formatValue(Math.round(val)) };
  });

  // X-axis labels (kazdy 5. den)
  const xLabels = labels
    .map((l, i) => ({ label: l, x: padX + (i / (labels.length - 1)) * chartW }))
    .filter((_, i) => i % 5 === 0 || i === labels.length - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid */}
      {yLines.map((line) => (
        <g key={line.y}>
          <line x1={padX} y1={line.y} x2={w - padX} y2={line.y} stroke="#e5e7eb" strokeWidth="1" />
          <text x={padX - 8} y={line.y + 4} textAnchor="end" className="text-[10px] fill-gray-400">
            {line.label}
          </text>
        </g>
      ))}
      {/* X labels */}
      {xLabels.map((item) => (
        <text key={item.label} x={item.x} y={h - 5} textAnchor="middle" className="text-[10px] fill-gray-400">
          {item.label}
        </text>
      ))}
      {/* Previous period — dashed */}
      <polyline
        points={toPoints(previous)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current period — solid */}
      <polyline
        points={toPoints(current)}
        fill="none"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

**Drill-down data:**

Potrebujeme 30-denni data pro OBE obdobi. Aktualni obdobi uz mame z kroku 1 (`currentOrders`). Predchozi obdobi uz mame (`prevOrders`). Staci agregovat po dnech stejne jako sparkline, ale s 30 body.

```ts
// Pro predchozi obdobi sparkline
const prevSalesDaily = dailyAgg(prevOrders, periodDays, prevStart,
  (day) => day.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0)
);
// ... analogicky pro objednavky, konverze, prumer
```

**Drill-down renderovani:**

```tsx
const stat = params.stat;
const statConfig: Record<string, {
  title: string;
  description: string;
  value: string;
  change: ReturnType<typeof pctChange>;
  currentData: number[];
  previousData: number[];
  formatFn: (v: number) => string;
}> = {
  prodeje: {
    title: "Celkove prodeje v case",
    description: "Trzby za zvolene obdobi po dnech",
    value: formatPrice(periodRevenue),
    change: pctChange(periodRevenue, prevRevenue),
    currentData: salesSparkline,
    previousData: prevSalesDaily,
    formatFn: (v) => formatPrice(v),
  },
  objednavky: { /* analogicky */ },
  konverze: { /* analogicky */ },
  prumer: { /* analogicky */ },
};

{stat && statConfig[stat] && (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
    <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
      &larr; Zpet na dashboard
    </Link>
    <div className="flex items-center justify-between mb-2">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{statConfig[stat].title}</h2>
        <p className="text-sm text-gray-500">{statConfig[stat].description}</p>
      </div>
      <div className="text-right">
        <p className="text-3xl font-bold text-gray-900">{statConfig[stat].value}</p>
        <p className={`text-sm font-medium ${
          statConfig[stat].change.type === "up" ? "text-green-600"
          : statConfig[stat].change.type === "down" ? "text-red-500"
          : "text-gray-500"
        }`}>
          {statConfig[stat].change.text}
        </p>
      </div>
    </div>

    {/* Line chart */}
    <LineChart
      current={statConfig[stat].currentData}
      previous={statConfig[stat].previousData}
      labels={dateLabels}
      formatValue={statConfig[stat].formatFn}
    />

    {/* Legenda */}
    <div className="flex items-center gap-6 mt-4 text-sm">
      <span className="flex items-center gap-2">
        <span className="w-6 h-0.5 bg-gray-900 inline-block" />
        {formatDateRange(periodStart, now)}
      </span>
      <span className="flex items-center gap-2">
        <span className="w-6 h-0.5 bg-gray-400 inline-block" style={{ borderTop: "2px dashed #9ca3af", height: 0 }} />
        {formatDateRange(prevStart, periodStart)}
      </span>
    </div>
  </div>
)}
```

**Date labels helper:**
```ts
const dateLabels = Array.from({ length: periodDays }, (_, i) => {
  const d = new Date(periodStart);
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
});

function formatDateRange(from: Date, to: Date): string {
  return `${from.toLocaleDateString("cs-CZ")} – ${to.toLocaleDateString("cs-CZ")}`;
}
```

---

### KROK 3: Obdobi selector
**Soubor:** `src/app/(admin)/admin/page.tsx`

Pridat dropdown pod header "Dashboard":

```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
  <div className="flex items-center gap-2">
    {/* Obdobi selector */}
    {[
      { days: 7, label: "7 dni" },
      { days: 30, label: "30 dni" },
      { days: 90, label: "90 dni" },
    ].map(({ days, label }) => (
      <Link
        key={days}
        href={`/admin?obdobi=${days}${stat ? `&stat=${stat}` : ""}`}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          periodDays === days
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {label}
      </Link>
    ))}
  </div>
</div>
```

**SearchParams rozsireni:**
```ts
const periodDays = [7, 30, 90].includes(parseInt(params.obdobi || "30")) 
  ? parseInt(params.obdobi || "30") 
  : 30;
const stat = params.stat || "";
```

---

### KROK 4: Reorganizace zbytku dashboardu
**Soubor:** `src/app/(admin)/admin/page.tsx`

Pod stat kartami (a pripadnym drill-down) zachovat:
1. **Rychle akce** — zachovat beze zmen
2. **Revenue bar chart** — NAHRADIT za kompaktnejsi line chart (pouzit stejny LineChart component, jen bez previous dat a mensi)
3. **Posledni objednavky** — zachovat
4. **Nizke zasoby** — zachovat
5. **Posledni aktivita** — zachovat
6. **Znacky** — ODEBRAT (je v analytice, na dashboardu zbytecne)

**Poradi novych sekci:**
1. Header + obdobi selector
2. 4 hero stat karty se sparkline
3. Drill-down panel (podminka na ?stat=)
4. 2-column: Posledni objednavky | Nizke zasoby
5. Posledni aktivita
6. Rychle akce (presunout na konec — mene dulezite)

---

### KROK 5: Sidebar — nove polozky (VOLITELNE)
**Soubor:** `src/components/admin/AdminSidebar.tsx`

Shopify sidebar referenci ukazuje: Trhy, Obsah, Prodejni kanaly.

**Doporuceni:** NEPRIDAVAT — Qsport nepotrebuje "Trhy" (neni multi-market) a "Prodejni kanaly" (jen online). "Obsah" uz mame jako "Blog". Sidebar je aktualne dobre strukturovany. Jedine relevantni zmeny v sidebar uz byly naplanovany v predchozich fazich (Plneni pod Objednavky).

---

## Souhrn zmen

| Soubor | Akce | Odhad |
|--------|------|-------|
| `src/app/(admin)/admin/page.tsx` | VELKY prepis: 4 hero stat karty, drill-down view, obdobi selector, line chart, reorganizace | ~350 radku zmen |
| `src/components/admin/StatCard.tsx` | Beze zmen (sparkline uz funguje) | 0 |
| `src/components/admin/AdminSidebar.tsx` | Beze zmen (sidebar zmeny uz v predchozich fazich) | 0 |

**Celkem:** ~350 radku zmen, 0 novych souboru

## Technicke poznamky

- **Line chart = ciste SVG** — zadna knihovna, polyline s viewBox pro responsivitu
- **Period comparison** — 2 query (current + previous), server-side agregace
- **Drill-down** — URL params (`?stat=prodeje`), podminkovy render na serveru, zadny client state
- **Obdobi selector** — URL params (`?obdobi=30`), default 30 dni
- **Zpetna kompatibilita** — dashboard bez URL params funguje normalne (30 dni, bez drill-down)

## Zavislosti

- StatCard se sparkline (uz hotove z predchozi faze)
- formatPrice z lib/products (existujici)
- Zadna nova DB migrace — vsechna data uz existuji v Order modelu

## Poradi kroku pro implementatora

1. Data queries + agregace (zaklad)
2. 4 hero stat karty (nahradi stare)
3. LineChart SVG component
4. Drill-down panel s podminou na ?stat=
5. Obdobi selector
6. Reorganizace zbytku dashboardu (preskladat sekce, odebrat Znacky)
