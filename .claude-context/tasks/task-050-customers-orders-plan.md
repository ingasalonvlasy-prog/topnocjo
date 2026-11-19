# TASK-050: Import zakazniku a objednavek ze Shopify

## Rozsah

- **15,651 zakazniku** → `users` tabulka
- **89 objednavek** → `orders` + `order_items` tabulky
- Shopify REST Admin API 2024-01, token `(expired-removed)`

---

## CAST 1: Import zakazniku (15,651)

### Shopify Customers API

**Endpoint:** `GET /admin/api/2024-01/customers.json?limit=250`

**Relevantni pole z Shopify response:**

```json
{
  "id": 123456,
  "email": "jan@example.com",
  "first_name": "Jan",
  "last_name": "Novak",
  "phone": "+420777123456",
  "created_at": "2024-01-15T10:00:00+01:00",
  "updated_at": "2024-06-01T12:00:00+01:00",
  "orders_count": 3,
  "total_spent": "5490.00",
  "note": "VIP zakaznik",
  "tags": "vip,wholesale",
  "verified_email": true,
  "marketing_opt_in_level": "single_opt_in",
  "default_address": {
    "address1": "Vodickova 30",
    "city": "Praha",
    "zip": "110 00",
    "province": "",
    "country": "Czech Republic",
    "phone": "+420777123456"
  },
  "addresses": [...]
}
```

### Mapovani Shopify → DB (User model)

| Shopify pole | DB pole | Transformace |
|---|---|---|
| `email` | `email` | lowercase, trim |
| `first_name` | `firstName` | trim |
| `last_name` | `lastName` | trim |
| `phone` | `phone` | as-is (Shopify uz ma + prefix) |
| `default_address.address1` | `street` | trim |
| `default_address.city` | `city` | trim |
| `default_address.zip` | `zip` | trim |
| `marketing_opt_in_level` | `newsletter` | `!= null && != "unknown"` → true |
| `note` | `adminNote` | as-is |
| `created_at` | `createdAt` | parse ISO date |
| — | `passwordHash` | placeholder (viz nize) |
| — | `role` | `"customer"` (default) |

### Hesla — KRITICKE

Shopify NEEXPORTUJE hesla zakazniku. Reseni:

**Varianta A (DOPORUCENA): Placeholder hash + reset flow**
- Ulozit `passwordHash = "$IMPORTED$"` (specialni marker)
- Login flow: pokud `passwordHash === "$IMPORTED$"`, vzdy odmitne → redirect na reset hesla
- Zakaznik dostane email "Vitejte na novem Qsport.cz, nastavte si heslo"

**Varianta B: Random hash**
- Vygenerovat nahodny bcrypt hash pro kazdeho
- Zakaznik MUSI pouzit "Zapomenute heslo" pro pristup
- Nevyzaduje zmenu login flow

**Doporuceni: Varianta A** — explicitnejsi, login flow muze zobrazit hezkou hlasku "Vas ucet byl preveden z puvodniho eshopu, prosim nastavte si heslo."

### Email dedup

- Shopify muze mit zakazniky s duplicitnimi emaily (unlikely ale mozne)
- Nase DB ma `email @unique`
- Reseni: `upsert` na email — pokud existuje, updatni adresu/telefon, preskoc

### Pagination

- Cursor-based pres `Link` header (stejne jako produkty)
- 250/page → ~63 stran
- Rate limit 520ms → ~33 sekund

### Odhad API callu

- 15,651 / 250 = ~63 stran
- **~63 API callu, ~33 sekund**

---

## CAST 2: Import objednavek (89)

### Shopify Orders API

**Endpoint:** `GET /admin/api/2024-01/orders.json?limit=250&status=any`

DULEZITE: `status=any` — bez toho Shopify vraci jen otevrene objednavky!

**Relevantni pole z Shopify response:**

