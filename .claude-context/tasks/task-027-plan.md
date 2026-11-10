# TASK-027: Registrace + přihlášení + účet — Implementační plán

**Datum:** 2026-11-10
**Hlavní soubory:** Existující auth soubory + drobné úpravy

---

## Analýza aktuálního stavu

### Co UŽ FUNGUJE (kompletní implementace):

1. **Auth lib** (`src/lib/auth.ts`) — HOTOVO
   - `hashPassword()` — bcrypt s cost 12
   - `verifyPassword()` — bcrypt compare
   - `createSession()` — signed cookie `qsport_session`, HMAC-SHA256, 30 dní, httpOnly, secure, sameSite lax
   - `getCurrentUser()` — ověří cookie, načte uživatele z DB (select fields)
   - `destroySession()` — smaže cookie

2. **Registrace** (`src/app/(public)/registrace/page.tsx`) — HOTOVO
   - Server component s server action `registerUser`
   - Pole: jméno, příjmení, email, heslo, potvrzení hesla, newsletter checkbox
   - Validace: email+heslo povinné, heslo min 8 znaků, potvrzení shodné, email unique
   - Error handling přes redirect + searchParams
   - Redirect na /ucet po úspěchu
   - Redirect na /ucet pokud už přihlášen
   - Brand styling OK (navy/lime, pill buttons, input styles)

3. **Přihlášení** (`src/app/(public)/prihlaseni/page.tsx`) — HOTOVO
   - Server action `loginUser`
   - Email + heslo, validace
   - `lastLoginAt` update
   - Redirect parametr pro návrat po přihlášení
   - Error handling přes redirect + searchParams
   - Brand styling OK

4. **Účet dashboard** (`src/app/(public)/ucet/page.tsx`) — HOTOVO
   - Protected (redirect na login)
   - Welcome message s jménem
   - Quick stats (objednávky count, člen od)
   - Poslední objednávky (placeholder "Zatím žádné")
   - AccountNav sidebar

5. **AccountNav** (`src/components/AccountNav.tsx`) — HOTOVO
   - Přehled, Objednávky, Oblíbené, Údaje a adresa, Odhlásit
   - Active state highlighting
   - Responsive (row mobile, column desktop)

6. **Objednávky** (`src/app/(public)/ucet/objednavky/page.tsx`) — HOTOVO
   - Fetchuje orders kde userId = current
   - Zobrazuje karty s číslem, datem, statusy, cenou, item summary
   - Link na /objednavka/[orderNumber]
   - Empty state

7. **Oblíbené** (`src/app/(public)/ucet/oblibene/page.tsx`) — HOTOVO
   - Wishlist z DB s ProductCard komponentou
   - Empty state s CTA
   - Product count

8. **Údaje a adresa** (`src/app/(public)/ucet/udaje/page.tsx`) — HOTOVO
   - 3 formuláře: osobní údaje, doručovací adresa, změna hesla
   - Všechny s server actions
   - Success/error feedback přes searchParams
   - Email je readonly (zobrazuje se, nelze měnit)

9. **Odhlášení** (`src/app/(public)/ucet/odhlasit/route.ts`) — HOTOVO
   - POST route, destroySession(), redirect na /

10. **Prisma schema** — User model HOTOVO
    - id, email, passwordHash, firstName, lastName, phone, street, city, zip, newsletter, lastLoginAt
    - Relace: orders, wishlists, reviews

### Co CHYBÍ / vylepšit:

#### P1: Dashboard nezobrazuje reálný počet objednávek
- `ucet/page.tsx` řádek 48: hardcoded `<p>0</p>` místo reálného countu
- Potřeba: `prisma.order.count({ where: { userId: user.id } })`

#### P2: Dashboard nezobrazuje poslední objednávky
- Řádek 66: jen statický text "Zatím žádné objednávky."
- Potřeba: fetchnout posledních 3-5 objednávek a zobrazit

#### P3: Chybí `/ucet/objednavky/[id]` detail stránka
- Adresář existuje ale soubor NE (`find` ukázal jen adresář)
- Uživatel může kliknout z /ucet/objednavky → /objednavka/[orderNumber], ale nemá vlastní detail pod /ucet/

#### P4: "Nákup bez registrace" musí zůstat funkční
- Aktuálně: checkout v actions.ts volá `getCurrentUser()` a přiřazuje `userId: user?.id || null`
- Takže nákup BEZ přihlášení funguje (userId bude null). HOTOVO, nic měnit.

#### P5: Chybí "Zapomenuté heslo" flow
- Žádný link "Zapomněl jsi heslo?" na login stránce
- Žádný reset token mechanismus
- **Scope:** Toto je nice-to-have, může být další task

