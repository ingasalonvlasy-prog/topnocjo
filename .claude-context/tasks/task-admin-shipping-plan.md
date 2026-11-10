# Plan: Admin Panel Expansion + Shipping

**Status:** Ready for implementation
**Priority:** High
**Date:** 2026-11-08

---

## Current State Audit

### Admin Panel — What EXISTS and WORKS:
| Page | Path | Status |
|------|------|--------|
| Dashboard | `/admin` | **Functional** — stats, quick actions, brand overview |
| Produkty — list | `/admin/produkty` | **Functional** — search, filter (status/brand), pagination, table |
| Produkty — detail | `/admin/produkty/[id]` | **Functional** — edit form (name, desc, body, status, brand, type, SEO), photo gallery (read-only), variant table (read-only), categories (read-only checkboxes) |
| Kategorie | `/admin/kategorie` | **Functional** — read-only table (position, name, slug, parent, product count) |
| Objednavky | `/admin/objednavky` | **Placeholder** — "pripravuje se" |
| Zakaznici | `/admin/zakaznici` | **Placeholder** — "pripravuje se" |
| Slevy | `/admin/slevy` | **Placeholder** — "pripravuje se" |
| Analytika | `/admin/analytika` | **Placeholder** — "pripravuje se" |
| Nastaveni | `/admin/nastaveni` | **Placeholder** — read-only info (store name, email, tech info) |

### Admin Panel — What's MISSING:
1. **Category CRUD** — read-only table, no create/edit/delete/reorder
2. **Brand CRUD** — only visible on dashboard, no dedicated management page
3. **Product create** — only edit existing, no "Add product" flow
4. **Variant edit** — read-only table in product detail
5. **Photo upload** — "Upload bude dostupny v dalsi verzi"
6. **Category assignment on product** — disabled checkboxes
7. **Shipping config** — no shipping management at all
8. **Order management** — placeholder (blocked by checkout)
9. **Customers** — placeholder (blocked by auth/registration)

**NOTE:** Blog CRUD is in admin panel — user writes articles directly in admin (Marketing section).

### Sidebar Navigation (AdminSidebar.tsx):
- Dashboard
- Prodej: Objednavky
- Katalog: Produkty, Kategorie
- Zakaznici: Zakaznici
- Marketing: Blog, Slevy, Analytika
- (bottom) Nastaveni, Zobrazit e-shop

### Prisma Schema — Current Models:
Brand, Category, Product, Variant, ProductCategory, BlogPost

### Missing Prisma Models (needed for this plan):
- `Order`, `OrderItem` — for order management
- `ShippingMethod` — for configurable shipping

---

## Implementation Plan

### Phase A: Shipping + Order Schema (PRIORITY — user requested)

#### A1. Prisma Schema — All New Models

Add to `prisma/schema.prisma`:

```prisma
model ShippingMethod {
  id          String   @id @default(cuid())
  name        String                          // "Zasilkovna" | "GLS" | "Osobni vyzvednuti"
  code        String   @unique                // "zasilkovna" | "gls" | "pickup"
  description String?
  price       Int      @default(0)            // in CZK whole numbers
  freeFrom    Int?                            // free shipping threshold (e.g. 2000)
  active      Boolean  @default(true)
  position    Int      @default(0)
  config      String   @default("{}")         // JSON — provider-specific config
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  orders      Order[]

  @@map("shipping_methods")
}

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique              // "QS-20261108-0001"
  status          String      @default("NEW")      // NEW, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
  email           String
  phone           String?
  // Billing
  firstName       String
  lastName        String
  street          String
  city            String
  zip             String
  // Shipping (can differ from billing)
  shippingName    String?
  shippingStreet  String?
  shippingCity    String?
  shippingZip     String?
  // Shipping method
  shippingId      String
  shipping        ShippingMethod @relation(fields: [shippingId], references: [id])
  shippingPrice   Int            @default(0)       // actual shipping cost at time of order
  // Zasilkovna specific
  packetaPointId  String?                          // selected pickup point ID
  packetaPointName String?                         // pickup point display name
  // Payment
  paymentMethod   String       @default("card")    // "card" | "transfer"
  paymentStatus   String       @default("PENDING") // PENDING, PAID, REFUNDED
  // Totals
  subtotal        Int          @default(0)         // sum of items (no shipping)
  total           Int          @default(0)         // subtotal + shippingPrice
  // Notes
  note            String?                          // customer note
  adminNote       String?                          // internal note
  // Tracking
  trackingNumber  String?
  trackingUrl     String?
  // Timestamps
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  paidAt          DateTime?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  cancelledAt     DateTime?
  items           OrderItem[]

  @@index([status])
  @@index([email])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId    String?                          // nullable — product may be deleted later
  variantId    String?                          // nullable — variant may be deleted later
  productName  String                           // snapshot at order time
  variantTitle String                           // snapshot: "42" or "M / Black"
  sku          String?
  quantity     Int     @default(1)
  unitPrice    Int                              // price per item at order time
  totalPrice   Int                              // unitPrice * quantity

  @@index([orderId])
  @@map("order_items")
}
```

