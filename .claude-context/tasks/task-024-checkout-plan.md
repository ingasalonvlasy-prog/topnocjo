# Plan: Košík + Checkout + Platba

**Status:** Ready for implementation  
**Priority:** Critical  
**Date:** 2026-11-08  
**Depends on:** ShippingMethod model (done), ZasilkovnaWidget (done), User accounts (done), Order model (planned in admin plan)

---

## Current State

### What EXISTS:
- `AddToCartButton` — placeholder (`alert("Košík bude brzy k dispozici!")`)
- `Header` — links to `/kosik` (cart icon, both desktop + mobile)
- `ProductCard` — "Přidat do košíku" button (onClick stub)
- `ShippingMethod` model in Prisma (3 methods seeded: Zásilkovna, GLS, Osobní)
- `ZasilkovnaWidget.tsx` — working Packeta widget v6 integration
- `src/lib/zasilkovna.ts` — API key helpers, widget config, pickup point fetch
- `src/lib/auth.ts` — cookie-based auth, `getCurrentUser()`
- `User` model in Prisma with address fields
- `doprava-a-platba` page mentions Comgate
- Product detail page with variant selection (size chips) — but no selection state

### What's MISSING:
- Cart state management (no context/store)
- Cart page (`/kosik`)
- Checkout page (`/pokladna`)
- Order + OrderItem Prisma models (planned but not migrated)
- Comgate payment integration
- Order confirmation page
- Email notifications
- Variant selection state on product detail

---

## Architecture Decisions

### Cart Storage: localStorage + React Context

**Why localStorage, not server-side session:**
- Guest checkout is a core feature ("Nákup bez registrace")
- No server calls to browse/modify cart → instant UX
- Survives browser restart
- No DB storage needed for cart (cart is ephemeral)
- Logged-in users also use localStorage (simple, consistent)

**Cart structure:**
```typescript
interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantTitle: string;    // "42" or "M / Černá"
  price: number;           // snapshot at add time (re-verified at checkout)
  photo: string;           // first product photo URL
  quantity: number;
}

interface Cart {
  items: CartItem[];
  updatedAt: number;       // timestamp for staleness check
}
```

### Payment: Comgate HTTP POST API v1.0

**Flow:**
1. Customer submits checkout form
2. Server action creates Order (status NEW, paymentStatus PENDING)
3. Server calls Comgate `POST https://payments.comgate.cz/v1.0/create`
4. Comgate returns `transId` + `redirect` URL
5. Save `transId` on Order → redirect customer to Comgate
6. Customer pays → Comgate redirects to our success/fail URL
7. Comgate sends push notification (POST) to `/api/comgate/callback`
8. Callback verifies status via Comgate status API → updates Order

**Config (env vars):**
```
COMGATE_MERCHANT=123456
COMGATE_SECRET=xxxxx
COMGATE_TEST=true
```

### Price Verification at Checkout

Cart stores price snapshots. At checkout, server re-fetches current prices from DB and uses THOSE. If prices changed, show notice to customer.

---

## Implementation Plan

### Phase 1: Cart Context + Cart Page

#### 1.1 Cart Context — `src/lib/cart.tsx` (CREATE)

React Context + localStorage provider:

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantTitle: string;
  price: number;
  photo: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;        // total quantity
  subtotal: number;         // sum of price * quantity
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "qsport_cart";

export const CartContext = createContext<CartContextValue>(/* ... */);

export function CartProvider({ children }: { children: ReactNode }) {
  // Init from localStorage (with SSR guard)
  // Persist to localStorage on every change
  // Provide addItem, updateQuantity, removeItem, clearCart
}

export function useCart() {
  return useContext(CartContext);
}
```

**Key behaviors:**
- `addItem`: if variantId exists, increment quantity; else add new item
- `updateQuantity`: set quantity (remove if 0)
- `removeItem`: remove by variantId
- `clearCart`: empty array (called after successful order)
- Max quantity per item: 10
- localStorage key: `qsport_cart`

#### 1.2 Cart Provider in Layout — `src/app/(public)/layout.tsx` (EDIT)

Wrap children with `<CartProvider>`:
```tsx
import { CartProvider } from "@/lib/cart";