```json
{
  "id": 789012,
  "name": "#1042",
  "order_number": 1042,
  "email": "jan@example.com",
  "phone": "+420777123456",
  "created_at": "2024-03-15T14:30:00+01:00",
  "financial_status": "paid",
  "fulfillment_status": "fulfilled",
  "total_price": "3490.00",
  "subtotal_price": "3290.00",
  "total_discounts": "200.00",
  "total_shipping_price_set": { "shop_money": { "amount": "99.00" } },
  "discount_codes": [{ "code": "SLEVA10", "amount": "200.00", "type": "fixed_amount" }],
  "note": "Prosim zabalit jako darek",
  "billing_address": {
    "first_name": "Jan",
    "last_name": "Novak",
    "address1": "Vodickova 30",
    "city": "Praha",
    "zip": "110 00",
    "phone": "+420777123456"
  },
  "shipping_address": {
    "first_name": "Jan",
    "last_name": "Novak",
    "address1": "Vodickova 30",
    "city": "Praha",
    "zip": "110 00"
  },
  "line_items": [
    {
      "id": 456,
      "product_id": 111,
      "variant_id": 222,
      "title": "Nike Air Max 90",
      "variant_title": "42 / Cerna",
      "sku": "NAM90-42-BLK",
      "quantity": 1,
      "price": "3290.00"
    }
  ],
  "customer": {
    "id": 123456,
    "email": "jan@example.com"
  }
}
```

### Mapovani Shopify → DB (Order model)