**Design decisions:**
- OrderItem stores **snapshots** of product/variant data (name, title, price) so orders remain accurate even if products change or are deleted
- `productId`/`variantId` are nullable — soft reference, not a foreign key cascade
- `shippingPrice` on Order is the actual price charged (may differ from ShippingMethod.price due to free shipping threshold)
- `packetaPointId`/`packetaPointName` — Zásilkovna-specific fields directly on Order (simpler than a separate table for one provider). GLS is courier-only (delivers to billing/shipping address), no pickup point selection needed
- `orderNumber` format: `QS-YYYYMMDD-NNNN` (sequential per day)
- Status flow: NEW -> CONFIRMED -> SHIPPED -> DELIVERED (or CANCELLED at any point)

The `config` JSON field stores provider-specific data:
- Zasilkovna: `{ "apiKey": "2bed6e6598041af2", "senderLabel": "Qsport.cz" }`
- GLS: `{ "pickupEnabled": false }` (courier only, no pickup points)
- Osobni vyzvednuti: `{ "address": "Po domluvu", "note": "Kontaktujte nas pro domluvu mista a casu" }`

#### A2. Seed Shipping Methods (3 methods: Zásilkovna, GLS, Osobní vyzvednutí)

Add to `prisma/seed.ts`:

```typescript
// Shipping methods
await prisma.shippingMethod.createMany({
  data: [
    {
      name: "Zásilkovna",
      code: "zasilkovna",
      description: "Doručení na výdejní místo Zásilkovny (2-5 pracovních dnů)",
      price: 49,
      freeFrom: 2000,
      active: true,
      position: 1,
      config: JSON.stringify({
        apiKey: "2bed6e6598041af2",
        senderLabel: "Qsport.cz",
      }),
    },
    {
      name: "GLS",
      code: "gls",
      description: "Doručení kurýrem GLS na adresu (1-3 pracovní dny)",
      price: 89,
      freeFrom: 2000,
      active: true,
      position: 2,
      config: JSON.stringify({
        pickupEnabled: false,
      }),
    },
    {
      name: "Osobní vyzvednutí",
      code: "pickup",
      description: "Vyzvednete si objednávku osobně (po domluvě)",
      price: 0,
      freeFrom: null,
      active: true,
      position: 3,
      config: JSON.stringify({
        address: "Po domluvě",
        note: "Kontaktujte nás pro domluvu místa a času",
      }),
    },
  ],
});
```

#### A3. Admin Shipping Page — `src/app/(admin)/admin/doprava/page.tsx` (CREATE)

**URL:** `/admin/doprava`

Features:
- Table of shipping methods (name, code, price, free-from threshold, active status)
- Each row has Edit button
- Toggle active/inactive via server action
- Display Zasilkovna API key (masked: `2bed••••1af2`)
- Show config details per method

**UI:** Same card/table style as other admin pages (white card, gray-50 bg, border-gray-200).

#### A4. Admin Shipping Edit — `src/app/(admin)/admin/doprava/[id]/page.tsx` (CREATE)

**URL:** `/admin/doprava/{id}`

Form fields:
- Name (text)
- Code (read-only slug)
- Description (textarea)
- Price (number, CZK)
- Free from threshold (number, nullable — "Zdarma od X Kc")
- Active (toggle/checkbox)
- Provider-specific config:
  - Zasilkovna: API key field, sender label
  - GLS: pickup enabled toggle (future)
  - Pickup: address, note

Server action: `updateShippingMethod` — validates and saves.

#### A5. Zasilkovna Widget Integration — `src/lib/zasilkovna.ts` (CREATE)

Helper for Zasilkovna pickup point selector (for future checkout page):

