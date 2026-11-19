# QA Report: Order detail auth — viewToken (Task #50)

**Datum:** 2026-11-11  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — vše implementováno správně**

---

## 1. Prisma model — viewToken na Order

**Soubor:** `prisma/schema.prisma` řádky 202, 222

- [x] `viewToken String?` — nullable pole na Order modelu — OK
- [x] `@@index([viewToken])` — index pro rychlé vyhledávání — OK

**Výsledek: PASS**

---

## 2. Generování viewToken při vytvoření objednávky

**Soubor:** `src/app/(public)/pokladna/actions.ts` řádky 132–136

```ts
const viewToken = crypto.randomUUID();
const order = await prisma.order.create({
  data: { orderNumber, viewToken, ... }
});
```

- [x] `crypto.randomUUID()` — kryptograficky bezpečný UUID — OK
- [x] Token uložen do DB při každém vytvoření objednávky — OK
- [x] Token předán do redirect URL po dokončení: `?new=1&token=${viewToken}` (transfer/cod) a `?new=1&fallback=1&token=${viewToken}` — OK

**Výsledek: PASS**

---

## 3. Auth check na /objednavka/[orderNumber]

**Soubor:** `src/app/(public)/objednavka/[orderNumber]/page.tsx` řádky 44–49

```ts
const hasValidToken = sp.token && order.viewToken && sp.token === order.viewToken;
if (!hasValidToken) {
  const user = await getCurrentUser();
  const isOwner = user && order.userId && user.id === order.userId;
  if (!isOwner) notFound();
}
```

- [x] Primární cesta: platný `?token=` v URL odpovídá `order.viewToken` — přístup povolen — OK
- [x] Fallback: přihlášený uživatel, jehož `user.id === order.userId` — přístup povolen — OK
- [x] Ostatní: `notFound()` — 404 response, žádné info leakage — OK
- [x] `searchParams` typovaný jako `Promise<{ ...; token?: string }>` — správně pro Next.js 15+ — OK
- [x] Guard: `order.viewToken &&` — ochrana před token match pokud je viewToken null — OK

**Výsledek: PASS**

---

## 4. Emaily obsahují viewToken v odkazech

Soubory: `src/lib/emails/order-confirmation.tsx`, `order-shipped.tsx`, `payment-received.tsx`, `order-delivered.tsx`

Vzor ve všech emailech:
```tsx
href={`https://qsport.cz/objednavka/${orderNumber}${viewToken ? `?token=${viewToken}` : ""}`}
```

- [x] `order-confirmation.tsx` — `viewToken?: string` prop, token v CTA odkazu — OK
- [x] `order-shipped.tsx` — `viewToken?: string` prop, token v "Sledovat objednávku" odkazu — OK
- [x] `payment-received.tsx` — `viewToken?: string` prop, token v CTA odkazu — OK
- [x] `order-delivered.tsx` — `viewToken?: string` prop, token v CTA odkazu — OK
- [x] Všechny emaily mají `viewToken` jako optional prop (nullable) — OK
- [x] Podmíněné přidání `?token=...` (ternary) — nepřidá prázdný param pokud token chybí — OK

Ověření, že admin actions předávají viewToken do emailů:  
`src/app/(admin)/admin/objednavky/[id]/actions.ts` řádky 51, 92:
```ts
viewToken: updatedOrder.viewToken || undefined,
viewToken: order.viewToken || undefined,
```
- [x] Shipped a delivered emaily dostávají viewToken z DB — OK

Comgate callback:  
`src/app/api/comgate/callback/route.ts` řádek 46:
```ts
viewToken: order.viewToken || undefined,
```
- [x] PaymentReceived email dostává viewToken — OK

**Výsledek: PASS**

---

## 5. Účet stránky linkují s tokenem

### /ucet (hlavní stránka)
**Soubor:** `src/app/(public)/ucet/page.tsx` řádek 94
```tsx
href={`/objednavka/${order.orderNumber}${order.viewToken ? `?token=${order.viewToken}` : ""}`}
```
- [x] Link na objednávku z hlavního účtu obsahuje viewToken — OK

### /ucet/objednavky
**Soubor:** `src/app/(public)/ucet/objednavky/page.tsx` řádek 86
```tsx
href={`/objednavka/${order.orderNumber}${order.viewToken ? `?token=${order.viewToken}` : ""}`}
```
- [x] Link na objednávku ze seznamu objednávek obsahuje viewToken — OK

**Výsledek: PASS**

---

## Souhrn

| Oblast | Status |
|--------|--------|
| Prisma model (viewToken, index) | PASS |
| Generování tokenu v createOrder (crypto.randomUUID) | PASS |
| Auth check (token NEBO logged-in owner, jinak notFound) | PASS |
| Emaily (order-confirmation, shipped, payment-received, delivered) | PASS |
| Účet stránky linkují s tokenem (/ucet + /ucet/objednavky) | PASS |

**Závěr:** viewToken auth je implementován kompletně a bezpečně. Přístup k detailu objednávky vyžaduje buď platný token nebo přihlášeného vlastníka. QA PASSED.