| Shopify pole | DB pole | Transformace |
|---|---|---|
| `name` (#1042) | `orderNumber` | strip `#`, prefix `S` → `"S1042"` (viz nize) |
| `financial_status` + `fulfillment_status` | `status` | mapovaci tabulka |
| `email` | `email` | as-is |
| `phone` | `phone` | as-is |
| `billing_address.first_name` | `firstName` | trim |
| `billing_address.last_name` | `lastName` | trim |
| `billing_address.address1` | `street` | trim |
| `billing_address.city` | `city` | trim |
| `billing_address.zip` | `zip` | trim |
| `shipping_address.*` | `shippingName/Street/City/Zip` | trim |
| `subtotal_price` | `subtotal` | `Math.round(parseFloat() * 100)` → halere |
| `total_discounts` | `discountAmount` | `Math.round(parseFloat() * 100)` → halere |
| `total_shipping_price_set.shop_money.amount` | `shippingPrice` | `Math.round(parseFloat() * 100)` → halere |
| `total_price` | `total` | `Math.round(parseFloat() * 100)` → halere |
| `discount_codes[0].code` | `discountCode` | first code or null |
| `note` | `note` | as-is |
| `created_at` | `createdAt` | parse ISO |
| `customer.email` | `userId` | lookup User by email |
| — | `paymentMethod` | `"shopify"` (historicke) |
| — | `paymentStatus` | viz mapovani nize |
| — | `shippingId` | dummy "imported" shipping method (viz nize) |
| — | `viewToken` | generate `crypto.randomUUID()` |

### Order Number strategie — KRITICKE

Aktualni system generuje sekvencni cisla od 1001. Shopify objednavky maji vlastni cisla (napr. #1042). **Nesmi dojit ke kolizi.**

**Reseni: Prefix `S` pro Shopify objednavky**
- Shopify #1042 → `"S1042"` v DB
- Nove objednavky pokracuji od 1001+ (nebo od maxima existujicich)
- `orderNumber` je `@unique` String — `"S1042"` nikdy nekoliduje s `"1042"`

Alternativa: Pouzit cisla 1-89 (pod 1001 threshold). Ale prefix je cistejsi a jasneji identifikuje puvod.

### Status mapovani

```typescript
function mapShopifyStatus(
  financialStatus: string,
  fulfillmentStatus: string | null
): { status: OrderStatus; paymentStatus: PaymentStatus } {
  // Payment status
  let paymentStatus: PaymentStatus;
  switch (financialStatus) {
    case "paid": paymentStatus = "PAID"; break;
    case "refunded":
    case "partially_refunded": paymentStatus = "REFUNDED"; break;
    case "voided": paymentStatus = "CANCELLED"; break;
    default: paymentStatus = "PENDING"; break; // pending, authorized, unpaid
  }

  // Order status
  let status: OrderStatus;
  if (fulfillmentStatus === "fulfilled") {
    status = "DELIVERED";
  } else if (fulfillmentStatus === "partial") {
    status = "SHIPPED";
  } else if (financialStatus === "refunded" || financialStatus === "voided") {
    status = "CANCELLED";
  } else if (financialStatus === "paid") {
    status = "CONFIRMED";
  } else {
    status = "NEW";
  }

  return { status, paymentStatus };
}
```

### Shipping method pro importovane objednavky

DB vyzaduje `shippingId` (FK na ShippingMethod). Importovane objednavky nemaji odpovidajici lokalni shipping method.

**Reseni:** Vytvorit dummy shipping method pred importem:

```typescript
const importedShipping = await prisma.shippingMethod.upsert({
  where: { code: "shopify-imported" },
  update: {},
  create: {
    name: "Shopify (importováno)",
    code: "shopify-imported",
    description: "Historická doprava z původního Shopify eshopu",
    price: 0,
    active: false,  // nechceme aby se zobrazovala v checkout
    position: 999,
  },
});
```

### Order Items mapovani

| Shopify pole | DB pole | Transformace |
|---|---|---|
| `line_items[].product_id` | `productId` | lookup pres `sourceId` → Product.id (nullable) |
| `line_items[].variant_id` | `variantId` | lookup pres SKU (nullable) |
| `line_items[].title` | `productName` | as-is |
| `line_items[].variant_title` | `variantTitle` | as-is, fallback "" |
| `line_items[].sku` | `sku` | as-is |
| `line_items[].quantity` | `quantity` | as-is |
| `line_items[].price` | `unitPrice` | `Math.round(parseFloat() * 100)` → halere |
| — | `totalPrice` | `unitPrice * quantity` |

### Propojeni Order → User

- Shopify order ma `customer.email`
- Po importu zakazniku: `prisma.user.findUnique({ where: { email } })` → `userId`
- Pokud zakaznik neexistuje (napr. guest checkout): `userId = null`

### Date fields z Shopify

```typescript
// Timestamps to extract:
// created_at → createdAt
// closed_at → pokud fulfilled → deliveredAt
// cancelled_at → cancelledAt
// Shopify nema shippedAt explicitne — pouzit fulfillment.created_at pokud potreba
```

Pro `paidAt`: Shopify nema primarne `paid_at` pole. Reseni:
- Pokud `financial_status === "paid"` → `paidAt = new Date(created_at)` (priblizne)
- Nebo fetch transactions per order (zbytecne pro 89 objednavek)

### Pagination

- 89 objednavek = 1 stranka (250/page)
- **1 API call**

---

## CAST 3: Implementacni plan

### Novy skript: `scripts/import-shopify-customers-orders.ts`

```
Phase 0: Setup
  - Prisma client init (PrismaLibSql adapter)
  - Vytvorit dummy shipping method "shopify-imported"

Phase 1: Import zakazniku (15,651)
  - Cursor-based pagination GET /customers.json?limit=250
  - Pro kazdeho zakaznika:
    - Skip pokud email je prazdny/null
    - Upsert User na email (existujici updatne adresu, novy vytvori)
    - passwordHash = "$IMPORTED$" (placeholder)
    - Logovat progress kazdych 500
  - Ulozit Map<shopifyCustomerId, dbUserId> pro order linking

Phase 2: Import objednavek (89)
  - GET /orders.json?limit=250&status=any
  - Pro kazdou objednavku:
    a. Map status (financial + fulfillment → OrderStatus + PaymentStatus)
    b. Lookup userId pres customer.email → User
    c. Generate viewToken
    d. Create Order s `orderNumber: "S${order.order_number}"`
    e. Pro kazdy line_item:
       - Lookup Product pres sourceId = String(product_id)
       - Lookup Variant pres SKU (best effort, nullable)
       - Create OrderItem
    f. Create OrderEvent type="IMPORT" pro audit trail

Phase 3: Summary
  - Logovat: kolik zakazniku importovano/skipnuto/updatnuto
  - Logovat: kolik objednavek importovano
  - Logovat: kolik order items propojeno s produkty vs orphaned
```

### Sdileny kod

Duplikovat utility z `import-shopify.ts`:
- `shopifyFetch<T>()` s rate limiting a Link header parsing
- `slugify()` (pokud potreba)
- Prisma client setup

### Error handling

- **Zakaznik bez emailu** → skip, logovat warning
- **Duplicitni email** → upsert (update existujiciho)
- **Objednavka s neexistujicim produktem** → `productId: null` v OrderItem (uchovame productName)
- **Objednavka bez billing_address** → fallback na shipping_address, pak na customer data

### Runtime odhad

| Faze | API callu | Cas |
|---|---|---|
| Customers | ~63 | ~33s |
| Orders | 1 | ~1s |
| **Celkem** | **~64** | **~35s** |

### Ocekavany vysledek

| Entita | Pred | Po |
|---|---|---|
| Users | ~0 (jen admin) | ~15,652 |
| Orders | 0 | 89 |
| OrderItems | 0 | ~150-300 (odhad) |

---

## CAST 4: Login flow uprava

### Potrebna zmena v autentizaci

Po importu zakazniku s `passwordHash = "$IMPORTED$"` je treba upravit login:

**Soubor:** `src/app/(public)/ucet/actions.ts` (nebo kde je login action)

```typescript
// Po password verify:
if (user.passwordHash === "$IMPORTED$") {
  // Redirect na reset hesla s hlaskou
  return { error: "imported_account" };
}
```

**UI:** Na login strance zobrazit hlasku:
> "Vas ucet byl preveden z puvodniho eshopu. Pro pristup si prosim nastavte nove heslo."
> [Tlacitko: Nastavit heslo]

**Toto je JEDINA zmena v existujicim kodu** — vse ostatni je novy skript.

---

## CAST 5: Rizika a edge cases

1. **Shopify token expirace** — otestovat pred spustenim. Pokud expired, uzivatel musi vygenerovat novy.

2. **Order number kolize** — prefix `S` eliminuje. generateOrderNumber() hleda pattern `/^(\d+)$/` — `"S1042"` neodpovida → neovlivni sekvenci.

3. **Guest checkout objednavky** — Shopify muze mit objednavky bez `customer` objektu. `userId` bude null, email z objednavky se pouzije primo.

4. **ShippingMethod FK** — kazda Order MUSI mit `shippingId`. Dummy "shopify-imported" method to resi.

5. **Ceny v halerech** — VSECHNY ceny z Shopify (string "3490.00") musi byt `* 100` na halere. Konzistentni s TASK-048 price fix planem.

6. **Zakaznici bez objednavek** — 15,651 zakazniku ale jen 89 objednavek. Vetsina zakazniku nebude mit zadnou objednavku. To je OK — jsou v DB pro budouci marketing/newsletter.

---

## Poradi implementace

1. Spustit skript `scripts/import-shopify-customers-orders.ts`
2. Verifikovat: `SELECT COUNT(*) FROM users WHERE passwordHash = '$IMPORTED$'` — ~15,651
3. Verifikovat: `SELECT COUNT(*) FROM orders WHERE orderNumber LIKE 'S%'` — 89
4. Upravit login flow pro `$IMPORTED$` hesla
5. Test: zkusit se prihlasit importovanym emailem → redirect na reset
