import { prisma } from "@/lib/db";
import type { FeedItem } from "./types";

export async function importFeedItems(
  items: FeedItem[],
  supplier: { id: string; code: string },
): Promise<{ updated: number; created: number; zeroed: number; errors: string[] }> {
  let updated = 0;
  const created = 0;
  const errors: string[] = [];
  const processedSkus: string[] = [];

  for (const item of items) {
    try {
      processedSkus.push(item.sku);

      const existing = await prisma.variant.findUnique({
        where: { sku: item.sku },
      });

      if (existing) {
        await prisma.variant.update({
          where: { id: existing.id },
          data: {
            supplierStock: Math.max(0, item.stock),
            price: item.price,
            comparePrice: item.comparePrice ?? existing.comparePrice,
          },
        });
        updated++;
      } else {
        errors.push(`SKU ${item.sku}: no matching variant found, skipped`);
      }
    } catch (e) {
      errors.push(`SKU ${item.sku}: ${(e as Error).message}`);
    }
  }

  // Variants from this supplier NOT in feed → supplierStock = 0
  const zeroed = processedSkus.length > 0
    ? await prisma.variant.updateMany({
        where: {
          sku: { notIn: processedSkus },
          product: { sourceId: { startsWith: supplier.code } },
          supplierStock: { gt: 0 },
        },
        data: { supplierStock: 0 },
      })
    : { count: 0 };

  return { updated, created, zeroed: zeroed.count, errors };
}
