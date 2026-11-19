# TASK-043: Zákazníci stránka — Shopify úroveň

## Přehled

Zákazníci stránka je relativně vyspělá — UŽ MÁ 4 stat karty se sparklines, search, tabulku, pagination, Export CSV.
Podle Shopify screenshotu chybí jen:
- Newsletter badge sloupec (Přihlášeno/Nepřihlášeno)
- Lokalita (město) sloupec
- Segment filtr (Všichni / Noví / Opakující se / VIP)
- Import zákazníků tlačítko (nice-to-have)

## CO UŽ EXISTUJE (nepřepisovat)

- 4 stat karty se sparklines (Celkem, Noví 30d, Opakující se, Prům. hodnota)
- Search (jméno, email, telefon)
- Tabulka: Zákazník (jméno+email), Telefon, Registrace, Objednávky, Útrata
- Pagination s číselnými stránkami
- Export CSV tlačítko

---

## FÁZE 1: Newsletter badge sloupec

### Soubor: `src/app/(admin)/admin/zakaznici/page.tsx`

**Přidat `newsletter` do user select:**

Na řádku 33-40 je `prisma.user.findMany()` s `include: { orders: ... }`.
Stávající dotaz nepoužívá `select`, takže `newsletter` field už PŘICHÁZÍ z DB (je v User modelu).
Ověřit, že TypeScript ho vidí — pokud ne, přidat explicitní select.

**Přidat thead sloupec (za "Registrace", řádek 182):**
```tsx
<th className="px-4 py-3 text-center font-medium text-gray-600 hidden md:table-cell">Newsletter</th>
```

**Přidat tbody cell (za registrace cell, řádek ~210):**
```tsx
<td className="px-4 py-3 text-center hidden md:table-cell">
  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
    user.newsletter
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-500"
  }`}>
    {user.newsletter ? "Přihlášeno" : "Nepřihlášeno"}
  </span>
</td>
```

---

## FÁZE 2: Lokalita (město) sloupec

### Soubor: `src/app/(admin)/admin/zakaznici/page.tsx`

User model má `city` field — přichází z DB.

**Přidat thead sloupec (za "Newsletter"):**
```tsx
<th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Lokalita</th>
```

**Přidat tbody cell:**
```tsx
<td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
  {user.city || "—"}
</td>
```

---

## FÁZE 3: Segment filtr

### Soubor: `src/app/(admin)/admin/zakaznici/page.tsx`

**Přidat segment do searchParams:**
```ts
const segment = params.segment || "";
```

**Upravit where logiku:**

Po stávajícím search where (řádek 18-25) přidat:
```ts
// Segment filtr — aplikovat po hlavním dotazu (vyžaduje join s objednávkami)
// Pro Prisma SQLite musíme filtrovat v JS, ne v where (nested aggregate filters nejsou podporované)
```

Lepší přístup — filtrovat v JS po dotazu (SQLite nemá having clause přes Prisma):

```ts
// Po načtení users, filtrovat podle segmentu
let filteredUsers = users;
if (segment === "new") {
  filteredUsers = users.filter(u => u.createdAt >= thirtyDaysAgo);
} else if (segment === "returning") {
  filteredUsers = users.filter(u => u.orders.filter(o => o.paymentStatus === "PAID").length > 1);
} else if (segment === "vip") {
  filteredUsers = users.filter(u => {
    const spent = u.orders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
    return spent >= 500000; // 5000 Kč v haléřích
  });
}
```

POZOR: Toto rozbije pagination pokud filtrujeme v JS po stránkování.
**Lepší řešení:** Segment filtr přidat do DB where kde je to možné, nebo filtrovat PŘED stránkováním:

```ts
// Načíst VŠECHNY users (pro filtrování) — ok pro stovky zákazníků
// Pro tisíce by bylo potřeba raw SQL
const allFilteredUsers = await prisma.user.findMany({
  where: searchWhere,
  include: {
    orders: {
      select: { total: true, paymentStatus: true },
    },
  },
  orderBy: { createdAt: "desc" },
});

