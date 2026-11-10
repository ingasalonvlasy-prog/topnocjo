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
