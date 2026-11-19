# TASK-047: Slevy stránka — Shopify empty state + vylepšení

## Přehled

Aktuální stránka slev je funkční (tabulka s kódy, statusy, platností, použitím).
Podle Shopify screenshotu chybí:
- Lepší empty state s ilustrací/ikonou
- Export tlačítko
- Stat karty (celkem, aktivních, použití za 30d)

## CO UŽ EXISTUJE (nepřepisovat)

- Tabulka: Kód, Typ, Sleva, Použití (count/limit), Platnost, Stav badge
- Status badges: Aktivní (zelená), Neaktivní (šedá), Vypršel (červená), Vyčerpán (žlutá)
- Tlačítko "+ Nový kód" → /admin/slevy/novy
- Link na detail /admin/slevy/[id]
- Celkový count v headeru

---

## FÁZE 1: Vylepšený empty state

### Soubor: `src/app/(admin)/admin/slevy/page.tsx`

**Aktuální empty state (řádek 37-39):**
```tsx
<div className="p-12 text-center">
  <p className="text-gray-500">Zatím žádné slevové kódy.</p>
</div>
```

**Nový empty state:**
```tsx
<div className="p-16 text-center">
  {/* Tag/Discount SVG icon */}
  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  </div>
  <h3 className="text-lg font-bold text-gray-900 mb-2">Žádné slevové kódy</h3>
  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
    Vytvořte slevový kód pro Vaše zákazníky — procenta nebo fixní částka, s časovým omezením nebo bez.
  </p>
  <Link
    href="/admin/slevy/novy"
    className="inline-flex h-9 items-center px-4 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
  >
    Vytvořit slevový kód
  </Link>
</div>
```

---

## FÁZE 2: Stat karty

### Soubor: `src/app/(admin)/admin/slevy/page.tsx`

**Přidat dotazy:**
```ts
const now = new Date();
const thirtyDaysAgo = new Date(now);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const totalCodes = codes.length;
const activeCodes = codes.filter(c => {
  if (!c.active) return false;
  if (c.validTo && now > c.validTo) return false;
  if (c.usageLimit && c.usageCount >= c.usageLimit) return false;
  return true;
}).length;
const totalUsage = codes.reduce((s, c) => s + c.usageCount, 0);
const expiredCodes = codes.filter(c => c.validTo && now > c.validTo).length;
```

**UI (přidat nad tabulku):**
```tsx
import { StatCard } from "@/components/admin/StatCard";

{codes.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <StatCard label="Celkem kódů" value={String(totalCodes)} />
    <StatCard
      label="Aktivních"
      value={String(activeCodes)}
      changeType={activeCodes > 0 ? "up" : "neutral"}
    />
    <StatCard
      label="Celkem použití"
      value={String(totalUsage)}
    />
    <StatCard
      label="Vypršelých"
      value={String(expiredCodes)}
      changeType={expiredCodes > 0 ? "down" : "neutral"}
    />
  </div>
)}
```

---

## FÁZE 3: Export tlačítko

### Soubor: `src/app/(admin)/admin/slevy/page.tsx`

**Přidat vedle "Nový kód" (řádek 28-33):**

```tsx
<div className="flex items-center gap-3">
  {codes.length > 0 && (
    <a
      href="/api/admin/discounts/export"
      download
      className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
    >
      Export CSV
    </a>
  )}
  <Link
    href="/admin/slevy/novy"
    className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
  >
    + Nový kód
  </Link>
</div>
```

### Nový soubor: `src/app/api/admin/discounts/export/route.ts`

```ts
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = "Kód,Typ,Hodnota,Použití,Limit,Platnost od,Platnost do,Aktivní";
  const rows = codes.map(c => [
    c.code,
    c.type,
    c.type === "percentage" ? `${c.value}%` : (c.value / 100).toFixed(2),
    c.usageCount,
    c.usageLimit || "bez limitu",
    c.validFrom?.toISOString().slice(0, 10) || "",
    c.validTo?.toISOString().slice(0, 10) || "",
    c.active ? "Ano" : "Ne",
  ].join(","));

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="slevy-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

---

## KONTROLNÍ SEZNAM

- [ ] Vylepšit empty state (ikona, popis, CTA)
- [ ] Přidat 4 stat karty (celkem, aktivních, použití, vypršelých)
- [ ] Přidat Export CSV tlačítko + API route
- [ ] Import StatCard component
- [ ] Ověřit build

## SOUBORY K ÚPRAVĚ

1. `src/app/(admin)/admin/slevy/page.tsx` — empty state, stat karty, export button
2. `src/app/api/admin/discounts/export/route.ts` — NOVÝ

## ODHAD: ~70 řádků nového kódu
