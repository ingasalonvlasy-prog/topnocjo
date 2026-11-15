import { prisma } from "./db";

export async function generateOrderNumber(): Promise<string> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  // Parse highest number from existing orders
  let maxNum = 1000;
  if (lastOrder) {
    // Handle both old format (QS-YYYYMMDD-NNNN) and new format (NNNN)
    const match = lastOrder.orderNumber.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNum) maxNum = num;
    }
  }

  // Also check ALL orders to find true max (migration safety)
  const allOrders = await prisma.order.findMany({
    select: { orderNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  for (const o of allOrders) {
    const m = o.orderNumber.match(/^(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return String(maxNum + 1);
}
