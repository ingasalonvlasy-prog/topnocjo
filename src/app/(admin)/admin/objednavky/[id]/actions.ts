"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ORDER_STATUS_TRANSITIONS, ORDER_STATUS_LABELS } from "@/lib/order-constants";
import type { OrderStatus } from "@/lib/order-constants";
import { sendEmail } from "@/lib/email";
import { OrderShipped } from "@/lib/emails/order-shipped";
import { OrderCancelled } from "@/lib/emails/order-cancelled";
import { OrderDelivered } from "@/lib/emails/order-delivered";
import { ReviewInvitation } from "@/lib/emails/review-invitation";
import { logAdminAction } from "@/lib/admin-log";
import { logOrderEvent } from "@/lib/order-events";
import { createZasilkovnaPacket } from "@/lib/zasilkovna";
import { requireAdmin } from "@/lib/auth";

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const newStatus = formData.get("newStatus") as OrderStatus;

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const currentStatus = order.status as OrderStatus;

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Nelze změnit stav z ${currentStatus} na ${newStatus}`);
  }

  const data: Record<string, unknown> = { status: newStatus };
  if (newStatus === "SHIPPED") data.shippedAt = new Date();
  if (newStatus === "DELIVERED") data.deliveredAt = new Date();
  if (newStatus === "CANCELLED") data.cancelledAt = new Date();

  await prisma.order.update({ where: { id: orderId }, data });

  logAdminAction("status_change", "order", orderId, `${order.orderNumber}: ${currentStatus} → ${newStatus}`);

  logOrderEvent({
    orderId,
    type: "status_change",
    title: `Stav změněn: ${ORDER_STATUS_LABELS[currentStatus] || currentStatus} → ${ORDER_STATUS_LABELS[newStatus] || newStatus}`,
    detail: { from: currentStatus, to: newStatus },
  });

  // Send email notifications (fire-and-forget)
  if (newStatus === "SHIPPED") {
    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { shipping: true },
    });
    sendEmail({
      to: updatedOrder.email,
      subject: `Objednávka ${updatedOrder.orderNumber} byla odeslána`,
      react: OrderShipped({
        orderNumber: updatedOrder.orderNumber,
        firstName: updatedOrder.firstName,
        shippingName: updatedOrder.shipping.name,
        trackingNumber: updatedOrder.trackingNumber || undefined,
        trackingUrl: updatedOrder.trackingUrl || undefined,
        viewToken: updatedOrder.viewToken || undefined,
      }),
    });

    // Auto-create Zásilkovna packet if applicable
    if (updatedOrder.shipping.code === "zasilkovna" && updatedOrder.pickupPointId) {
      const shippingConfig = JSON.parse(updatedOrder.shipping.config || "{}");
      if (shippingConfig.apiKey) {
        createZasilkovnaPacket({
          apiKey: shippingConfig.apiKey,
          orderNumber: updatedOrder.orderNumber,
          firstName: updatedOrder.firstName,
          lastName: updatedOrder.lastName,
          email: updatedOrder.email,
          phone: updatedOrder.phone || "",
          addressId: parseInt(updatedOrder.pickupPointId, 10),
          value: updatedOrder.paymentMethod === "cod" ? Math.round(updatedOrder.total / 100) : 0,
          weight: 1,
          senderLabel: shippingConfig.senderLabel,
        }).then((result) => {
          if (result.success && result.packetId) {
            prisma.order.update({
              where: { id: orderId },
              data: {
                trackingNumber: result.packetId,
                trackingUrl: `https://tracking.packeta.com/cs/?id=${result.packetId}`,
              },
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    }
  }

  if (newStatus === "DELIVERED") {
    sendEmail({
      to: order.email,
      subject: `Objednávka ${order.orderNumber} byla doručena`,
      react: OrderDelivered({
        orderNumber: order.orderNumber,
        firstName: order.firstName,
        viewToken: order.viewToken || undefined,
      }),
    });

    // Review invitation email (fire-and-forget)
    prisma.orderItem.findMany({
      where: { orderId },
      select: { productName: true, productId: true },
    }).then(async (orderItems) => {
      const productIds = orderItems.filter((i) => i.productId).map((i) => i.productId!);
      if (productIds.length === 0) return;
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, slug: true },
      });
      const slugMap = new Map(products.map((p) => [p.id, p.slug]));
      const items = orderItems
        .filter((i) => i.productId && slugMap.has(i.productId))
        .map((i) => ({ name: i.productName, slug: slugMap.get(i.productId!)! }));
      if (items.length > 0) {
        sendEmail({
          to: order.email,
          subject: `Jak jste spokojeni s objednávkou #${order.orderNumber}?`,
          react: ReviewInvitation({
            orderNumber: order.orderNumber,
            firstName: order.firstName,
            items,
          }),
        });
      }
    }).catch(() => {});
  }

  if (newStatus === "CANCELLED") {
    sendEmail({
      to: order.email,
      subject: `Objednávka ${order.orderNumber} byla zrušena`,
      react: OrderCancelled({
        orderNumber: order.orderNumber,
        firstName: order.firstName,
        total: order.total,
        wasPaid: order.paymentStatus === "PAID",
      }),
    });
  }

  revalidatePath(`/admin/objednavky/${orderId}`);
  revalidatePath("/admin/objednavky");
}

export async function updateTracking(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const trackingNumber = (formData.get("trackingNumber") as string)?.trim() || null;
  let trackingUrl = (formData.get("trackingUrl") as string)?.trim() || null;

  // Auto-generate URL if not provided
  if (trackingNumber && !trackingUrl) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { shipping: true },
    });

    if (order.shipping?.code === "zasilkovna") {
      trackingUrl = `https://tracking.packeta.com/cs/?id=${trackingNumber}`;
    } else if (order.shipping?.code === "gls") {
      trackingUrl = `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${trackingNumber}`;
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { trackingNumber, trackingUrl },
  });

  logOrderEvent({
    orderId,
    type: "tracking",
    title: trackingNumber ? `Tracking přidán: ${trackingNumber}` : "Tracking odebrán",
    detail: { trackingNumber, trackingUrl },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}

export async function updateAdminNote(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const adminNote = (formData.get("adminNote") as string)?.trim() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: { adminNote },
  });

  logOrderEvent({
    orderId,
    type: "note",
    title: "Admin poznámka upravena",
    detail: { text: adminNote || "" },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}

export async function markSupplierOrdered(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      supplierOrderedAt: new Date(),
      status: "AWAITING_SUPPLIER",
    },
  });

  logAdminAction("status_change", "order", orderId, "Objednáno u dodavatele");

  logOrderEvent({
    orderId,
    type: "supplier",
    title: "Objednáno od dodavatele",
    detail: { action: "ordered" },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
  revalidatePath("/admin/objednavky");
}

export async function markSupplierReceived(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      supplierReceivedAt: new Date(),
      status: "PROCESSING",
    },
  });

  logAdminAction("status_change", "order", orderId, "Přijato od dodavatele");

  logOrderEvent({
    orderId,
    type: "supplier",
    title: "Zboží přijato od dodavatele",
    detail: { action: "received" },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
  revalidatePath("/admin/objednavky");
}

export async function addComment(formData: FormData) {
  await requireAdmin();
  const orderId = formData.get("orderId") as string;
  const text = (formData.get("text") as string)?.trim();

  if (!text) return;

  await logOrderEvent({
    orderId,
    type: "comment",
    title: "Interní komentář",
    detail: { text, internal: true },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}
