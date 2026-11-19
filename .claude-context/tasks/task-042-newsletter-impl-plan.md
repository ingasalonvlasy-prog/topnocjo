# TASK-042: Newsletter admin + unsubscribe — Implementační plán

## Aktuální stav kódu

### Existuje:
- `NewsletterSubscriber` model: `id, email, active, subscribedAt` (`prisma/schema.prisma:306-313`)
- POST `/api/newsletter` — subscribe endpoint (`src/app/api/newsletter/route.ts`)
- `StatCard` component (`src/components/admin/StatCard.tsx`)
- `AdminSidebar` (`src/components/admin/AdminSidebar.tsx`) — sekce "Marketing" na řádku 131
- `EmailLayout` (`src/lib/emails/layout.tsx`) — footer na řádcích 36-43
- `requireAdmin()` v `src/lib/auth.ts:89`

### NEEXISTUJE (implementovat):
- Admin stránka `/admin/newsletter`
- Newsletter export CSV API route
- Unsubscribe endpoint / stránka
- Unsubscribe link v email footeru
- Newsletter link v admin sidebar

---

## FÁZE 1: Admin stránka `/admin/newsletter`

### Nový soubor: `src/app/(admin)/admin/newsletter/page.tsx`

Server component (RSC). Vzor: kopírovat pattern ze `zakaznici/page.tsx`.

```tsx
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import Link from "next/link";
import { NewsletterActions } from "./NewsletterActions";

const PER_PAGE = 30;

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const filter = params.filter || ""; // "active" | "inactive" | ""
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const where: Record<string, unknown> = {};
  if (search) {
    where.email = { contains: search };
  }
  if (filter === "active") where.active = true;
  if (filter === "inactive") where.active = false;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [subscribers, total, allCount, activeCount, newCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
    prisma.newsletterSubscriber.count({ where: { subscribedAt: { gte: thirtyDaysAgo } } }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const inactiveCount = allCount - activeCount;

  // --- RENDER ---
  // Header: "Newsletter" + subtitle count + Export CSV button
  // 4 stat karty: Celkem, Aktivních, Nových (30d), Odhlášených
  // Search bar (form GET /admin/newsletter?search=xxx)
  // Filter tabs: Všichni | Aktivní | Odhlášení
  // Tabulka: Email | Stav badge | Datum přihlášení | Akce (NewsletterActions component)
  // Pagination: pattern z zákazníci page (URLSearchParams)
}
```

**Stat karty:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <StatCard label="Celkem" value={String(allCount)} />
  <StatCard label="Aktivních" value={String(activeCount)} changeType="up" />
  <StatCard label="Nových (30 dní)" value={String(newCount)} changeType={newCount > 0 ? "up" : "neutral"} />
  <StatCard label="Odhlášených" value={String(inactiveCount)} changeType={inactiveCount > 0 ? "down" : "neutral"} />
</div>
```

**Tabulka sloupce:**
- Email (text)
- Stav: `active ? zelený badge "Aktivní" : šedý badge "Odhlášen"`
- Datum: `subscribedAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })`
- Akce: `<NewsletterActions id={s.id} active={s.active} />` (client component)

**Pagination:** Použít URLSearchParams pattern, přenést search + filter + page parametry.

### Nový soubor: `src/app/(admin)/admin/newsletter/actions.ts`

```ts
"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleSubscriber(id: string, active: boolean) {
  await requireAdmin();
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/admin/newsletter");
}

export async function deleteSubscriber(id: string) {
  await requireAdmin();
  await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}
```

### Nový soubor: `src/app/(admin)/admin/newsletter/NewsletterActions.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import { toggleSubscriber, deleteSubscriber } from "./actions";

interface Props {
  id: string;
  active: boolean;
}

