/**
 * Shopify → Qsport.cz customer + order import script
 *
 * Phase 0: Create dummy shipping method "shopify-imported"
 * Phase 1: Import 15,651 customers (cursor pagination, upsert on email)
 * Phase 2: Import 89 orders with "S" prefix, status mapping, prices in haléře
 * Phase 3: Summary stats
 *
 * Usage: npx tsx scripts/import-shopify-customers-orders.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import crypto from "crypto";

// ── Config ──────────────────────────────────────────────────────────────────

const SHOPIFY_TOKEN = "EXPIRED_REMOVED";
const SHOPIFY_STORE = "zt2xr1-ry.myshopify.com";
const API_VERSION = "2024-01";
const BASE_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;
const PAGE_SIZE = 250;
const RATE_LIMIT_MS = 520;

// ── Prisma ──────────────────────────────────────────────────────────────────

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

// ── Types ───────────────────────────────────────────────────────────────────

interface ShopifyAddress {
  address1?: string;
  city?: string;
  zip?: string;
  province?: string;
  country?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  orders_count: number;
  total_spent: string;
  note: string | null;
  tags: string;
  verified_email: boolean;
  marketing_opt_in_level: string | null;
  default_address?: ShopifyAddress;
}

interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  email: string | null;
  phone: string | null;
  created_at: string;
  closed_at: string | null;
  cancelled_at: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_shipping_price_set?: {
    shop_money?: { amount: string };
  };
  discount_codes: Array<{ code: string; amount: string; type: string }>;
  note: string | null;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items: ShopifyLineItem[];
  customer?: {
    id: number;
    email: string | null;
  };
}

// ── Utilities ───────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestTime = 0;

async function shopifyFetch<T>(url: string): Promise<{ data: T; nextLink: string | null }> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get("Retry-After") || "2") * 1000;
    console.log(`  Rate limited, waiting ${retryAfter}ms...`);
    await sleep(retryAfter);
    return shopifyFetch(url);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${body}`);
  }

  let nextLink: string | null = null;
  const linkHeader = res.headers.get("link");
  if (linkHeader) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      nextLink = nextMatch[1];
    }
  }

  const data = (await res.json()) as T;
  return { data, nextLink };
}

function czkToHalere(priceStr: string): number {
  return Math.round(parseFloat(priceStr) * 100);
}

function mapShopifyStatus(
  financialStatus: string,
  fulfillmentStatus: string | null
): { status: string; paymentStatus: string } {
  let paymentStatus: string;
  switch (financialStatus) {
    case "paid":
      paymentStatus = "PAID";
      break;
    case "refunded":
    case "partially_refunded":
      paymentStatus = "REFUNDED";
      break;
    case "voided":
      paymentStatus = "CANCELLED";
      break;
    default:
      paymentStatus = "PENDING";
      break;
  }

  let status: string;
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

// ── Phase 0: Dummy shipping method ─────────────────────────────────────────

async function phase0_createShippingMethod(): Promise<string> {
  console.log("\n═══ PHASE 0: Create dummy shipping method ═══\n");

  const shipping = await prisma.shippingMethod.upsert({
    where: { code: "shopify-imported" },
    update: {},
    create: {
      name: "Shopify (importováno)",
      code: "shopify-imported",
      description: "Historická doprava z původního Shopify eshopu",
      price: 0,
      active: false,
      position: 999,
    },
  });

  console.log(`  ✓ Shipping method "${shipping.name}" (${shipping.id})`);
  return shipping.id;
}

// ── Phase 1: Import customers ───────────────────────────────────────────────

async function phase1_importCustomers(): Promise<{
  imported: number;
  skipped: number;
  updated: number;
  emailToUserId: Map<string, string>;
}> {
  console.log("\n═══ PHASE 1: Import customers ═══\n");

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let page = 0;
  const emailToUserId = new Map<string, string>();

  let url: string | null = `${BASE_URL}/customers.json?limit=${PAGE_SIZE}`;

  while (url) {
    page++;
    const { data, nextLink } = await shopifyFetch<{ customers: ShopifyCustomer[] }>(url);
    const customers = data.customers;

    if (customers.length === 0) break;

    for (const c of customers) {
      const email = c.email?.trim().toLowerCase();
      if (!email) {
        skipped++;
        continue;
      }

      const addr = c.default_address;
      const hasNewsletter =
        c.marketing_opt_in_level !== null && c.marketing_opt_in_level !== "unknown";

      try {
        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
          // Update address/phone if missing
          await prisma.user.update({
            where: { email },
            data: {
              phone: existing.phone || c.phone || undefined,
              street: existing.street || addr?.address1?.trim() || undefined,
              city: existing.city || addr?.city?.trim() || undefined,
              zip: existing.zip || addr?.zip?.trim() || undefined,
              newsletter: hasNewsletter || existing.newsletter,
              adminNote: existing.adminNote || c.note || undefined,
            },
          });
          emailToUserId.set(email, existing.id);
          updated++;
        } else {
          const user = await prisma.user.create({
            data: {
              email,
              passwordHash: "$IMPORTED$",
              firstName: c.first_name?.trim() || null,
              lastName: c.last_name?.trim() || null,
              phone: c.phone || null,
              street: addr?.address1?.trim() || null,
              city: addr?.city?.trim() || null,
              zip: addr?.zip?.trim() || null,
              newsletter: hasNewsletter,
              adminNote: c.note || null,
              role: "customer",
              createdAt: new Date(c.created_at),
            },
          });
          emailToUserId.set(email, user.id);
          imported++;
        }
      } catch (err: unknown) {
        // Handle unique constraint race (unlikely but safe)
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unique constraint")) {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) emailToUserId.set(email, existing.id);
          updated++;
        } else {
          console.error(`  ✗ Error importing customer ${email}:`, msg);
          skipped++;
        }
      }

      const total = imported + updated + skipped;
      if (total % 500 === 0) {
        console.log(
          `  Progress: ${total} processed (${imported} new, ${updated} updated, ${skipped} skipped)`
        );
      }
    }

    url = nextLink;
    console.log(`  Page ${page}: ${customers.length} customers (total new: ${imported})`);
  }

  console.log(
    `\n  ✓ Customers done: ${imported} imported, ${updated} updated, ${skipped} skipped`
  );
  return { imported, skipped, updated, emailToUserId };
}

// ── Phase 2: Import orders ──────────────────────────────────────────────────

async function phase2_importOrders(
  shippingId: string,
  emailToUserId: Map<string, string>
): Promise<{
  ordersImported: number;
  itemsImported: number;
  itemsLinked: number;
  itemsOrphaned: number;
}> {
  console.log("\n═══ PHASE 2: Import orders ═══\n");

  let ordersImported = 0;
  let itemsImported = 0;
  let itemsLinked = 0;
  let itemsOrphaned = 0;

  let url: string | null = `${BASE_URL}/orders.json?limit=${PAGE_SIZE}&status=any`;

  while (url) {
    const { data, nextLink } = await shopifyFetch<{ orders: ShopifyOrder[] }>(url);
    const orders = data.orders;

    if (orders.length === 0) break;

    for (const o of orders) {
      const orderNumber = `S${o.order_number}`;

      // Check if already imported
      const existing = await prisma.order.findUnique({ where: { orderNumber } });
      if (existing) {
        console.log(`  ⏭ Order ${orderNumber} already exists, skipping`);
        continue;
      }

      // Map status
      const { status, paymentStatus } = mapShopifyStatus(
        o.financial_status,
        o.fulfillment_status
      );

      // Lookup user
      const customerEmail = o.customer?.email?.trim().toLowerCase() || o.email?.trim().toLowerCase();
      let userId: string | null = null;
      if (customerEmail) {
        userId = emailToUserId.get(customerEmail) || null;
        if (!userId) {
          const user = await prisma.user.findUnique({ where: { email: customerEmail } });
          if (user) userId = user.id;
        }
      }

      // Address: billing > shipping > customer
      const billing = o.billing_address;
      const shipping = o.shipping_address;
      const email = o.email?.trim().toLowerCase() || customerEmail || "unknown@imported.shopify";

      const firstName = billing?.first_name?.trim() || shipping?.first_name?.trim() || "";
      const lastName = billing?.last_name?.trim() || shipping?.last_name?.trim() || "";
      const street = billing?.address1?.trim() || shipping?.address1?.trim() || "";
      const city = billing?.city?.trim() || shipping?.city?.trim() || "";
      const zip = billing?.zip?.trim() || shipping?.zip?.trim() || "";

      // Prices → haléře
      const subtotal = czkToHalere(o.subtotal_price);
      const discountAmount = czkToHalere(o.total_discounts);
      const shippingPrice = czkToHalere(
        o.total_shipping_price_set?.shop_money?.amount || "0"
      );
      const total = czkToHalere(o.total_price);

      // Dates
      const createdAt = new Date(o.created_at);
      const paidAt =
        o.financial_status === "paid" || o.financial_status === "refunded"
          ? createdAt
          : null;
      const deliveredAt =
        o.fulfillment_status === "fulfilled" && o.closed_at
          ? new Date(o.closed_at)
          : null;
      const cancelledAt = o.cancelled_at ? new Date(o.cancelled_at) : null;

      const viewToken = crypto.randomUUID();

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          status,
          email,
          phone: o.phone || billing?.phone || null,
          firstName,
          lastName,
          street,
          city,
          zip,
          shippingName: shipping
            ? `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() || null
            : null,
          shippingStreet: shipping?.address1?.trim() || null,
          shippingCity: shipping?.city?.trim() || null,
          shippingZip: shipping?.zip?.trim() || null,
          shippingId,
          shippingPrice,
          paymentMethod: "shopify",
          paymentStatus,
          subtotal,
          discountCode: o.discount_codes?.[0]?.code || null,
          discountAmount,
          total,
          note: o.note || null,
          viewToken,
          userId,
          createdAt,
          paidAt,
          deliveredAt,
          cancelledAt,
        },
      });

      // Create order items
      for (const item of o.line_items) {
        let productId: string | null = null;
        let variantId: string | null = null;

        // Try to link to existing product via sourceId
        if (item.product_id) {
          const product = await prisma.product.findFirst({
            where: { sourceId: String(item.product_id) },
            select: { id: true },
          });
          if (product) {
            productId = product.id;

            // Try to find variant by SKU
            if (item.sku) {
              const variant = await prisma.variant.findFirst({
                where: { productId: product.id, sku: item.sku },
                select: { id: true },
              });
              if (variant) variantId = variant.id;
            }
          }
        }

        const unitPrice = czkToHalere(item.price);

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId,
            variantId,
            productName: item.title,
            variantTitle: item.variant_title || "",
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice,
            totalPrice: unitPrice * item.quantity,
          },
        });

        itemsImported++;
        if (productId) {
          itemsLinked++;
        } else {
          itemsOrphaned++;
        }
      }

      // Create audit event
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "IMPORT",
          title: "Import ze Shopify",
          detail: `Shopify objednávka ${o.name} (${o.financial_status}/${o.fulfillment_status || "unfulfilled"})`,
        },
      });

      ordersImported++;
      console.log(
        `  ✓ Order ${orderNumber}: ${status}/${paymentStatus}, ${o.line_items.length} items, ${total / 100} Kč`
      );
    }

    url = nextLink;
  }

  console.log(
    `\n  ✓ Orders done: ${ordersImported} imported, ${itemsImported} items (${itemsLinked} linked, ${itemsOrphaned} orphaned)`
  );
  return { ordersImported, itemsImported, itemsLinked, itemsOrphaned };
}

// ── Phase 3: Summary ────────────────────────────────────────────────────────

async function phase3_summary(
  customers: { imported: number; skipped: number; updated: number },
  orders: {
    ordersImported: number;
    itemsImported: number;
    itemsLinked: number;
    itemsOrphaned: number;
  }
): Promise<void> {
  console.log("\n═══ PHASE 3: Summary ═══\n");

  let userCount = 0;
  let importedUserCount = 0;
  let orderCount = 0;
  let shopifyOrderCount = 0;

  try {
    userCount = await prisma.user.count();
    importedUserCount = await prisma.user.count({
      where: { passwordHash: "$IMPORTED$" },
    });
    orderCount = await prisma.order.count();
    shopifyOrderCount = await prisma.order.count({
      where: { orderNumber: { startsWith: "S" } },
    });
  } catch {
    console.log("  (Could not fetch DB counts — connection may be exhausted)");
  }

  console.log("  ┌─────────────────────────────────────────┐");
  console.log("  │  IMPORT ZÁKAZNÍKŮ A OBJEDNÁVEK          │");
  console.log("  ├─────────────────────────────────────────┤");
  console.log(`  │  Zákazníci nově:      ${String(customers.imported).padStart(8)}     │`);
  console.log(`  │  Zákazníci updatnutí: ${String(customers.updated).padStart(8)}     │`);
  console.log(`  │  Zákazníci přeskočení:${String(customers.skipped).padStart(8)}     │`);
  console.log(`  │  Celkem v DB:         ${String(userCount).padStart(8)}     │`);
  console.log(`  │  S heslem $IMPORTED$: ${String(importedUserCount).padStart(8)}     │`);
  console.log("  ├─────────────────────────────────────────┤");
  console.log(`  │  Objednávky:          ${String(orders.ordersImported).padStart(8)}     │`);
  console.log(`  │  Položky celkem:      ${String(orders.itemsImported).padStart(8)}     │`);
  console.log(`  │  Propojené s produkty:${String(orders.itemsLinked).padStart(8)}     │`);
  console.log(`  │  Nepropojené (orphan):${String(orders.itemsOrphaned).padStart(8)}     │`);
  console.log(`  │  Objednávky v DB:     ${String(orderCount).padStart(8)}     │`);
  console.log(`  │  Shopify (S prefix):  ${String(shopifyOrderCount).padStart(8)}     │`);
  console.log("  └─────────────────────────────────────────┘");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  Shopify → Qsport: Import zákazníků + obj.   ║");
  console.log("╚═══════════════════════════════════════════════╝");

  const start = Date.now();

  // Phase 0
  const shippingId = await phase0_createShippingMethod();

  // Phase 1
  const customerResult = await phase1_importCustomers();

  // Phase 2
  const orderResult = await phase2_importOrders(shippingId, customerResult.emailToUserId);

  // Phase 3
  await phase3_summary(customerResult, orderResult);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n  ⏱ Total time: ${elapsed}s`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
