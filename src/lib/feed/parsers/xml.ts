import { XMLParser } from "fast-xml-parser";
import type { FeedFieldMapping, FeedParseResult } from "../types";
import { mapToFeedItems, getNestedValue } from "./shared";

export function parseXmlFeed(raw: string, mapping: FeedFieldMapping): FeedParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
  });
  const parsed = parser.parse(raw);

  const items = getNestedValue(parsed, mapping.xmlItemPath || "products.product");
  const arr = Array.isArray(items) ? items : items ? [items] : [];

  return mapToFeedItems(arr, mapping);
}
