# QA Report — Task #37: Order timeline + interní komentáře
**Datum:** 2026-11-12  
**Kontrolor:** kontrolor agent  
**Verdict: PASS (s poznámkou k build chybě mimo scope)**

---

## Kontrolní body

### 1. TypeScript (`npx tsc --noEmit`)

**PASS** — 0 chyb.

### 2. `npm run build`

**FAIL — ale MIMO SCOPE Task #34.**

```
src/app/(public)/produkt/[slug]/page.tsx(298,9): error TS2322:
  Property 'category' does not exist on type 'IntrinsicAttributes & ProductTabsProps'.
```

- Chyba je v `ProductTabs` komponentě — caller předává `category` prop, interface ji nemá.
- Jedná se o bug z **Task #35** (Redesign produktové karty — in_progress u implementátora).
- Kód Order timeline tuto chybu nezpůsobuje.

### 3. `OrderEvent` model v `prisma/schema.prisma`

**PASS** — model na řádku 249-261:

```prisma
model OrderEvent {
  id        String   @id @default(cuid())
  orderId   String
  type      String
  title     String
  detail    String?
  userId    String?
  createdAt DateTime @default(now())
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
  @@map("order_events")
}
```

Obsahuje: `type`, `title`, `detail`, `userId`, `orderId`. ✓

### 4. `logOrderEvent()` v `src/lib/order-events.ts`

**PASS:**
- `OrderEventType` union type s 9 hodnotami: `status_change`, `payment`, `email_sent`, `email_failed`, `comment`, `tracking`, `note`, `supplier`, `system`
- `logOrderEvent({ orderId, type, title, detail?, userId? })` — správná signatura
- `detail` serialized jako JSON string do DB ✓

### 5. Server actions — každá akce loguje event

**PASS** — všech 6 funkcí volá `logOrderEvent`:

| Funkce | Typ eventu | Volá logOrderEvent |
|--------|-----------|---------------------|
| `updateOrderStatus` | `status_change` | ✓ |
| `updateTracking` | `tracking` | ✓ |
| `updateAdminNote` | `note` | ✓ |
| `markSupplierOrdered` | `supplier` | ✓ |
| `markSupplierReceived` | `supplier` | ✓ |
| `addComment` | `comment` | ✓ |

Všechny mají `await requireAdmin()` na prvním řádku ✓.

### 6. Timeline UI na admin order detail page

**PASS:**
- Shopify-style: levý border `border-l-2 border-gray-200`, tečky přes `OrderTimelineItem`
- Barevné tečky: `bg-blue-500` (status_change), `bg-green-500` (payment), `bg-purple-500` (email_sent), `bg-red-500` (email_failed), `bg-gray-700` (comment), `bg-indigo-500` (tracking), `bg-yellow-500` (note), `bg-orange-500` (supplier) ✓
- Komentářový formulář nad timeline, `form action={addComment}` ✓
- Timeline sekce: `page.tsx:477-516`

### 7. Stará `buildTimeline()` smazána

**PASS** — `grep -r "buildTimeline" src/` → 0 výskytů ✓

### 8. Admin poznámka v sidebaru

**PASS** — `updateAdminNote` formulář je v pravém sidebaru (`page.tsx:714-733`), ne v hlavním sloupci ✓

### 9. Prisma `include` s `events` a `orderBy: desc`

**PASS:**
```ts
events: { orderBy: { createdAt: "desc" } },
```
Na řádku `page.tsx:81` ✓

---

## Souhrn

| Kontrolní bod | Stav |
|---------------|------|
| npx tsc --noEmit | PASS |
| npm run build | FAIL (bug z Task #35, mimo scope) |
| OrderEvent model (type, title, detail, userId, orderId) | PASS |
| logOrderEvent() typed OrderEventType | PASS |
| updateOrderStatus loguje event | PASS |
| updateTracking loguje event | PASS |
| updateAdminNote loguje event | PASS |
| markSupplierOrdered loguje event | PASS |
| markSupplierReceived loguje event | PASS |
| addComment loguje event | PASS |
| Timeline UI — Shopify-style, barevné tečky | PASS |
| Komentářový formulář | PASS |
| buildTimeline() smazána | PASS |
| Admin poznámka v sidebaru | PASS |
| Prisma include events orderBy desc | PASS |

---

## Bug report (mimo scope Task #34)

**Soubor:** `src/app/(public)/produkt/[slug]/page.tsx:298`  
**Chyba:** `Property 'category' does not exist on type 'IntrinsicAttributes & ProductTabsProps'`  
**Příčina:** Implementátor Task #35 přidal `category` prop do calleru, ale ne do `ProductTabsProps` interface v `src/components/ProductTabs.tsx:6`  
**Dopad:** `npm run build` selže. Je nutné opravit před deploy.  
**Akce:** Nahlásit implementátorovi — dopsat `category?: string | null` do `ProductTabsProps` interface a do destrukturování.
