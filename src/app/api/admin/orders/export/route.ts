import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const paymentStatus = sp.get("paymentStatus") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const search = sp.get("search") || "";

  // Build where clause (same logic as admin orders page)
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59");
    where.createdAt = createdAt;
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: { shipping: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  // CSV header
  const headers = [
    "Číslo",
    "Datum",
    "Zákazník",
    "Email",
    "Telefon",
    "Status",
    "Platba",
    "Způsob platby",
    "Doprava",
    "Mezisoučet",
    "Dopravné",
    "Sleva",
    "Celkem",
    "Položky",
  ];

  function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function formatCZK(halere: number): string {
    return (halere / 100).toFixed(2).replace(".", ",");
  }

  const rows = orders.map((order) => {
    const statusLabel =
      ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status;
    const paymentLabel =
      PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ||
      order.paymentStatus;
    const methodLabel =
      PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod;
    const shippingName = order.shipping?.name || "-";
    const items = order.items
      .map((i) => `${i.quantity}x ${i.productName} (${i.variantTitle})`)
      .join("; ");

    return [
      order.orderNumber,
      order.createdAt.toLocaleDateString("cs-CZ"),
      `${order.firstName} ${order.lastName}`,
      order.email,
      order.phone || "",
      statusLabel,
      paymentLabel,
      methodLabel,
      shippingName,
      formatCZK(order.subtotal),
      formatCZK(order.shippingPrice),
      formatCZK(order.discountAmount),
      formatCZK(order.total),
      items,
    ].map(csvEscape);
  });

  // UTF-8 BOM for Excel
  const BOM = "\uFEFF";
  const csv =
    BOM +
    headers.map(csvEscape).join(",") +
    "\n" +
    rows.map((r) => r.join(",")).join("\n");

  const date = new Date().toISOString().slice(0, 10);
  const filename = `objednavky-${date}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
