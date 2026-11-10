import type { FeedItem, FeedFieldMapping, FeedParseResult } from "../types";

export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function mapToFeedItems(rawItems: unknown[], mapping: FeedFieldMapping): FeedParseResult {
  const items: FeedItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    try {
      const raw = rawItems[i];
      const sku = String(getNestedValue(raw, mapping.sku) || "").trim();
      if (!sku) {
        errors.push(`Row ${i}: missing SKU`);
        continue;
      }

      let price = parseFloat(String(getNestedValue(raw, mapping.price) || "0"));
      if (mapping.priceMultiplier) price *= mapping.priceMultiplier;
      const priceInCents = mapping.priceInCents
        ? Math.round(price)
        : Math.round(price * 100);

      let stock: number;
      const rawStock = getNestedValue(raw, mapping.stock);
      if (mapping.stockMapping && typeof rawStock === "string") {
        stock = mapping.stockMapping[rawStock.toLowerCase()] ?? 0;
      } else {
        stock = Math.max(0, parseInt(String(rawStock || "0")) || 0);
      }

      let comparePrice: number | undefined;
      if (mapping.comparePrice) {
        const cp = parseFloat(String(getNestedValue(raw, mapping.comparePrice) || "0"));
        if (cp > 0) {
          comparePrice = mapping.priceInCents ? Math.round(cp) : Math.round(cp * 100);
        }
      }

      items.push({
        sku,
        name: mapping.name ? String(getNestedValue(raw, mapping.name) || "") || undefined : undefined,
        size: mapping.size ? String(getNestedValue(raw, mapping.size) || "") || undefined : undefined,
        color: mapping.color ? String(getNestedValue(raw, mapping.color) || "") || undefined : undefined,
        price: priceInCents,
        comparePrice,
        stock,
      });
    } catch (e) {
      errors.push(`Row ${i}: ${(e as Error).message}`);
    }
  }

  return { items, errors, rawCount: rawItems.length };
}