#### P6: Chybí metadata na dashboard
- `ucet/page.tsx` má metadata ✓
- `ucet/objednavky/page.tsx` má metadata ✓
- `ucet/oblibene/page.tsx` má metadata ✓
- `ucet/udaje/page.tsx` má metadata ✓
- Registrace + přihlášení mají metadata ✓
- **HOTOVO**

---

## Implementační kroky

### Krok 1: Dashboard — reálný order count
**Soubor: `src/app/(public)/ucet/page.tsx`**

Přidat Prisma query (za `getCurrentUser()` check):
```diff
 export default async function AccountPage() {
   const user = await getCurrentUser();
   if (!user) redirect("/prihlaseni?redirect=/ucet");

+  const [orderCount, recentOrders] = await Promise.all([
+    prisma.order.count({ where: { userId: user.id } }),
+    prisma.order.findMany({
+      where: { userId: user.id },
+      orderBy: { createdAt: "desc" },
+      take: 3,
+      include: { items: true },
+    }),
+  ]);
```

Přidat import prisma + formatPrice + order-constants nahoře:
```tsx
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-constants";
import type { OrderStatus } from "@/lib/order-constants";
```

### Krok 2: Dashboard — zobrazit reálný order count
**Soubor: `src/app/(public)/ucet/page.tsx`** (řádek ~48)

```diff
-              <p className="text-[28px] font-extrabold text-navy">0</p>
+              <p className="text-[28px] font-extrabold text-navy">{orderCount}</p>
```

### Krok 3: Dashboard — poslední objednávky
**Soubor: `src/app/(public)/ucet/page.tsx`** (řádek ~66)

Nahradit statický text:
```tsx
{recentOrders.length === 0 ? (
  <p className="text-[14px] text-muted">Zatím žádné objednávky.</p>
) : (
  <div className="space-y-3">
    {recentOrders.map((order) => {
      const status = order.status as OrderStatus;
      const statusColor = ORDER_STATUS_COLORS[status] || { bg: "bg-gray-100", text: "text-gray-700" };
      const date = new Date(order.createdAt).toLocaleDateString("cs-CZ", {
        day: "numeric",
        month: "short",
      });
      return (
        <a
          key={order.id}
          href={`/objednavka/${order.orderNumber}`}
          className="flex items-center justify-between py-2 border-b border-wash last:border-0 hover:bg-wash/50 -mx-2 px-2 rounded transition-colors"
        >
          <div>
            <span className="text-[14px] font-bold text-navy">#{order.orderNumber}</span>
            <span className="text-[13px] text-muted ml-2">{date}</span>
            <span className={`ml-2 inline-flex items-center h-[20px] px-2 text-[10px] font-bold uppercase rounded-full ${statusColor.bg} ${statusColor.text}`}>
              {ORDER_STATUS_LABELS[status] || order.status}
            </span>
          </div>
          <span className="text-[14px] font-bold text-ink">{formatPrice(order.total)}</span>
        </a>
      );
    })}
  </div>
)}
```

### Krok 4: Ověřit ucet/objednavky/[id] stránku
**Kontrola:** Adresář existuje ale nemá page.tsx.

Pro detail objednávky uživatel kliká na `/objednavka/[orderNumber]` (public page, ne pod /ucet/). Z /ucet/objednavky page linky vedou na `/objednavka/${order.orderNumber}` — toto funguje.

**NETVOŘIT** ucet/objednavky/[id]/page.tsx — stávající link na /objednavka/ je správný. Ale zkontrolovat, zda ten adresář obsahuje page.tsx:

```
src/app/(public)/ucet/objednavky/[id]/ — pokud prázdný, smazat adresář
```

**Implementátor:** Zkontrolovat a pokud je adresář prázdný, smazat.

---

## Soubory k úpravě

| # | Soubor | Změny |
|---|--------|-------|
| 1 | `src/app/(public)/ucet/page.tsx` | +prisma import, +order count/recent query, +reálný počet, +seznam objednávek |

**Plus:** Smazat prázdný adresář `src/app/(public)/ucet/objednavky/[id]/` pokud neobsahuje page.tsx.

---

## Co NEMĚNIT (už je hotové)

- Registrace page + server action — kompletní
- Přihlášení page + server action — kompletní
- Auth lib (hash, verify, session) — kompletní
- AccountNav — kompletní
- Údaje a adresa — kompletní
- Oblíbené — kompletní
- Objednávky list — kompletní
- Odhlášení — kompletní
- "Nákup bez registrace" — funguje (userId nullable v order)

---

## Pořadí implementace

1. `src/app/(public)/ucet/page.tsx` — přidat query + zobrazení (10 min)
2. Zkontrolovat/smazat prázdný [id] adresář
3. Build test: `npx next build`
4. Vizuální test: localhost:9999/ucet

**Rozsah:** Malý — ~40 řádků změn v 1 souboru. Auth flow je z 95% kompletní, chybí jen dashboard data.