// Segment filtr v JS
let segmentedUsers = allFilteredUsers;
if (segment === "new") {
  segmentedUsers = allFilteredUsers.filter(u => u.createdAt >= thirtyDaysAgo);
} else if (segment === "returning") {
  segmentedUsers = allFilteredUsers.filter(u => 
    u.orders.filter(o => o.paymentStatus === "PAID").length > 1
  );
} else if (segment === "vip") {
  segmentedUsers = allFilteredUsers.filter(u => {
    const spent = u.orders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
    return spent >= 500000; // 5000 Kč
  });
} else if (segment === "newsletter") {
  segmentedUsers = allFilteredUsers.filter(u => u.newsletter);
}

// Manuální pagination
const total = segmentedUsers.length;
const totalPages = Math.ceil(total / PER_PAGE);
const users = segmentedUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
```

**UI — segment selector (přidat nad search, nebo jako tabs):**

```tsx
{/* Segment tabs */}
<div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
  {[
    { value: "", label: "Všichni", count: allFilteredUsers.length },
    { value: "new", label: "Noví", count: allFilteredUsers.filter(u => u.createdAt >= thirtyDaysAgo).length },
    { value: "returning", label: "Opakující se", count: allFilteredUsers.filter(u => u.orders.filter(o => o.paymentStatus === "PAID").length > 1).length },
    { value: "vip", label: "VIP (5000+ Kč)", count: allFilteredUsers.filter(u => u.orders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0) >= 500000).length },
    { value: "newsletter", label: "Newsletter", count: allFilteredUsers.filter(u => u.newsletter).length },
  ].map(seg => (
    <Link
      key={seg.value}
      href={`/admin/zakaznici?${new URLSearchParams({ ...(search ? { search } : {}), ...(seg.value ? { segment: seg.value } : {}) })}`}
      className={`px-4 py-2 text-sm rounded-md transition-colors ${
        segment === seg.value
          ? "bg-gray-900 text-white font-medium"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {seg.label}
      <span className="ml-1.5 text-xs opacity-70">{seg.count}</span>
    </Link>
  ))}
</div>
```

---

## FÁZE 4: Utracená částka sloupec (vylepšení)

Utracená částka sloupec UŽ EXISTUJE ("Útrata" — řádek 215). Ale zobrazuje se vpravo jako číslo.

**Shopify zobrazuje tuto hodnotu tučně a s barvou:**

Aktuální:
```tsx
<td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
  {totalSpent > 0 ? formatPrice(totalSpent) : "—"}
</td>
```

Toto je OK — není potřeba měnit.

---

## KONTROLNÍ SEZNAM PRO IMPLEMENTÁTORA

- [ ] Přidat Newsletter badge sloupec (Přihlášeno/Nepřihlášeno zelená/šedá)
- [ ] Přidat Lokalita (město) sloupec
- [ ] Přidat segment filtr tabs (Všichni / Noví / Opakující se / VIP / Newsletter)
- [ ] Refaktorovat dotazy — načíst všechny pro segment filtrování, manuální pagination
- [ ] Přidat segment param do pagination linků
- [ ] Ověřit build: `npm run build`
- [ ] Otestovat: segment tabs fungují + search + pagination fungují společně

## SOUBORY K ÚPRAVĚ

1. `src/app/(admin)/admin/zakaznici/page.tsx` — všechny změny v jednom souboru

## ODHAD ROZSAHU

~80 řádků nového kódu + refaktoring stávajícího dotazu

## DŮLEŽITÉ POZNÁMKY

- Zákaznická stránka UŽ JE na dobré úrovni — stat karty, search, pagination, export existují
- Hlavní přidaná hodnota jsou segment tabs a newsletter/město sloupce
- Segment filtrování v JS je OK pro stovky zákazníků (Qsport je nový e-shop)
- Pokud zákazníků bude víc než 5000, bude potřeba raw SQL nebo Prisma `_count` filtry
