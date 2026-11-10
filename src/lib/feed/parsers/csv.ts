import Papa from "papaparse";
import type { FeedFieldMapping, FeedParseResult } from "../types";
import { mapToFeedItems } from "./shared";

export function parseCsvFeed(raw: string | Buffer, mapping: FeedFieldMapping): FeedParseResult {
  const text = typeof raw === "string"
    ? raw
    : new TextDecoder(mapping.csvEncoding || "utf-8").decode(raw);

  const result = Papa.parse(text, {
    header: true,
    delimiter: mapping.csvDelimiter || ",",
    skipEmptyLines: true,
  });

  return mapToFeedItems(result.data as Record<string, string>[], mapping);
}
