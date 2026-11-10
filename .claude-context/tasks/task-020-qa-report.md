# QA Report — Task #20: Checkout + Comgate + Košík

**Datum:** 2026-11-08  
**Kontrolor:** kontrolor agent  
**Verdict: NESCHVÁLENO — 1 BLOCKER**

---

## Výsledky kontrol

### TypeScript — PASS
`npx tsc --noEmit` → 0 errors.

---

### HTTP Status stránek — PARTIAL PASS
| Stránka | Status | Výsledek |
|---|---|---|
| `/kosik` | 200 | PASS |
| `/pokladna` | 200 | PASS |
| `/api/shipping` | 200 | PASS |
| `/objednavka/[orderNumber]` | **500** | **FAIL — BLOCKER** |

---

## BLOCKER: /objednavka/[orderNumber] vrací 500

**Chyba z RSC payload:**
```
TypeError: Cannot read properties of undefined (reading 'findUnique')
  at OrderConfirmationPage — objednavka/[orderNumber]/page.tsx:72
  digest: "958280641"
```

**Příčina:** `prisma.order` je `undefined` za runtime v Next.js server context.

`prisma/schema.prisma` generator block:
```prisma
generator client {
  provider = "prisma-client-js"
}
```

Chybí `previewFeatures = ["driverAdapters"]` — Prisma 7 + `@prisma/adapter-libsql` to vyžaduje pro správnou inicializaci v Next.js server context. Ostatní stránky fungují protože jejich modely byly v klientu dříve nebo mají jiný inicializační timing.

Druhá možná příčina: `Order` model byl přidán do schema ale Prisma client nebyl regenerován po přidání (`npx prisma generate`), dev server běží se starým klientem.

**Fix:**
1. Do `prisma/schema.prisma` generator bloku přidat: `previewFeatures = ["driverAdapters"]`
2. Spustit `npx prisma generate`
3. Restartovat dev server
4. Re-test `/objednavka/[orderNumber]`

---

## Kód review

### CartContext — PASS
- `src/lib/cart.tsx` — `"use client"` ✓
- SSR-safe: `typeof window === "undefined"` guard v `loadCart` ✓
- Hydration safe: `loaded` flag v `useEffect` ✓
- `MAX_QTY = 10` ✓
- Všechny operace: `addItem`, `updateQuantity`, `removeItem`, `clearCart` ✓
- `updateQuantity(id, 0)` → auto-remove ✓

### Košík /kosik — PASS
- `"use client"` ✓
- Free shipping progress bar (threshold 200000 haléřů = 2000 Kč) ✓
- Qty +/- funkční, delete button ✓
- Empty state s CTA ✓
- Souhrn s odhadovanou dopravou ✓

### Header badge — PASS
- `Header.tsx` importuje `useCart`, `itemCount > 0` zobrazí badge ✓
- Truncace na `9+` ✓
- Desktop i mobile ✓

### ProductActions + AddToCartButton — PASS
- `ProductActions.tsx`: size chipy, out-of-stock disabled + line-through ✓
- Prvotní výběr: `firstInStock` varianta ✓
- `AddToCartButton.tsx`: `"use client"`, `added` state, 2s reset, checkmark ikona + "Přidáno" ✓

### Checkout /pokladna — PASS
- `"use client"` ✓
- Shipping fetch z `/api/shipping` v `useEffect` ✓
- Prázdný košík → redirect na homepage ✓
- Error handling: Next.js redirect digest propagace ✓
- `clearCart()` po úspěšné objednávce (před redirect) ✓
- 5 sekcí: kontakt, fakturační adresa, doprava, platba, poznámka ✓

### createOrder server action — PASS
- `"use server"` ✓
- Validace variant a stock ✓
- `generateOrderNumber()` → formát `QS-YYYYMMDD-XXXX` ✓
- Stock decrement po vytvoření objednávky ✓
- Comgate redirect pro card, fallback na transfer při chybě ✓
- `redirect()` ve správném flow (mimo try-catch přes digest check) ✓

### Comgate /api/comgate/callback — PASS
- POST handler ✓
- Verifikace přes `getPaymentStatus(transId)` — push data se nikdy nedůvěřují přímo ✓
- Idempotentní: `paymentStatus !== "PAID"` guard ✓
- Returns `200 OK` pro Comgate acknowledgement ✓

### ClearCart — PASS
- `"use client"`, `useEffect(() => clearCart(), [clearCart])`, vrací `null` ✓
- Volá se pouze pokud `isNew === "1"` ✓

### Prisma schema — PASS
- `Order` model: všechna pole, `@@index` na status/email/createdAt/comgateTransId/userId ✓
- `OrderItem` s `onDelete: Cascade` ✓
- `ShippingMethod.orders Order[]` back-relation ✓

### /api/shipping — PASS
- GET handler, `active: true` filter, `orderBy: position` ✓
- Select pouze potřebná pole ✓

### Security review — PASS
- Žádné hardcoded credentials ✓
- Comgate secret z `process.env.COMGATE_SECRET` ✓
- Žádné SQL injection (Prisma ORM) ✓
- Žádné XSS — React automaticky escapuje, žádný `dangerouslySetInnerHTML` v checkout flow ✓
- Input validace: `.trim()` na všech polích, `required` atributy ✓

---

## Závěr

**12 z 13 kontrol: PASS**  
**1 blocker:** `/objednavka/[orderNumber]` → 500 (prisma.order undefined)

Po aplikaci fixu (previewFeatures + prisma generate + restart) doporučuji re-test pouze `/objednavka/QS-*` URL.