export function NewsletterActions({ id, active }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => startTransition(() => toggleSubscriber(id, !active))}
        disabled={isPending}
        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {active ? "Deaktivovat" : "Aktivovat"}
      </button>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        Smazat
      </button>
      {/* Confirm dialog pro smazání */}
    </div>
  );
}
```

---

## FÁZE 2: Export CSV API route

### Nový soubor: `src/app/api/admin/newsletter/export/route.ts`

```ts
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  await requireAdmin(); // AUTH CHECK!

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
  });

  const BOM = "\uFEFF";
  const header = "Email,Stav,Datum přihlášení";
  const rows = subscribers.map(s => {
    const email = `"${s.email.replace(/"/g, '""')}"`;
    return [
      email,
      s.active ? "Aktivní" : "Odhlášen",
      s.subscribedAt.toISOString().slice(0, 10),
    ].join(",");
  });

  const csv = BOM + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

---

## FÁZE 3: Unsubscribe stránka

### Nový soubor: `src/app/(public)/odhlasit-newsletter/page.tsx`

**URL:** `/odhlasit-newsletter?email=xxx`
- Bez emailu: zobrazí formulář pro zadání emailu
- S emailem: zobrazí email + tlačítko "Odhlásit"
- Po odhlášení (`?done=true`): zelená zpráva "Úspěšně odhlášeno"

**Server action:**
```ts
async function unsubscribe(formData: FormData) {
  "use server";
  const emailValue = (formData.get("email") as string)?.trim().toLowerCase();
  if (!emailValue) return;

  await prisma.newsletterSubscriber.updateMany({
    where: { email: emailValue },
    data: { active: false },
  });

  // Také odhlásit v User modelu pokud existuje
  await prisma.user.updateMany({
    where: { email: emailValue },
    data: { newsletter: false },
  });

  redirect(`/odhlasit-newsletter?email=${encodeURIComponent(emailValue)}&done=true`);
}
```

**Design:** Jednoduchý centrovaný layout, styl jako přihlašovací stránka. Barvy: Navy #0B1727 pro tlačítko.

---

## FÁZE 4: Unsubscribe link v email layout footeru

### Soubor: `src/lib/emails/layout.tsx` (ÚPRAVA)

**Řádky 36-43 — přidat nový Text element za stávající footer:**

```tsx
{/* Footer */}
<Section style={{ padding: "20px", textAlign: "center" as const }}>
  <Text style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>
    Qsport.cz — Sportovní vybavení
  </Text>
  <Text style={{ color: "#999", fontSize: "11px", margin: "0 0 4px" }}>
    Tento email byl odeslán automaticky, neodpovídejte na něj.
  </Text>
  <Text style={{ color: "#999", fontSize: "11px", margin: 0 }}>
    <a href="https://qsport.cz/odhlasit-newsletter" style={{ color: "#999", textDecoration: "underline" }}>
      Odhlásit z newsletteru
    </a>
  </Text>
</Section>
```

**POZNÁMKA:** Link bez `?email=` parametru — stránka zobrazí formulář. Je to jednodušší než propsat recipientEmail do EmailLayout a všech templates.

---

## FÁZE 5: Sidebar link

### Soubor: `src/components/admin/AdminSidebar.tsx` (ÚPRAVA)

**Přidat do sekce "Marketing" (řádek 131-163) novou položku za "Opuštěné pokladny":**

```ts
{
  href: "/admin/newsletter",
  label: "Newsletter",
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  ),
},
```

---

## KONTROLNÍ SEZNAM

- [ ] `src/app/(admin)/admin/newsletter/page.tsx` — NOVÝ
- [ ] `src/app/(admin)/admin/newsletter/actions.ts` — NOVÝ
- [ ] `src/app/(admin)/admin/newsletter/NewsletterActions.tsx` — NOVÝ
- [ ] `src/app/api/admin/newsletter/export/route.ts` — NOVÝ (s auth!)
- [ ] `src/app/(public)/odhlasit-newsletter/page.tsx` — NOVÝ
- [ ] `src/lib/emails/layout.tsx` — ÚPRAVA (přidat unsubscribe link do footeru)
- [ ] `src/components/admin/AdminSidebar.tsx` — ÚPRAVA (přidat Newsletter do Marketing sekce)
- [ ] Ověřit `npm run build` — žádné TS chyby
- [ ] Server actions mají `await requireAdmin()` check
- [ ] Export CSV má `await requireAdmin()` check

## ROZSAH: ~280 řádků nového kódu, 5 nových + 2 upravené soubory