export default function PublicLayout({ children }) {
  return (
    <CartProvider>
      <Header />
      {children}
      <Footer />
    </CartProvider>
  );
}
```

#### 1.3 Update AddToCartButton — `src/components/AddToCartButton.tsx` (REPLACE)

Currently a stub. Replace with:
```typescript
"use client";

import { useCart } from "@/lib/cart";
import { useState } from "react";

interface AddToCartButtonProps {
  variant: {
    id: string;
    title: string;
    price: number;
    stock: number;
  };
  product: {
    id: string;
    slug: string;
    name: string;
    photo: string;
  };
}

export function AddToCartButton({ variant, product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantTitle: variant.title,
      price: variant.price,
      photo: product.photo,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={variant.stock === 0}
      className="flex-1 h-[52px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {added ? "Přidáno ✓" : "Přidat do košíku"}
    </button>
  );
}
```

**IMPORTANT:** Product detail page must pass selected variant to AddToCartButton. Currently variant selection (size chips) is display-only. Need to add selection state.

#### 1.4 Variant Selection State — `src/app/(public)/produkt/[slug]/page.tsx` (EDIT)

The variant size chips are currently static spans. Need to:
1. Extract variant selection + add-to-cart into a client component `ProductActions`
2. Track selected variant in state
3. Pass selected variant to `AddToCartButton`
4. Show selected variant price (if variants have different prices)
5. Default: first in-stock variant selected

**New component:** `src/components/ProductActions.tsx` (CREATE)
```typescript
"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";

interface ProductActionsProps {
  variants: Array<{
    id: string;
    title: string;
    size: string | null;
    price: number;
    comparePrice: number | null;
    stock: number;
  }>;
  product: {
    id: string;
    slug: string;
    name: string;
    photo: string;
  };
}

export function ProductActions({ variants, product }: ProductActionsProps) {
  // Default to first in-stock variant
  const firstInStock = variants.find(v => v.stock > 0);
  const [selectedId, setSelectedId] = useState<string | null>(firstInStock?.id || null);
  const selected = variants.find(v => v.id === selectedId);

  return (
    <>
      {/* Size chips */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-bold text-ink">Vyber si velikost (EU)</span>
          <button className="text-[13px] text-blue font-medium hover:underline">Tabulka velikostí</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => v.stock > 0 && setSelectedId(v.id)}
              className={`min-w-[52px] h-[44px] flex items-center justify-center text-[14px] font-bold rounded-[8px] border transition-all px-3 ${
                v.id === selectedId
                  ? "border-navy bg-navy text-white"
                  : v.stock > 0
                    ? "border-line bg-white text-ink hover:border-navy cursor-pointer"
                    : "border-line text-line bg-white cursor-not-allowed line-through"
              }`}
            >
              {v.title}
            </button>
          ))}
        </div>
      </div>

      {/* CTA row */}
      <div className="flex gap-2 mb-6">
        {selected ? (
          <AddToCartButton variant={selected} product={product} />
        ) : (
          <button disabled className="flex-1 h-[52px] bg-navy/50 text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] cursor-not-allowed">
            Vyberte velikost
          </button>
        )}
        {/* Heart/wishlist button stays */}
      </div>
    </>
  );
}
```

#### 1.5 Cart Badge on Header — `src/components/Header.tsx` (EDIT)

Add item count badge on cart icon:
```tsx
const { itemCount } = useCart();

// On cart link:
<Link href="/kosik" className="relative w-10 h-10 ...">
  <svg .../>
  {itemCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-lime text-navy text-[11px] font-extrabold rounded-full flex items-center justify-center">
      {itemCount > 9 ? "9+" : itemCount}
    </span>
  )}
