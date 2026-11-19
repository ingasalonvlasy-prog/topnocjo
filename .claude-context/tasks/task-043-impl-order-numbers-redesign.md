# TASK-043 Implementation: Shopify-style order numbers + admin order detail premium redesign

## Status: COMPLETED

## Changes Made

### PART 1: Shopify-style sequential order numbers

**`src/lib/orders.ts`** — Complete rewrite:
- Changed from `QS-YYYYMMDD-0001` format to simple sequential numbers starting from 1001
- Handles migration from old format (parses trailing digits)
- Checks last 100 orders to find true max number (migration safety)

**# prefix display** — Updated in all files:
- `src/app/(admin)/admin/objednavky/[id]/page.tsx` — header text-3xl
- `src/components/admin/OrderTableClient.tsx` — table cell
- `src/app/(admin)/admin/objednavky/expedice/page.tsx` — fulfillment table
- `src/app/(admin)/admin/page.tsx` — dashboard recent orders
- `src/app/(admin)/admin/zakaznici/[id]/page.tsx` — customer detail orders
- `src/app/(public)/objednavka/[orderNumber]/page.tsx` — public order page (both success and failure)
- Finance page and account pages already had # prefix

### PART 2: Admin order detail premium redesign

**Header:**
- Larger order number (text-3xl font-bold)
- Badges next to number (payment + fulfillment)

**Fulfillment section:**
- Carrier icon in header
- Better structured info with uppercase tracking-wide labels
- Pickup point highlighted in blue card
- Improved spacing

**Items:**
- Bigger thumbnails (w-12 h-12 instead of w-10 h-10)
- Variant as rounded-full badge (bg-gray-100)
- SKU smaller, lighter color (text-[11px] text-gray-400)

**Financial summary:**
- Better separated from items (border-t-2)
- Larger total amount (text-lg)
- Green checkmark icon for "Zaplaceno"
- "Zdarma" shipping in green

**Customer sidebar — PREMIUM CARD:**
- Avatar with initials (w-10 h-10 rounded-full bg-gray-900)
- Name and email under avatar
- Stats: total orders | total spend (Prisma aggregate)
- Segmentation badge: Novy/Vracejici se/VIP
- Phone with icon
- Arrow link to profile

**Tracking sidebar:**
- If tracking exists: green card with tracking number and external link
- Collapsible edit form via details/summary
- If missing: standard input form

**Overall design:**
- Consistent shadow-[0_1px_3px_rgba(0,0,0,0.08)] on all cards
- Better padding/spacing throughout
- Improved typography hierarchy

## Verification
- `npx tsc --noEmit` — passed (no errors)
- `npm run build` — passed successfully
