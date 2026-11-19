# TASK-042: Admin API auth ochrana — Implementační plán

## Aktuální stav

### UŽ HOTOVO (neimplementovat znovu):
- `role` field v User modelu (`prisma/schema.prisma:165`) ✅
- `requireAdmin()` v `src/lib/auth.ts:89-98` ✅
- `getCurrentUser()` vrací `role` field (`src/lib/auth.ts:77`) ✅
- `proxy.ts` v kořenu projektu — kontroluje session cookie pro `/admin/*` ✅
- Admin layout.tsx volá `await requireAdmin()` (`src/app/(admin)/layout.tsx:6`) ✅
- Session secret s production check (`src/lib/auth.ts:10-19`) ✅
- Error message "noadmin" v requireAdmin (`src/lib/auth.ts:95`) ✅

### PROBLÉM: API routes NEMAJÍ auth!

Následující admin API endpointy jsou veřejně přístupné — kdokoliv může stáhnout data:

| Route | Soubor | Problém |
|-------|--------|---------|
| `GET /api/admin/orders/export` | `src/app/api/admin/orders/export/route.ts` | Žádná auth kontrola! Export objednávek s osobními údaji |
| `GET /api/admin/customers/export` | `src/app/api/admin/customers/export/route.ts` | Žádná auth kontrola! Export zákazníků s emaily, adresami |
| `POST /api/admin/zasilkovna/test` | `src/app/api/admin/zasilkovna/test/route.ts` | Žádná auth kontrola! Testování API klíčů |

**Závažnost: KRITICKÁ** — osobní údaje zákazníků (emaily, telefony, adresy, objednávky) jsou dostupné bez přihlášení.

**POZNÁMKA:** `proxy.ts` kontroluje cookie jen pro `/admin/*` page routes, NE pro `/api/admin/*` routes. API routes jsou úplně nechráněné.

---

## IMPLEMENTACE: Přidat requireAdmin() do všech admin API routes

### 1. `src/app/api/admin/orders/export/route.ts`

**Aktuální kód (řádek 10):**
```ts
export async function GET(request: NextRequest) {
```

**Změna — přidat na začátek funkce:**
```ts
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await requireAdmin();
  // ... rest zůstává
```

**POZOR:** `requireAdmin()` volá `redirect()` pokud není admin. V API route handler to vyhodí NEXT_REDIRECT error, což Next.js zachytí a vrátí redirect response. Toto funguje, ale čistější je:

```ts
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest
```

**DOPORUČENÍ:** Použít `getCurrentUser()` + manuální 401 response v API routes (čistější REST API pattern). `requireAdmin()` s redirect je vhodný pro page components, ne API.

### 2. `src/app/api/admin/customers/export/route.ts`

**Aktuální kód (řádek 4):**
```ts
export async function GET() {
```

**Změna:**
```ts
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest zůstává
```

### 3. `src/app/api/admin/zasilkovna/test/route.ts`

**Aktuální kód (řádek 4):**
```ts
export async function POST(req: NextRequest) {
```

**Změna:**
```ts
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest zůstává
```

---

## BONUS: Aktualizovat proxy.ts matcher

**Volitelné:** Rozšířit proxy.ts matcher aby chytil i `/api/admin/*` routes:

```ts
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

A v proxy funkci:
```ts
if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
  const sessionCookie = request.cookies.get("qsport_session");
  if (!sessionCookie?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/prihlaseni", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}
```

**POZNÁMKA:** Proxy je jen první vrstva (kontroluje cookie přítomnost). Skutečná role kontrola je v getCurrentUser() v route handleru. Proxy rozšíření je nice-to-have ale ne nutné — hlavní je auth v route handlerech.

---

## KONTROLNÍ SEZNAM

- [ ] `src/app/api/admin/orders/export/route.ts` — přidat auth check (getCurrentUser + 401)
- [ ] `src/app/api/admin/customers/export/route.ts` — přidat auth check
- [ ] `src/app/api/admin/zasilkovna/test/route.ts` — přidat auth check
- [ ] (Volitelné) Rozšířit `proxy.ts` matcher na `/api/admin/*`
- [ ] Nové API routes z dalších tasků (newsletter export, products export) — MUSÍ mít auth od začátku
- [ ] Ověřit `npm run build`
- [ ] Otestovat: nepřihlášený GET `/api/admin/orders/export` → 401
- [ ] Otestovat: nepřihlášený GET `/api/admin/customers/export` → 401
- [ ] Otestovat: admin GET `/api/admin/orders/export` → CSV download OK

## SOUBORY K ÚPRAVĚ

1. `src/app/api/admin/orders/export/route.ts` — přidat 4 řádky (import + check)
2. `src/app/api/admin/customers/export/route.ts` — přidat 4 řádky
3. `src/app/api/admin/zasilkovna/test/route.ts` — přidat 4 řádky
4. (Volitelné) `proxy.ts` — rozšířit matcher

## ROZSAH: ~15 řádků nového kódu (3 soubory × 5 řádků)