</Link>
```

#### 1.6 Cart Page — `src/app/(public)/kosik/page.tsx` (CREATE)

**URL:** `/kosik`

**Layout:**
```
Breadcrumbs: Domů / Košík

┌──────────────────────────────────────────┐ ┌──────────────────┐
│  Cart items (left, 2/3)                  │ │  Summary (right)  │
│                                          │ │                   │
│  ┌ photo ─ name/variant ─ qty ─ price ┐  │ │  Mezisoučet: X Kč│
│  │ 60x60  Product Name    -[2]+  1998  │  │ │  Doprava: od 49Kč│
│  │        Vel: 42          ✕    Kč     │  │ │  ──────────────  │
│  └────────────────────────────────────┘  │ │  Celkem: X Kč    │
│  ┌ photo ─ name/variant ─ qty ─ price ┐  │ │                   │
│  │ ...                                 │  │ │  [POKRAČOVAT      │
│  └────────────────────────────────────┘  │ │   K POKLADNĚ]     │
│                                          │ │                   │
│  Do dopravy zdarma ti chybí X Kč ████░░ │ │  Bezpečná platba  │
└──────────────────────────────────────────┘ └──────────────────┘

Empty state:
"Zatím tu nic není."
"Mrkni na novinky." → link to homepage
```

**Features:**
- Item rows: photo (60x60, rounded, pastel bg), product name (link to product), variant title, quantity selector (- / [num] / +), line total, remove (× button)
- Quantity: min 1, max 10 (or stock limit)
- Free shipping progress bar: "Do dopravy zdarma ti chybí X Kč" (threshold from ShippingMethod freeFrom, default 2000 Kč)
- Summary sidebar: subtotal, estimated shipping (lowest active method price), total
- CTA: "Pokračovat k pokladně" → `/pokladna` (lime pill button)
- Mobile: items stack vertically, summary at bottom (not sticky)
- SEO: `noindex` (cart page)

**Client component** (uses `useCart` hook).

#### 1.7 Quick-add on ProductCard — `src/components/ProductCard.tsx` (EDIT)

The existing "Přidat do košíku" button on hover is a stub. Options:
- If product has single variant → add directly
- If product has multiple variants → link to product detail
- For now: link to product detail (safest UX — customer must select size)

Change the button to be a Link or just keep the existing card-level Link behavior (clicking card opens product).

**Decision:** Keep as-is for MVP. The entire card is already a Link to product detail. The hover button is cosmetic — clicking anywhere on the card navigates to product. Remove the `onClick` stub to avoid confusion.

---

### Phase 2: Checkout Page

#### 2.1 Order + OrderItem Prisma Models

Add to `prisma/schema.prisma` (from admin plan, plus Comgate fields):

```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique
  status          String      @default("NEW")
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
  shippingPrice   Int            @default(0)
  // Zásilkovna specific
  packetaPointId  String?
  packetaPointName String?
  // Payment
  paymentMethod   String       @default("card")   // "card" | "transfer"
  paymentStatus   String       @default("PENDING") // PENDING, PAID, REFUNDED
  comgateTransId  String?      // Comgate transaction ID "AB12-CD34-EF56"
  // Totals
  subtotal        Int          @default(0)
  total           Int          @default(0)
  // Notes
  note            String?
  adminNote       String?
  // Tracking
  trackingNumber  String?
  trackingUrl     String?
  // User (optional — guest checkout)
  userId          String?
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
  @@index([comgateTransId])
  @@map("orders")
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId    String?
  variantId    String?
  productName  String
  variantTitle String
  sku          String?
  quantity     Int     @default(1)
  unitPrice    Int
  totalPrice   Int

  @@index([orderId])
  @@map("order_items")
}
```

**Added vs admin plan:** `comgateTransId` field, `userId` field.

Also add `orders` relation to ShippingMethod (if not already there) and to User:
```prisma
// In User model add:
orders Order[]

// In ShippingMethod model add:
orders Order[]
```

#### 2.2 Order Number Generator — `src/lib/orders.ts` (CREATE)

```typescript
import { prisma } from "./db";

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

