# TASK-039: Admin Auth — proxy.ts + role kontrola

## Přehled

Admin panel (`/admin/*`) je aktuálně přístupný KOMUKOLIV bez přihlášení.
Celý flow neexistuje — žádný proxy.ts, žádná role v User modelu, žádná kontrola v admin layoutu.

**Priorita: KRITICKÁ — musí se opravit před deployem.**

---

## FÁZE 1: Prisma schema — přidání role do User modelu

### Soubor: `prisma/schema.prisma`

**Přidat do modelu User:**
```prisma
model User {
  // ... stávající fieldy ...
  role         String          @default("customer")   // <-- NOVÝ
  // ...
}
```

Hodnoty role: `"customer"` (výchozí), `"admin"`

**Po úpravě:**
```bash
npx prisma db push
```

**Označení prvního admina:**
```bash
npx prisma db execute --stdin <<< "UPDATE users SET role = 'admin' WHERE email = 'testchrome@hairland.cz';"
```
POZOR: Zatím není jasný admin email pro Qsport — ověřit s uživatelem. Pokud neexistuje admin účet, vytvořit seed script.

---

## FÁZE 2: Auth helper — isAdmin funkce

### Soubor: `src/lib/auth.ts`

**Přidat `role` do select v getCurrentUser (řádek 58-69):**

Aktuální select:
```ts
select: {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  street: true,
  city: true,
  zip: true,
  newsletter: true,
  createdAt: true,
},
```

Změnit na:
```ts
select: {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  street: true,
  city: true,
  zip: true,
  newsletter: true,
  createdAt: true,
  role: true,        // <-- NOVÝ
},
```

**Přidat novou funkci (na konec souboru):**

```ts
export async function requireAdmin(): Promise<{ id: string; email: string; role: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/prihlaseni?redirect=/admin");
  }
  return user;
}
```

Import `redirect` z `next/navigation` na začátku souboru (pokud ještě není).

---

## FÁZE 3: proxy.ts — middleware ochrana

### Soubor: `proxy.ts` (kořen projektu, vedle next.config.ts)

**KRITICKY DŮLEŽITÉ pro Next.js 16:**
- Soubor se jmenuje `proxy.ts` (NE middleware.ts)
- Exportuje `function proxy` (NE export default)
- Matcher config je standardní

```ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chráníme /admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("qsport_session");

    if (!sessionCookie?.value) {
      const loginUrl = new URL("/prihlaseni", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Proxy nemůže ověřit HMAC podpis (potřebuje async DB query pro roli).
    // Skutečná role kontrola je v admin layout.tsx (server component).
    // Proxy jen kontroluje přítomnost session cookie jako první vrstvu.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

**Poznámka k designu:**
- proxy.ts je edge middleware — nemá přístup k Prisma (SQLite) ani async DB queries
- Proto kontroluje jen PŘÍTOMNOST cookie (ne validitu)
- Skutečná autorizace (role check) je v admin layout.tsx (FÁZE 4)
- Toto je standardní dvouvrstvý vzor: middleware = rychlý gate, layout = plná autorizace

---

## FÁZE 4: Admin Layout — server-side auth check

### Soubor: `src/app/(admin)/layout.tsx`

**Aktuální obsah (16 řádků, ŽÁDNÁ auth kontrola):**
```tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { prisma } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const newOrderCount = await prisma.order.count({ where: { status: "NEW" } });

  return (
    <>
      <AdminSidebar newOrderCount={newOrderCount} />
      <div className="lg:ml-60 min-h-screen bg-gray-50">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </>
  );
}
```

**Nový obsah:**
```tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // Redirect na /prihlaseni pokud není admin

  const newOrderCount = await prisma.order.count({ where: { status: "NEW" } });

  return (
    <>
      <AdminSidebar newOrderCount={newOrderCount} />
      <div className="lg:ml-60 min-h-screen bg-gray-50">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </>
  );
}
```

---

## FÁZE 5: Admin login UX

### Soubor: `src/app/(public)/prihlaseni/page.tsx`

Přihlašovací stránka už existuje a funguje. Po přidání role do User modelu je potřeba:

1. **Redirect po přihlášení admina:**
   Stávající `loginUser` server action na řádku 24 má `redirect(redir || "/ucet")`.
   Pokud `redir` je `/admin`, přesměruje na admin — TO UŽ FUNGUJE.
   Proxy.ts nastaví `?redirect=/admin`, takže flow je:
   - Nepřihlášený → `/admin` → proxy redirect → `/prihlaseni?redirect=/admin`
   - Login → redirect na `/admin` → admin layout ověří roli → OK nebo redirect zpět

2. **Chybová zpráva pro ne-adminy:**
   Pokud se zákazník přihlásí a přijde na admin, `requireAdmin()` ho redirectne na `/prihlaseni?redirect=/admin`.
   Přidáme nový error typ pro tento případ:

   V `prihlaseni/page.tsx`, rozšířit error messages:
   ```tsx
   {error === "missing"
     ? "Vyplň e-mail a heslo."
     : error === "noadmin"
     ? "Nemáte oprávnění k přístupu do administrace."
     : "Nesprávný e-mail nebo heslo."}
   ```

   A v `requireAdmin()` v auth.ts:
   ```ts
   if (!user) {
     redirect("/prihlaseni?redirect=/admin");
   }
   if (user.role !== "admin") {
     redirect("/prihlaseni?error=noadmin&redirect=/admin");
   }
   ```

---

## FÁZE 6: Session secret — odstranit hardcoded fallback

### Soubor: `src/lib/auth.ts`

**Aktuální (řádek 9-11):**
```ts
function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-fallback-secret-change-me";
}
```

**Nový:**
```ts
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    return "dev-fallback-secret-change-me";
  }
  return secret;
}
```

Toto zajistí:
- V produkci MUSÍ být nastavena env proměnná — jinak crash (bezpečné)
- V dev prostředí funguje fallback jako doteď

---

## KONTROLNÍ SEZNAM PRO IMPLEMENTÁTORA

- [ ] Přidat `role String @default("customer")` do User v schema.prisma
- [ ] `npx prisma db push`
- [ ] Přidat `role: true` do select v getCurrentUser
- [ ] Vytvořit `requireAdmin()` funkci v auth.ts
- [ ] Vytvořit `proxy.ts` v kořenu projektu
- [ ] Upravit admin layout.tsx — přidat `await requireAdmin()`
- [ ] Rozšířit chybové zprávy na přihlašovací stránce
- [ ] Opravit session secret fallback
- [ ] Označit min. 1 uživatele jako admin v DB
- [ ] Ověřit build: `npm run build` (žádné TS chyby)
- [ ] Otestovat: nepřihlášený → /admin → redirect na přihlášení
- [ ] Otestovat: zákazník → /admin → "nemáte oprávnění"
- [ ] Otestovat: admin → /admin → normální přístup

## ODHAD ROZSAHU

~60 řádků nového kódu + úpravy ve 4 souborech + 1 nový soubor (proxy.ts)
