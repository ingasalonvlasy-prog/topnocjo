type VariantStock = { ownStock: number; supplierStock: number };

/**
 * Stav dostupnosti pro zákazníka.
 * - "in_stock": máme na vlastním skladu — expedice 1-3 dny
 * - "on_order": nemáme, ale dodavatel ano — expedice 3-7 dní
 * - "out_of_stock": nikde — vyprodáno
 */
export type AvailabilityStatus = "in_stock" | "on_order" | "out_of_stock";

export function totalStock(variant: VariantStock): number {
  return variant.ownStock + variant.supplierStock;
}

export function isInStock(variant: VariantStock): boolean {
  return totalStock(variant) > 0;
}

export function getAvailability(variant: VariantStock): AvailabilityStatus {
  if (variant.ownStock > 0) return "in_stock";
  if (variant.supplierStock > 0) return "on_order";
  return "out_of_stock";
}

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "Skladem",
  on_order: "Na objednávku",
  out_of_stock: "Vyprodáno",
};

export const AVAILABILITY_DELIVERY: Record<AvailabilityStatus, string> = {
  in_stock: "Expedice 1–3 pracovní dny",
  on_order: "Expedice 3–7 pracovních dnů",
  out_of_stock: "",
};

/**
 * Rozděl požadované množství mezi ownStock a supplierStock.
 * Priorita: nejdřív ownStock, pak supplierStock.
 */
export function allocateStock(
  variant: VariantStock,
  quantity: number,
): { fromOwn: number; fromSupplier: number } {
  const total = totalStock(variant);
  if (total < quantity) {
    throw new Error("Nedostatek skladem");
  }
  const fromOwn = Math.min(variant.ownStock, quantity);
  const fromSupplier = quantity - fromOwn;
  return { fromOwn, fromSupplier };
}

/**
 * True pokud alespoň 1 položka se bere z supplierStock.
 */
export function orderNeedsSupplier(
  items: Array<{ variant: VariantStock; quantity: number }>,
): boolean {
  return items.some(({ variant, quantity }) => {
    const { fromSupplier } = allocateStock(variant, quantity);
    return fromSupplier > 0;
  });
}