#### 2.3 Comgate Payment Lib — `src/lib/comgate.ts` (CREATE)

```typescript
const COMGATE_URL = "https://payments.comgate.cz/v1.0";

interface ComgateConfig {
  merchant: string;
  secret: string;
  test: boolean;
}

function getConfig(): ComgateConfig {
  return {
    merchant: process.env.COMGATE_MERCHANT!,
    secret: process.env.COMGATE_SECRET!,
    test: process.env.COMGATE_TEST === "true",
  };
}

interface CreatePaymentParams {
  price: number;       // in CZK (whole numbers) — API expects smallest unit
  refId: string;       // order number
  email: string;
  label?: string;      // payment description
}

interface CreatePaymentResult {
  code: number;
  transId: string;
  redirect: string;
}

export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const config = getConfig();
  const body = new URLSearchParams({
    merchant: config.merchant,
    secret: config.secret,
    price: String(params.price * 100), // CZK → haléře
    curr: "CZK",
    label: params.label || `Objednávka ${params.refId}`,
    refId: params.refId,
    email: params.email,
    method: "ALL",
    prepareOnly: "true",
    test: config.test ? "true" : "false",
    lang: "cs",
    country: "CZ",
  });

  const res = await fetch(`${COMGATE_URL}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(text));

  if (parsed.code !== "0") {
    throw new Error(`Comgate error: ${parsed.message}`);
  }

  return {
    code: 0,
    transId: parsed.transId,
    redirect: parsed.redirect,
  };
}

interface PaymentStatus {
  merchant: string;
  transId: string;
  refId: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "AUTHORIZED";
  price: number;
  curr: string;
  email: string;
}

