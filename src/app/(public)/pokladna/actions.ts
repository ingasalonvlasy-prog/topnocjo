"use server";

import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders";
import { createPayment } from "@/lib/comgate";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { totalStock, allocateStock, orderNeedsSupplier } from "@/lib/stock";
import { sendEmail } from "@/lib/email";
import { OrderConfirmation } from "@/lib/emails/order-confirmation";
import { AdminNewOrder } from "@/lib/emails/admin-new-order";

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

interface CheckoutData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  zip: string;
  differentShipping: boolean;
  shippingName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingZip: string;
  shippingMethodId: string;
  pickupPointId: string;
  pickupPointName: string;
  paymentMethod: "card" | "transfer" | "cod";
  note: string;
  discountCode: string;
  items: CheckoutItem[];
}

export async function createOrder(data: CheckoutData) {
  // 1. Verify cart items
  const variants = await prisma.variant.findMany({
    where: {
      id: { in: data.items.map((i) => i.variantId) },
      active: true,
    },
    include: { product: true },
  });

  if (variants.length === 0) {
    throw new Error("Košík je prázdný.");
  }

  // 2. Validate stock + calculate allocation
  const allocations = data.items.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) throw new Error(`Varianta nenalezena.`);
    if (totalStock(variant) < item.quantity) {
      throw new Error(`Nedostatek skladem: ${variant.product.name} (${variant.title})`);
    }
    const alloc = allocateStock(variant, item.quantity);
    return { ...item, variant, ...alloc };
  });

  const needsSupplier = allocations.some((a) => a.fromSupplier > 0);

  // 3. Calculate totals
  const orderItems = allocations.map((a) => ({
    productId: a.variant.productId,
    variantId: a.variant.id,
    productName: a.variant.product.name,
    variantTitle: a.variant.title,
    sku: a.variant.sku,
    quantity: a.quantity,
    unitPrice: a.variant.price,
    totalPrice: a.variant.price * a.quantity,
    fromOwnStock: a.fromOwn,
    fromSupplierStock: a.fromSupplier,
  }));

  const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);

  // 4. Validate & apply discount code
  let discountAmount = 0;
  let discountCodeStr: string | null = null;
  if (data.discountCode) {
    const code = data.discountCode.trim().toUpperCase();
    const discount = await prisma.discountCode.findUnique({ where: { code } });
    if (discount && discount.active) {
      const now = new Date();
      const validDate = (!discount.validFrom || now >= discount.validFrom) &&
        (!discount.validTo || now <= discount.validTo);
      const validUsage = !discount.usageLimit || discount.usageCount < discount.usageLimit;
      const validMin = !discount.minOrderAmount || subtotal >= discount.minOrderAmount;

      if (validDate && validUsage && validMin) {
        discountCodeStr = discount.code;
        if (discount.type === "percentage") {
          discountAmount = Math.round((subtotal * discount.value) / 100);
        } else {
          discountAmount = discount.value;
        }
        if (discountAmount > subtotal) discountAmount = subtotal;

        await prisma.discountCode.update({
          where: { id: discount.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }
  }

  // 5. Get shipping method
  const shippingMethod = await prisma.shippingMethod.findUnique({
    where: { id: data.shippingMethodId },
  });
  if (!shippingMethod) throw new Error("Neplatná doprava.");

  const shippingPrice =
    shippingMethod.freeFrom && subtotal >= shippingMethod.freeFrom
      ? 0
      : shippingMethod.price;

  const total = subtotal - discountAmount + shippingPrice;

  // 6. Get current user
  const user = await getCurrentUser();

  // 7. Create order
  const orderNumber = await generateOrderNumber();
  const viewToken = crypto.randomUUID();
  const order = await prisma.order.create({
    data: {
      orderNumber,
      viewToken,
      email: data.email,
      phone: data.phone || null,
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      city: data.city,
      zip: data.zip,
      shippingName: data.differentShipping ? data.shippingName || null : null,
      shippingStreet: data.differentShipping ? data.shippingStreet || null : null,
      shippingCity: data.differentShipping ? data.shippingCity || null : null,
      shippingZip: data.differentShipping ? data.shippingZip || null : null,
      shippingId: shippingMethod.id,
      shippingPrice,
      pickupPointId: data.pickupPointId || null,
      pickupPointName: data.pickupPointName || null,
      paymentMethod: data.paymentMethod,
      subtotal,
      discountCode: discountCodeStr,
      discountAmount,
      total,
      note: data.note || null,
      userId: user?.id || null,
      needsSupplierOrder: needsSupplier,
      items: { create: orderItems },
    },
  });

  // 7. Decrement stock (own first, then supplier)
  for (const a of allocations) {
    await prisma.variant.update({
      where: { id: a.variant.id },
      data: {
        ownStock: { decrement: a.fromOwn },
        supplierStock: { decrement: a.fromSupplier },
      },
    });
  }

  // 8. Send order confirmation email (fire-and-forget)
  sendEmail({
    to: data.email,
    subject: `Objednávka #${orderNumber} byla přijata`,
    react: OrderConfirmation({
      orderNumber,
      firstName: data.firstName,
      items: orderItems,
      subtotal,
      discountCode: discountCodeStr || undefined,
      discountAmount: discountAmount || undefined,
      shippingPrice,
      shippingName: shippingMethod.name,
      total,
      paymentMethod: data.paymentMethod,
      street: data.street,
      city: data.city,
      zip: data.zip,
      shippingStreet: data.differentShipping ? data.shippingStreet || undefined : undefined,
      shippingCity: data.differentShipping ? data.shippingCity || undefined : undefined,
      shippingZip: data.differentShipping ? data.shippingZip || undefined : undefined,
      shippingRecipient: data.differentShipping ? data.shippingName || undefined : undefined,
      pickupPointName: data.pickupPointName || undefined,
      phone: data.phone || undefined,
      createdAt: new Date().toLocaleDateString("cs-CZ", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      }),
      viewToken,
    }),
  });

  // 8b. Send admin notification email (fire-and-forget)
  const adminEmail = process.env.ADMIN_EMAIL || "obchod@qsport.cz";
  sendEmail({
    to: adminEmail,
    subject: `Nová objednávka #${orderNumber}`,
    react: AdminNewOrder({
      orderNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      items: orderItems,
      subtotal,
      discountCode: discountCodeStr || undefined,
      discountAmount: discountAmount || undefined,
      shippingPrice,
      shippingName: shippingMethod.name,
      total,
      paymentMethod: data.paymentMethod,
      needsSupplier,
      street: data.street,
      city: data.city,
      zip: data.zip,
      pickupPointName: data.pickupPointName || undefined,
    }),
  });

  // 9. Mark abandoned checkouts as recovered
  if (data.email) {
    prisma.abandonedCheckout.updateMany({
      where: {
        email: data.email,
        status: { in: ["OPEN", "EMAIL_SENT"] },
      },
      data: {
        status: "RECOVERED",
        recoveredOrderId: order.id,
        recoveredAt: new Date(),
      },
    }).catch(() => {}); // fire-and-forget
  }

  // 10. Payment routing
  if (data.paymentMethod === "card") {
    try {
      const payment = await createPayment({
        price: total,
        refId: orderNumber,
        email: data.email,
        label: `Qsport.cz – ${orderNumber}`,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { comgateTransId: payment.transId },
      });

      redirect(payment.redirect);
    } catch (e: unknown) {
      // If Comgate fails, still create order as transfer
      if (e && typeof e === "object" && "digest" in e) throw e; // re-throw Next.js redirect
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentMethod: "transfer", status: "CONFIRMED" },
      });
      redirect(`/objednavka/${order.orderNumber}?new=1&fallback=1&token=${viewToken}`);
    }
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });
    redirect(`/objednavka/${order.orderNumber}?new=1&token=${viewToken}`);
  }
}
