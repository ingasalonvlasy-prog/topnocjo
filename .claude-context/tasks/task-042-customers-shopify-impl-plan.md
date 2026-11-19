# TASK-042: Zákazníci stránka Shopify upgrade — Implementační plán

## Aktuální stav kódu

### `src/app/(admin)/admin/zakaznici/page.tsx` (292 řádků):
- 4 stat karty se sparklines (Celkem, Noví 30d, Opakující se, Prům. hodnota) — HOTOVO
- Search (jméno, email, telefon) — HOTOVO
- Tabulka: Zákazník (jméno+email), Telefon, Registrace, Objednávky, Útrata — HOTOVO
- Pagination s číselnými stránkami — HOTOVO
- Export CSV tlačítko → `/api/admin/customers/export` — HOTOVO

### CO CHYBÍ:
- Newsletter badge sloupec
- Lokalita (město) sloupec
- Segment filtr (Všichni / Noví / Opakující se / VIP / Newsletter)

### Relevantní DB fields:
- `User.newsletter` — Boolean, default false (`prisma/schema.prisma:160`)
- `User.city` — String? (`prisma/schema.prisma:158`)
- Oboje přichází z DB (findMany bez select = vrátí vše)

---

## FÁZE 1: Newsletter badge sloupec

### Soubor: `src/app/(admin)/admin/zakaznici/page.tsx`

**1a) Přidat thead sloupec (za "Registrace" th, řádek 181):**
```tsx
<th className="px-4 py-3 text-center font-medium text-gray-600 hidden md:table-cell">Newsletter</th>
```

**1b) Přidat tbody cell (za registrace td, řádek ~210):**
```tsx
<td className="px-4 py-3 text-center hidden md:table-cell">
  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
    user.newsletter
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-500"
  }`}>
    {user.newsletter ? "Ano" : "Ne"}
  </span>
</td>
```

---

## FÁZE 2: Lokalita (město) sloupec

### Soubor: `src/app/(admin)/admin/zakaznici/page.tsx`

**2a) Přidat thead sloupec (za Newsletter th):**
```tsx
<th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Lokalita</th>
```

**2b) Přidat tbody cell (za newsletter td):**
```tsx
<td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
  {user.city || "—"}
</td>
```

---

## FÁZE 3: Segment filtr tabs

### Soubor: `src/app/(admin)/admin/zakaznici/page.tsx`

**Toto vyžaduje refaktoring DB dotazu.** Aktuálně stránka načítá `users` s `skip/take` a `allCustomers` zvlášť pro stat karty. Segment filtr vyžaduje filtrovat PŘED stránkováním.

**3a) Přidat segment do params (řádek ~15):**
```ts
const segment = params.segment || "";
```

**3b) Refaktorovat dotazy — načíst všechny a filtrovat v JS:**

Aktuální pattern (řádek 32-51) — 3 dotazy: paginated users, total count, allCustomers.

Nový pattern:
```ts
// Načíst VŠECHNY matching users (OK pro stovky zákazníků)
const allMatchingUsers = await prisma.user.findMany({
  where,
  include: {
    orders: {
      select: { total: true, paymentStatus: true },
    },
  },
  orderBy: { createdAt: "desc" },
});

// Segment filtr v JS
let segmentedUsers = allMatchingUsers;
if (segment === "new") {
  segmentedUsers = allMatchingUsers.filter(u => u.createdAt >= thirtyDaysAgo);
} else if (segment === "returning") {
  segmentedUsers = allMatchingUsers.filter(u =>
    u.orders.filter(o => o.paymentStatus === "PAID").length > 1
  );
} else if (segment === "vip") {
  segmentedUsers = allMatchingUsers.filter(u => {
    const spent = u.orders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
    return spent >= 500000; // 5000 Kč v haléřích
  });
} else if (segment === "newsletter") {
  segmentedUsers = allMatchingUsers.filter(u => u.newsletter);
}

// Manuální pagination
const total = segmentedUsers.length;
const totalPages = Math.ceil(total / PER_PAGE);
const users = segmentedUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

// Stats (z allMatchingUsers BEZ segmentu — pro celkový přehled)
const allCustomers = allMatchingUsers;
```

**POZOR:** `allCustomers` proměnná je použita pro stat karty (řádky 56-80). Po refaktoringu použít `allMatchingUsers` místo separátního dotazu. Odstranit třetí dotaz z Promise.all.

**3c) Segment tabs UI (vložit nad search bar, řádek ~127):**

```tsx
{/* Segment tabs */}
<div className="flex flex-wrap gap-1 mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
  {[
    { value: "", label: "Všichni" },
    { value: "new", label: "Noví (30d)" },
    { value: "returning", label: "Opakující se" },
    { value: "vip", label: "VIP (5000+ Kč)" },
    { value: "newsletter", label: "Newsletter" },
  ].map(seg => {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (seg.value) sp.set("segment", seg.value);
    const count = seg.value === ""
      ? allMatchingUsers.length
      : seg.value === "new"
      ? allMatchingUsers.filter(u => u.createdAt >= thirtyDaysAgo).length
      : seg.value === "returning"
      ? allMatchingUsers.filter(u => u.orders.filter(o => o.paymentStatus === "PAID").length > 1).length
      : seg.value === "vip"
      ? allMatchingUsers.filter(u => u.orders.filter(o => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0) >= 500000).length
      : allMatchingUsers.filter(u => u.newsletter).length;

    return (
      <Link
        key={seg.value}
        href={`/admin/zakaznici?${sp.toString()}`}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
          segment === seg.value
            ? "bg-gray-900 text-white font-medium"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        {seg.label}
        <span className="ml-1.5 text-xs opacity-60">{count}</span>
      </Link>
    );
  })}
</div>
```

**3d) Přidat segment do pagination linků:**

V `PageLink` funkci (řádek 268-291) přidat:
```ts
function PageLink({ page, search, segment, label, active = false }: {
  page: number;
  search: string;
  segment: string;  // NOVÝ
  label: string;
  active?: boolean;
}) {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  if (segment) sp.set("segment", segment);
  sp.set("page", String(page));
  // ... rest same
}
```

A aktualizovat všechna volání `<PageLink>` aby přidala `segment={segment}` prop.

---

## KONTROLNÍ SEZNAM

- [ ] Přidat Newsletter badge sloupec (Ano/Ne, zelený/šedý badge)
- [ ] Přidat Lokalita sloupec (user.city)
- [ ] Refaktorovat dotazy — jeden query, segment filtrování v JS, manuální pagination
- [ ] Přidat segment tabs (Všichni / Noví / Opakující se / VIP / Newsletter)
- [ ] Přidat segment param do PageLink a pagination
- [ ] Ověřit `npm run build`
- [ ] Otestovat: segment tabs + search fungují společně
- [ ] Otestovat: pagination funguje se segmentem

## SOUBORY K ÚPRAVĚ

1. `src/app/(admin)/admin/zakaznici/page.tsx` — všechny změny v jednom souboru

## ROZSAH: ~80 řádků nového kódu + refaktoring dotazů