```typescript
export const ZASILKOVNA_API_KEY = "2bed6e6598041af2";

/** URL for Zasilkovna widget (v6) */
export function getZasilkovnaWidgetUrl(): string {
  return "https://widget.packeta.com/v6/www/js/library.js";
}

/** Fetch pickup points near a location (server-side) */
export async function getPickupPoints(query: string) {
  const res = await fetch(
    `https://www.zasilkovna.cz/api/v4/${ZASILKOVNA_API_KEY}/branch.json?` +
    new URLSearchParams({ country: "cz" })
  );
  return res.json();
}
```

#### A6. Sidebar Update — Add "Doprava" link

In `AdminSidebar.tsx`, add to the "Prodej" group (after Objednavky):

```tsx
{
  href: "/admin/doprava",
  label: "Doprava",
  icon: (/* truck SVG icon */),
},
```

---

### Phase B: Blog CRUD (Marketing section)

#### B1. Admin Blog List — `src/app/(admin)/admin/blog/page.tsx` (CREATE)

**URL:** `/admin/blog`

Table of blog posts:
- Columns: Title, Slug, Author, Published (yes/no badge), Published At, Tags
- "Nový článek" button (links to `/admin/blog/novy`)
- Status filter: ALL / Published / Draft
- Search by title
- Pagination
- Each row: Edit button → `/admin/blog/{id}`
- Toggle published via server action

**UI:** Same card/table style as other admin pages.

#### B2. Admin Blog Create — `src/app/(admin)/admin/blog/novy/page.tsx` (CREATE)

**URL:** `/admin/blog/novy`

Form fields:
- Title (text) — auto-generates slug
- Slug (text, editable)
- Excerpt (textarea, short summary)
- Content (textarea — full article in Markdown or HTML)
- Cover Image URL (text)
- Author (text, default "Qsport.cz")
- Tags (text input — comma-separated, stored as JSON string)
- Published (checkbox/toggle)
- Published At (date picker — null if draft)

Server action: `createBlogPost` — validates, generates slug from title if empty, saves. Redirect to `/admin/blog`.

#### B3. Admin Blog Edit — `src/app/(admin)/admin/blog/[id]/page.tsx` (CREATE)

**URL:** `/admin/blog/{id}`

Same form as B2, pre-filled with existing data.
- Server action: `updateBlogPost`
- Delete button with confirmation (server action: `deleteBlogPost`)

#### B4. Sidebar Update — Add "Blog" under Marketing

In `AdminSidebar.tsx`, add to the "Marketing" group (first item):

```tsx
{
  href: "/admin/blog",
  label: "Blog",
  icon: (/* document/article SVG icon */),
},
```

**Note:** BlogPost model already exists in Prisma schema — no schema changes needed.

---

### Phase C: Category CRUD

#### C1. Category Create/Edit — Enhance `src/app/(admin)/admin/kategorie/page.tsx`

Add inline or modal functionality:
- "Nova kategorie" button
- Server action: `createCategory` (name, slug, parentId, seoTitle, seoDesc, position)
- Each row gets Edit link to `/admin/kategorie/{id}`
- Delete with confirmation (only if no products assigned)

#### C2. Category Edit Page — `src/app/(admin)/admin/kategorie/[id]/page.tsx` (CREATE)

Form fields:
- Name, Slug, Parent category (dropdown), Position, SEO Title, SEO Desc, Image URL
- Server action: `updateCategory`
- Delete button (with product count check)

---

### Phase D: Brand CRUD

#### D1. Admin Brand Page — `src/app/(admin)/admin/znacky/page.tsx` (CREATE)

**URL:** `/admin/znacky`

Table: Name, Slug, Logo URL, Product count
- "Nova znacka" button
- Inline edit or detail page

#### D2. Sidebar Update — Add "Znacky" under Katalog

---

### Phase E: Order Management Admin

#### E1. Admin Order List — `src/app/(admin)/admin/objednavky/page.tsx` (REPLACE placeholder)

**URL:** `/admin/objednavky`

Replace current placeholder with functional page:
- Table: order number, date, customer (name + email), items count, total, status badge, shipping method
- Status filter: ALL / NEW / CONFIRMED / SHIPPED / DELIVERED / CANCELLED
- Search by order number or email
- Pagination
- Status badges use colors:
  - NEW: blue-100/blue-700
  - CONFIRMED: yellow-100/yellow-700
  - SHIPPED: purple-100/purple-700
  - DELIVERED: green-100/green-700
  - CANCELLED: red-100/red-700

#### E2. Admin Order Detail — `src/app/(admin)/admin/objednavky/[id]/page.tsx` (CREATE)

**URL:** `/admin/objednavky/{id}`

Layout (2-column like product detail):
- Left: order items table (product, variant, qty, unit price, total), subtotal/shipping/total summary
- Right sidebar:
  - Status card with dropdown to change status (server action: `updateOrderStatus`)
  - Customer info (name, email, phone)
  - Billing address
  - Shipping address (if different)
  - Shipping method + Zasilkovna point info (if applicable)
  - Payment info (method, status)
  - Tracking number field (editable) + tracking URL
  - Admin note (textarea)
  - Timestamps (created, paid, shipped, delivered)

Server actions:
- `updateOrderStatus` — changes status + sets relevant timestamp (shippedAt, deliveredAt, cancelledAt)
- `updateTracking` — saves tracking number/URL
- `updateAdminNote` — saves internal note

#### E3. Order Number Generator — `src/lib/orders.ts` (CREATE)

```typescript
import { prisma } from "./db";