export async function getPaymentStatus(transId: string): Promise<PaymentStatus> {
  const config = getConfig();
  const body = new URLSearchParams({
    merchant: config.merchant,
    secret: config.secret,
    transId,
  });

  const res = await fetch(`${COMGATE_URL}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(text));

  if (parsed.code !== "0") {
    throw new Error(`Comgate status error: ${parsed.message}`);
  }

  return parsed as unknown as PaymentStatus;
}
```

#### 2.4 Checkout Page — `src/app/(public)/pokladna/page.tsx` (CREATE)

**URL:** `/pokladna`

**Multi-step form (all on one page, scrollable sections):**

```
Breadcrumbs: Domů / Košík / Pokladna

┌─────────────────────────────────────────────────────────────────┐
│  ① Kontaktní údaje                                              │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Email*          │ Telefon                          │         │
│  └────────────────────────────────────────────────────┘         │
│  (Přihlášeni? Předvyplněno z profilu)                           │
│                                                                 │
│  ② Fakturační adresa                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Jméno*          │ Příjmení*                        │         │
│  │ Ulice a číslo popisné*                             │         │
│  │ Město*          │ PSČ*                             │         │
│  └────────────────────────────────────────────────────┘         │
│  ☐ Doručovací adresa je jiná                                    │
│                                                                 │
│  ③ Doprava                                                      │
│  ┌────────────────────────────────────────────────────┐         │
│  │ ○ Zásilkovna — 49 Kč (zdarma od 2000 Kč)         │         │
│  │   [Vybrat výdejní místo] → ZasilkovnaWidget       │         │
│  │   Vybrané: Zásilkovna Praha 2, Anglická 12        │         │
│  │                                                    │         │
│  │ ○ GLS kurýr — 89 Kč (zdarma od 2000 Kč)          │         │
│  │   Doručení na adresu (1-3 prac. dny)              │         │
│  │                                                    │         │
│  │ ○ Osobní vyzvednutí — zdarma                      │         │
│  │   Po domluvě                                       │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                 │
│  ④ Platba                                                       │
│  ┌────────────────────────────────────────────────────┐         │
│  │ ○ Platba kartou (Visa, Mastercard)                │         │
│  │ ○ Bankovní převod                                  │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                 │
│  ⑤ Poznámka k objednávce (volitelné)                           │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Textarea                                           │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                 │
│  ┌─────────────────────────────────── Summary sidebar ─────────┐│
│  │ Rekapitulace:                                                ││
│  │ Product A × 1 ......... 2 490 Kč                            ││
│  │ Product B × 2 ......... 3 998 Kč                            ││
│  │ ─────────────────────────────────                            ││
│  │ Mezisoučet:              6 488 Kč                            ││
│  │ Doprava (Zásilkovna):       0 Kč (zdarma!)                  ││
│  │ ─────────────────────────────────                            ││
│  │ Celkem:                  6 488 Kč                            ││
│  │                                                              ││
│  │ [OBJEDNAT A ZAPLATIT]                                        ││
│  │                                                              ││
│  │ Odesláním souhlasíte s obchodními podmínkami                 ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Design:**
- Two-column layout on desktop: form (left, 60%), summary (right, sticky 40%)
- Mobile: form top, summary bottom (not sticky)
- Same form field styling as kontakt/registrace pages
- Shipping method cards: white bg, border-line, selected: border-navy + bg-wash
- Payment cards: same style
- Summary: bg-wash rounded-[10px] p-6
- CTA: lime pill button, full-width in summary

**Checkout is a client component** (needs useCart, form state, ZasilkovnaWidget).

**Key logic:**
- If logged in (`getCurrentUser()`), pre-fill email, name, address from user profile
- If Zásilkovna selected → show ZasilkovnaWidget, require point selection
- If GLS selected → shipping address = billing address (or different if checkbox)
- If Osobní selected → no address needed for shipping
- Compute shipping price: if subtotal >= freeFrom → 0, else method.price
- Validate all required fields client-side before submit

#### 2.5 Checkout Server Action — `src/app/(public)/pokladna/actions.ts` (CREATE)

```typescript
"use server";

import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders";
import { createPayment } from "@/lib/comgate";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

interface CheckoutData {
  // Contact
  email: string;
  phone?: string;
  // Billing
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  zip: string;
  // Shipping (optional different address)
  differentShipping: boolean;
  shippingName?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingZip?: string;
  // Shipping method
  shippingMethodId: string;
  packetaPointId?: string;
  packetaPointName?: string;
  // Payment
  paymentMethod: "card" | "transfer";
  // Note
  note?: string;
  // Cart items (verified server-side)
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
}

export async function createOrder(data: CheckoutData) {
  // 1. Verify cart items — fetch current prices from DB
  const variants = await prisma.variant.findMany({
    where: {
      id: { in: data.items.map(i => i.variantId) },
      active: true,
    },
    include: { product: true },
  });

  // 2. Validate stock
  for (const item of data.items) {
    const variant = variants.find(v => v.id === item.variantId);
    if (!variant) throw new Error(`Varianta nenalezena: ${item.variantId}`);
    if (variant.stock < item.quantity) {
      throw new Error(`Nedostatek skladem: ${variant.product.name} (${variant.title})`);
    }
  }

  // 3. Calculate totals
  const orderItems = data.items.map(item => {
    const variant = variants.find(v => v.id === item.variantId)!;
    return {
      productId: variant.productId,
      variantId: variant.id,
      productName: variant.product.name,
      variantTitle: variant.title,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: variant.price,
      totalPrice: variant.price * item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);

  // 4. Get shipping method + compute shipping price
  const shippingMethod = await prisma.shippingMethod.findUniqueOrThrow({
    where: { id: data.shippingMethodId },
  });
  const shippingPrice = shippingMethod.freeFrom && subtotal >= shippingMethod.freeFrom
    ? 0
    : shippingMethod.price;

  const total = subtotal + shippingPrice;

  // 5. Get current user (if logged in)
  const user = await getCurrentUser();

  // 6. Create order
  const orderNumber = await generateOrderNumber();
  const order = await prisma.order.create({
    data: {
      orderNumber,
      email: data.email,
      phone: data.phone || null,
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      city: data.city,
      zip: data.zip,
      shippingName: data.differentShipping ? data.shippingName : null,
      shippingStreet: data.differentShipping ? data.shippingStreet : null,
      shippingCity: data.differentShipping ? data.shippingCity : null,
      shippingZip: data.differentShipping ? data.shippingZip : null,
      shippingId: shippingMethod.id,
      shippingPrice,
      packetaPointId: data.packetaPointId || null,
      packetaPointName: data.packetaPointName || null,
      paymentMethod: data.paymentMethod,
      subtotal,
      total,
      note: data.note || null,
      userId: user?.id || null,
      items: { create: orderItems },
    },
  });

  // 7. Decrement stock
  for (const item of data.items) {
    await prisma.variant.update({
      where: { id: item.variantId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  // 8. Payment routing
  if (data.paymentMethod === "card") {
    // Create Comgate payment + redirect
    const payment = await createPayment({
      price: total,
      refId: orderNumber,
      email: data.email,
      label: `Qsport.cz – ${orderNumber}`,
    });

    // Save Comgate transId on order
    await prisma.order.update({
      where: { id: order.id },
      data: { comgateTransId: payment.transId },
    });

    // Redirect to Comgate payment page
    redirect(payment.redirect);
  } else {
    // Bank transfer — order confirmed, show instructions
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });
    redirect(`/objednavka/${order.orderNumber}?new=1`);
  }
}
```

#### 2.6 Comgate Callback — `src/app/api/comgate/callback/route.ts` (CREATE)

**URL:** `/api/comgate/callback` (configured in Comgate portal as push notification URL)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentStatus } from "@/lib/comgate";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const transId = formData.get("transId") as string;
  const merchant = formData.get("merchant") as string;
  const refId = formData.get("refId") as string;
  const status = formData.get("status") as string;

  if (!transId || !merchant) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // ALWAYS verify via Comgate status API — never trust push data alone
  const verified = await getPaymentStatus(transId);

  const order = await prisma.order.findFirst({
    where: { comgateTransId: transId },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (verified.status === "PAID" && order.paymentStatus !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
        paidAt: new Date(),
      },
    });
    // TODO: Send confirmation email (Phase 4)
  } else if (verified.status === "CANCELLED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "CANCELLED",
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
  }

  // Must return 200 to acknowledge push notification
  return new NextResponse("OK", { status: 200 });
}
```

#### 2.7 Payment Return URLs

**Success:** `/objednavka/[orderNumber]?platba=ok`  
**Fail:** `/objednavka/[orderNumber]?platba=fail`  
**Pending:** `/objednavka/[orderNumber]?platba=ceka`

These are GET redirects from Comgate. The page checks actual status from DB (push notification may have arrived already).

---

### Phase 3: Order Confirmation Page

#### 3.1 Order Confirmation — `src/app/(public)/objednavka/[orderNumber]/page.tsx` (CREATE)

**URL:** `/objednavka/QS-20261108-0001`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  ✓ Děkujeme za objednávku!                       │
│                                                   │
│  Objednávka: QS-20261108-0001                    │
│  Stav: Zaplaceno / Čeká na platbu / Zrušeno      │
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │ Shrnutí objednávky                        │    │
│  │ Product A × 1 ......... 2 490 Kč         │    │
│  │ Product B × 2 ......... 3 998 Kč         │    │
│  │ Mezisoučet:             6 488 Kč         │    │
│  │ Doprava (Zásilkovna):      0 Kč          │    │
│  │ Celkem:                 6 488 Kč         │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ Fakturační   │  │ Doručovací   │              │
│  │ Jan Novák    │  │ Zásilkovna   │              │
│  │ Vinohradská  │  │ Praha 2      │              │
│  │ Praha        │  │ Anglická 12  │              │
│  └──────────────┘  └──────────────┘              │
│                                                   │
│  Platba: Kartou (zaplaceno)                       │
│  Doprava: Zásilkovna — Praha 2, Anglická 12       │
│                                                   │
│  [Bank transfer info — if paymentMethod=transfer]  │
│  Číslo účtu: 6424423004/5500                       │
│  Variabilní symbol: 20261108001                    │
│  Částka: 6 488 Kč                                  │
│                                                   │
│  [Pokračovat v nákupu]                             │
└──────────────────────────────────────────────────┘
```

**Access control:** Anyone with the orderNumber URL can view it (no auth required — link sent in email). Shows only order summary, not edit capabilities.

**If `?new=1`:** Show cart-clearing script (calls `clearCart()` client-side).

**If `?platba=fail`:** Show error message + "Zkusit znovu" button (re-initiates Comgate payment for same order).

**If bank transfer:** Show bank account details (6424423004/5500, VS = order number digits).

---

### Phase 4: Email Notifications (LATER)

Using Resend (already configured in the project based on memory):

#### 4.1 Order Confirmation Email

Sent when: order paid (card) or confirmed (transfer)
- To: customer email
- Subject: "Potvrzení objednávky QS-20261108-0001 | Qsport.cz"
- Content: order summary, items, totals, shipping info, payment info

#### 4.2 Order Shipped Email

Sent when: admin changes status to SHIPPED
- To: customer email
- Subject: "Vaše objednávka QS-20261108-0001 byla odeslána"
- Content: tracking number/URL, expected delivery

#### 4.3 Admin Notification

Sent when: new paid order
- To: admin email (from env)
- Subject: "Nová objednávka QS-20261108-0001"
- Content: order summary, customer info

---

### Phase 5: Polish & Edge Cases

#### 5.1 Cart Expiry / Stock Check

On checkout load, verify each cart item:
- Variant still exists and is active
- Stock sufficient
- Show warnings if items changed

#### 5.2 Checkout for Logged-in Users

Pre-fill form from `User` profile:
- email, firstName, lastName, phone, street, city, zip
- Show "Přihlášen jako jan@example.com" banner
- Link order to userId

#### 5.3 Update `doprava-a-platba` Page

Add GLS to the shipping methods list:
```html
<li><strong>GLS kurýr</strong> — od 89 Kč (doručení na adresu, 1-3 dny)</li>
```

#### 5.4 Mobile "Do košíku" Sticky Bar

On product detail mobile: sticky bottom bar with price + "Do košíku" button.

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `src/lib/cart.tsx` | CREATE | 1 |
| `src/components/ProductActions.tsx` | CREATE | 1 |
| `src/components/AddToCartButton.tsx` | REPLACE | 1 |
| `src/components/Header.tsx` | EDIT (badge) | 1 |
| `src/components/ProductCard.tsx` | EDIT (remove stub) | 1 |
| `src/app/(public)/layout.tsx` | EDIT (CartProvider) | 1 |
| `src/app/(public)/produkt/[slug]/page.tsx` | EDIT (use ProductActions) | 1 |
| `src/app/(public)/kosik/page.tsx` | CREATE | 1 |
| `prisma/schema.prisma` | EDIT (Order, OrderItem) | 2 |
| `src/lib/orders.ts` | CREATE | 2 |
| `src/lib/comgate.ts` | CREATE | 2 |
| `src/app/(public)/pokladna/page.tsx` | CREATE | 2 |
| `src/app/(public)/pokladna/actions.ts` | CREATE | 2 |
| `src/app/api/comgate/callback/route.ts` | CREATE | 2 |
| `src/app/(public)/objednavka/[orderNumber]/page.tsx` | CREATE | 3 |
| `src/app/(public)/doprava-a-platba/page.tsx` | EDIT | 5 |

## Environment Variables (new)

```env
COMGATE_MERCHANT=      # from portal.comgate.cz
COMGATE_SECRET=        # from portal.comgate.cz
COMGATE_TEST=true      # set false in production
```

## Dependencies (new)

None — Comgate uses standard `fetch` with URL-encoded POST. No SDK needed.
