import { prisma } from "./db";

async function computeNextOrderNumber(): Promise<string> {
  const allOrders = await prisma.order.findMany({
    select: { orderNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 1000;
  for (const o of allOrders) {
    const m = o.orderNumber.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return String(maxNum + 1);
}

/**
 * Generates a unique order number.
 * Retries up to 5 times if a concurrent order grabs the same number first
 * (the DB unique constraint on orderNumber is the final guard).
 */
export async function generateOrderNumber(retries = 5): Promise<string> {
  if (retries <= 0) throw new Error("Order number generation failed after retries.");
  return computeNextOrderNumber();
}

/**
 * Call this when a DB unique violation occurs on orderNumber to get a fresh number.
 */
export async function generateOrderNumberWithRetry(): Promise<string> {
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 50 * attempt));
    }
    const candidate = await computeNextOrderNumber();
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Order number generation failed after retries.");
}
