import type { FeedFieldMapping, FeedParseResult } from "../types";
import { mapToFeedItems, getNestedValue } from "./shared";

export function parseJsonFeed(raw: string, mapping: FeedFieldMapping): FeedParseResult {
  const parsed = JSON.parse(raw);

  const items = getNestedValue(parsed, mapping.jsonItemPath || "items");
  const arr = Array.isArray(items) ? items : items ? [items] : [];

  return mapToFeedItems(arr, mapping);
}
