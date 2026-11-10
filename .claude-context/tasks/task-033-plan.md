# Plán: TASK-033 — Admin zákazníci

**Priorita:** 2
**Soubory k úpravě:**
- `src/app/(admin)/admin/zakaznici/page.tsx` (220 řádků)
- `src/app/(admin)/admin/zakaznici/[id]/page.tsx` (232 řádků)

---

## Analýza stávajícího stavu

### Co je hotovo (90%):
1. **Seznam zákazníků** — tabulka s jménem, emailem, telefonem, datem registrace, počtem objednávek, celkovou útratou
2. **Vyhledávání** — search podle jména, emailu, telefonu
3. **Pagination** — 20 per page, smart page numbering
4. **Detail zákazníka** — profil sidebar (kontakt, adresa, účet info, newsletter), objednávky tabulka se stavy + platbou

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Export CSV | Chybí | NÍZKÁ |
| 2 | Poznámky k zákazníkovi | Chybí (User model nemá `note` pole) | NÍZKÁ |
| 3 | Filtry (mimo search) | Pouze search, žádné filtry | NÍZKÁ |

---

## Problém 1: Export CSV

**Nový soubor:** `src/app/api/admin/customers/export/route.ts`

```tsx
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      orders: { select: { total: true, paymentStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Jméno,Příjmení,Email,Telefon,Adresa,Registrace,Objednávky,Útrata (Kč),Newsletter\n";
  const rows = users.map((u) => {
    const paidTotal = u.orders
      .filter((o) => o.paymentStatus === "PAID")
      .reduce((s, o) => s + o.total, 0);
    return [
      u.firstName || "",
      u.lastName || "",
      u.email,
      u.phone || "",
      [u.street, u.city, u.zip].filter(Boolean).join(" "),
      u.createdAt.toISOString().slice(0, 10),
      u.orders.length,
      (paidTotal / 100).toFixed(0),
      u.newsletter ? "Ano" : "Ne",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  }).join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zakaznici-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
```

**Soubor:** `src/app/(admin)/admin/zakaznici/page.tsx`

Přidat export tlačítko vedle headeru:

```tsx
<a
  href="/api/admin/customers/export"
  download
  className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
>
  Export CSV
</a>
```

---

## Problém 2: Poznámky k zákazníkovi

**Soubor:** `prisma/schema.prisma` — User model

```diff
model User {
  // ...existing fields...
+ adminNote    String?
  // ...
}
```

**Soubor:** `src/app/(admin)/admin/zakaznici/[id]/page.tsx`

Přidat poznámku box do sidebar:

```tsx
{/* Admin note */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <h3 className="text-sm font-bold text-gray-900 mb-3">Poznámka</h3>
  <form action={updateNote}>
    <input type="hidden" name="userId" value={user.id} />
    <textarea
      name="adminNote"
      rows={3}
      defaultValue={user.adminNote || ""}
      placeholder="Interní poznámka..."
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-gray-500 focus:outline-none resize-none"
    />
    <button type="submit" className="mt-2 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800">
      Uložit
    </button>
  </form>
</div>
```

Server action:
```tsx
async function updateNote(formData: FormData) {
  "use server";
  const userId = formData.get("userId") as string;
  const adminNote = (formData.get("adminNote") as string) || null;
  await prisma.user.update({ where: { id: userId }, data: { adminNote } });
  revalidatePath(`/admin/zakaznici/${userId}`);
}
```

---

## Shrnutí

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `prisma/schema.prisma` | +adminNote na User | +1 |
| 2 | `api/admin/customers/export/route.ts` | NOVÝ — CSV export | ~35 |
| 3 | `zakaznici/page.tsx` | Export tlačítko | +6 |
| 4 | `zakaznici/[id]/page.tsx` | Poznámka box + server action | +25 |

**Celkem:** ~67 řádků, 2 existující + 1 nový + schema
