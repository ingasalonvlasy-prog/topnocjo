# QA Report — Task #20 Kolo 2: Server actions auth, OG, error boundaries, slevy, cross-sell

**Datum:** 2026-11-11  
**Kontrolor:** kontrolor agent  
**Verdict: CONDITIONAL PASS — 1 KRITICKÝ BUG (discounts export role check)**

---

## Výsledek buildu

- `npm run build` — PASS, 0 chyb, 0 warnings

---

## KRITICKÝ BUG: discounts export — špatné role jméno

**Soubor:** `src/app/api/admin/discounts/export/route.ts:14`

```ts
if (!user || user.role !== "ADMIN") {  // BUG: "ADMIN" vs "admin"
```

Všechny ostatní routes používají `"admin"` (lowercase), což odpovídá DB defaultu (`@default("admin")` v schema.prisma). Tato route **nikdy nepustí dál** — vždy vrátí 401 i přihlášenému adminovi.

**Fix:** Změnit `"ADMIN"` na `"admin"` na řádku 14.

---

## Task #14 — requireAdmin() v admin server actions

| Soubor | Počet funkcí | requireAdmin | Stav |
|--------|-------------|--------------|------|
| newsletter/actions.ts | 2 | 2x | PASS |
| produkty/actions.ts | 2 | 2x | PASS |
| slevy/actions.ts | 3 | 3x | PASS |
| recenze/actions.ts | 3 | 3x | PASS |
| objednavky/[id]/actions.ts | 5 | 5x | PASS |
| nastaveni/actions.ts | 4 | 4x | PASS |
| opustene-pokladny/actions.ts | 2 | 2x | PASS |

Všechny server actions mají `requireAdmin()` na prvním řádku každé funkce. **PASS.**

---

## Task #15 — OG metadata pro 11 statických stránek

Všech 11 stránek má `export const metadata`:

`/o-nas`, `/kontakt`, `/obchodni-podminky`, `/doprava-a-platba`, `/vraceni-zbozi`, `/reklamace`, `/cookies`, `/velikosti`, `/registrace`, `/prihlaseni`, `/znacky`

**PASS.**

---

## Task #16 — Error boundaries

| Soubor | Stav | Poznámka |
|--------|------|----------|
| `src/app/(admin)/admin/error.tsx` | PASS | `"use client"`, reset + Dashboard link |
| `src/app/(public)/error.tsx` | PASS | `"use client"`, reset + Hlavní stránka link |

Oba správně exportují default function s `error` a `reset` props. **PASS.**

---

## Task #17 — Slevy stránka upgrade

| Bod | Stav | Poznámka |
|-----|------|----------|
| Stat karty (3) | PASS | Aktivní, Celkem využití, Vypršelé |
| Export CSV link | PASS | Link na `/api/admin/discounts/export` |
| Export route auth | FAIL | `"ADMIN"` místo `"admin"` — viz kritický bug |
| Empty state | PASS | Hezký placeholder s ikonou a CTA |
| Stav badges | PASS | Neaktivní / Vypršel / Vyčerpán / Aktivní |

---

## Task #18 — Košík cross-sell

| Bod | Stav | Poznámka |
|-----|------|----------|
| `CrossSellProducts` komponenta | PASS | `src/components/CrossSellProducts.tsx` |
| `"use client"` | PASS | Správně, používá `useEffect`/`useState` |
| API endpoint | PASS | `/api/products/cross-sell` — 4 náhodné aktivní produkty se skladem |
| Integrováno do košíku | PASS | `<CrossSellProducts />` na konci `kosik/page.tsx` |
| Skrytí při 0 výsledcích | PASS | `if (products.length === 0) return null` |
| Error handling | PASS | `.catch(() => {})` tichý fallback |
| Responsivní grid | PASS | `grid-cols-2 lg:grid-cols-4` |

---

## Task #19 — Finance export link fix

`src/app/(admin)/admin/finance/page.tsx` řádek 361:
```tsx
<a href="/api/admin/orders/export" download>Export CSV</a>
```
Správný odkaz na auth-chráněný endpoint. **PASS.**

---

## Souhrn

| Task | Stav |
|------|------|
| #14 requireAdmin() | PASS |
| #15 OG metadata | PASS |
| #16 Error boundaries | PASS |
| #17 Slevy upgrade | PARTIAL (export route má bug) |
| #18 Cross-sell | PASS |
| #19 Finance export | PASS |

**Celkový výsledek: CONDITIONAL PASS** — build prošel čistě, ale discounts export route (`src/app/api/admin/discounts/export/route.ts:14`) má `"ADMIN"` místo `"admin"` a nikdy nepustí admina. Nutný fix před nasazením.

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
