# TASK-048: Newsletter admin správa + unsubscribe

## Přehled

Newsletter se sbírá (registrace + homepage formulář), ale chybí:
- Samostatná admin stránka pro správu odběratelů (aktuálně jen miniwidget na /admin/nastaveni)
- Export odběratelů
- Mazání/deaktivace odběratelů
- Unsubscribe link v emailech (GDPR požadavek!)
- Unsubscribe landing page

## CO UŽ EXISTUJE

- `NewsletterSubscriber` model v Prisma (id, email, active, subscribedAt)
- Miniwidget na `/admin/nastaveni` — zobrazuje počet aktivních/celkem + posledních 10
- Newsletter checkbox při registraci
- Sběr emailů na homepage (newsletter formulář)
- Growth page (`/admin/rust`) zobrazuje newsletterCount

---

## FÁZE 1: Admin stránka — seznam odběratelů

### Nový soubor: `src/app/(admin)/admin/newsletter/page.tsx`

**Funkce:**
- Header: "Newsletter" + count + Export CSV + Přidat odběratele
- Stat karty: Celkem, Aktivních, Nových (30d), Odhlášených
- Search bar (hledání podle emailu)
- Tabulka: Email, Stav (Aktivní/Odhlášen badge), Datum přihlášení, Akce (deaktivovat/smazat)
- Pagination

**Vzor kódu:**

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
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const where: Record<string, unknown> = {};
  if (search) {
    where.email = { contains: search };
  }

  const [subscribers, total, allCount, activeCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const inactiveCount = allCount - activeCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-1">{allCount} odběratelů celkem</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/newsletter/export"
            download
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Aktivních" value={String(activeCount)} changeType="up" />
        <StatCard label="Celkem" value={String(allCount)} />
        <StatCard label="Odhlášených" value={String(inactiveCount)} changeType={inactiveCount > 0 ? "down" : "neutral"} />
      </div>

      {/* Search + Table + Pagination */}
      {/* ... standardní layout jako zákazníci ... */}

      {/* Tabulka: Email | Stav badge | Datum | Akce (deaktivovat/smazat) */}
    </div>
  );
}
```

### Nový soubor: `src/app/(admin)/admin/newsletter/actions.ts`

```ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleSubscriber(id: string, active: boolean) {
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/admin/newsletter");
}

export async function deleteSubscriber(id: string) {
  await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}
```

### Nový soubor: `src/app/(admin)/admin/newsletter/NewsletterActions.tsx`

Client component s tlačítky Deaktivovat/Aktivovat + Smazat (s confirm dialogem).

---

## FÁZE 2: Export CSV API route

### Nový soubor: `src/app/api/admin/newsletter/export/route.ts`

```ts
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
  });

  const header = "Email,Stav,Datum přihlášení";
  const rows = subscribers.map(s => [
    s.email,
    s.active ? "Aktivní" : "Odhlášen",
    s.subscribedAt.toISOString().slice(0, 10),
  ].join(","));

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

---

## FÁZE 3: Unsubscribe — GDPR povinnost

### Nový soubor: `src/app/(public)/odhlasit-newsletter/page.tsx`

**Funkce:**
- URL: `/odhlasit-newsletter?email=xxx` (email v query parametru)
- Zobrazí: "Odhlášení z newsletteru" + email + tlačítko "Odhlásit"
- Server action: najde subscriber podle emailu, nastaví `active: false`
- Po odhlášení: zelená zpráva "Úspěšně odhlášeno"

**Vzor:**

```tsx
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const email = sp.email || "";
  const done = sp.done === "true";

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

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6 text-center">
        {done ? (
          <>
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[22px] font-extrabold text-navy mb-2">Odhlášeno</h1>
            <p className="text-[14px] text-muted">
              E-mail {email} byl odhlášen z newsletteru.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-extrabold text-navy mb-4">Odhlášení z newsletteru</h1>
            <p className="text-[14px] text-muted mb-6">
              Kliknutím na tlačítko se odhlásíte z odběru novinek na adrese <strong>{email}</strong>.
            </p>
            <form action={unsubscribe}>
              <input type="hidden" name="email" value={email} />
              <button
                type="submit"
                className="h-[44px] px-8 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
              >
                Odhlásit z newsletteru
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## FÁZE 4: Unsubscribe link v email layoutu

### Soubor: `src/lib/emails/layout.tsx`

**Přidat do footer sekce (řádek 36-47):**

Aktuální footer:
```tsx
<Section style={{ padding: "20px", textAlign: "center" as const }}>
  <Text style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>
    Qsport.cz — Sportovní vybavení
  </Text>
  <Text style={{ color: "#999", fontSize: "11px", margin: 0 }}>
    Tento email byl odeslán automaticky, neodpovídejte na něj.
  </Text>
</Section>
```

**Nový footer:**
```tsx
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

**POZNÁMKA:** Ideálně by link měl obsahovat email parametr, ale EmailLayout nemá přístup k recipient emailu. Řešení:
- Varianta A: Přidat `recipientEmail` prop do EmailLayout → propsat ze všech email templates
- Varianta B: Bez parametru — stránka zobrazí formulář pro zadání emailu
- **Doporučuji B** — jednodušší, funguje, nemusí se měnit všechny šablony

---

## FÁZE 5: Sidebar link

### Soubor: `src/components/admin/AdminSidebar.tsx`

Přidat odkaz na `/admin/newsletter` do sidebar navigace (pod Zákazníci nebo do sekce Marketing).

---

## KONTROLNÍ SEZNAM

- [ ] Nová stránka `/admin/newsletter` — seznam, search, stat karty, pagination
- [ ] Server actions: toggleSubscriber, deleteSubscriber
- [ ] Client component: NewsletterActions (tlačítka s confirm)
- [ ] Export CSV API route
- [ ] Unsubscribe stránka `/odhlasit-newsletter`
- [ ] Unsubscribe link v email layout footeru
- [ ] Sidebar link na newsletter admin
- [ ] Ověřit build

## SOUBORY K ÚPRAVĚ

1. `src/app/(admin)/admin/newsletter/page.tsx` — NOVÝ
2. `src/app/(admin)/admin/newsletter/actions.ts` — NOVÝ
3. `src/app/(admin)/admin/newsletter/NewsletterActions.tsx` — NOVÝ
4. `src/app/api/admin/newsletter/export/route.ts` — NOVÝ
5. `src/app/(public)/odhlasit-newsletter/page.tsx` — NOVÝ
6. `src/lib/emails/layout.tsx` — přidat unsubscribe link do footeru
7. `src/components/admin/AdminSidebar.tsx` — přidat odkaz

## ODHAD: ~250 řádků nového kódu, 5 nových souborů + 2 úpravy