/** Generate next order number: QS-20261108-0001 */
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `QS-${dateStr}-`;

  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  const nextNum = lastOrder
    ? parseInt(lastOrder.orderNumber.slice(-4), 10) + 1
    : 1;

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}
```

---

### Phase F: Enhanced Product Management (LATER)

#### F1. Product Create — `src/app/(admin)/admin/produkty/novy/page.tsx` (CREATE)

"Novy produkt" button on product list page. Form similar to edit but with:
- Brand selection
- Category selection (checkboxes)
- Initial variant creation

#### F2. Variant Edit on Product Detail

Enable inline variant editing on `/admin/produkty/[id]`:
- Editable price, stock, comparePrice fields
- Server action: `updateVariant`

#### F3. Category Assignment on Product Detail

Enable category checkboxes (currently disabled):
- Server action: `updateProductCategories`

---

## Sidebar Navigation — Final Structure

```
Dashboard

Prodej
  Objednavky
  Doprava ← NEW

Katalog
  Produkty
  Kategorie
  Znacky ← NEW

Marketing
  Slevy (placeholder)
  Analytika (placeholder)

(bottom)
  Nastaveni
  Zobrazit e-shop
```

**NOTE:** Blog is NOT in admin — user manages blog via separate system.

---

## File Summary

### Phase A (Shipping + Order Schema) — IMPLEMENT NOW
| # | File | Action |
|---|------|--------|
| A1 | `prisma/schema.prisma` | EDIT — add ShippingMethod, Order, OrderItem models |
| A2 | `prisma/seed.ts` | EDIT — add 2 shipping method seeds |
| A3 | `src/app/(admin)/admin/doprava/page.tsx` | CREATE — shipping list |
| A4 | `src/app/(admin)/admin/doprava/[id]/page.tsx` | CREATE — shipping edit |
| A5 | `src/lib/zasilkovna.ts` | CREATE — Zasilkovna helpers |
| A6 | `src/components/admin/AdminSidebar.tsx` | EDIT — add Doprava + Znacky links (NO Blog) |

### Phase B (Category CRUD) — NEXT
| # | File | Action |
|---|------|--------|
| B1 | `src/app/(admin)/admin/kategorie/page.tsx` | EDIT — add create button |
| B2 | `src/app/(admin)/admin/kategorie/[id]/page.tsx` | CREATE — category edit |

### Phase C (Brand CRUD) — NEXT
| # | File | Action |
|---|------|--------|
| C1 | `src/app/(admin)/admin/znacky/page.tsx` | CREATE — brand management |

### Phase D (Order Management) — IMPLEMENT WITH A
| # | File | Action |
|---|------|--------|
| D1 | `src/app/(admin)/admin/objednavky/page.tsx` | REPLACE — order list (functional) |
| D2 | `src/app/(admin)/admin/objednavky/[id]/page.tsx` | CREATE — order detail |
| D3 | `src/lib/orders.ts` | CREATE — order number generator |

### Phase E (Product Enhancements) — LATER
| # | File | Action |
|---|------|--------|
| E1 | `src/app/(admin)/admin/produkty/novy/page.tsx` | CREATE — product create |
| E2 | `src/app/(admin)/admin/produkty/[id]/page.tsx` | EDIT — variant editing |
| E3 | `src/app/(admin)/admin/produkty/[id]/page.tsx` | EDIT — category assignment |

---

## Implementation Priority Order

1. **Phase A (Shipping + Order Schema)** — all new Prisma models (ShippingMethod, Order, OrderItem) + shipping admin CRUD
2. **Phase D (Order Management)** — admin pages for orders (depends on Phase A schema)
3. **Phase B (Category CRUD)** — improves existing read-only page
4. **Phase C (Brand CRUD)** — new page
5. **Phase E (Product enhancements)** — incremental improvements to existing

**REMOVED:** Blog CRUD — user manages blog via separate system, NOT in admin panel.

---

## Implementation Notes

- **No auth on admin** — admin pages have no authentication yet. This is a known gap but not in scope for this task. Can be added as a separate task (basic password protection or similar).
- **Server actions** — follow existing pattern from `produkty/[id]/page.tsx` (inline `"use server"` function, redirect after save).
- **No new dependencies** — all UI built with Tailwind, no component library.
- **Zasilkovna API key** — stored in DB `ShippingMethod.config` JSON field (not .env) so it can be edited in admin. Also exported from `src/lib/zasilkovna.ts` as a constant for widget integration.
- **Prices in CZK** — whole numbers (no halere), consistent with Variant.price pattern.
- **SQLite** — no JSON operators available, use `JSON.parse()` in JS for config fields.
- **Next.js 16 patterns** — `params` is Promise, use `await params`. Server actions with `"use server"` directive.
