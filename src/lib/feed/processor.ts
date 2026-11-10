import type { FeedFieldMapping, FeedParseResult } from "./types";
import { parseXmlFeed } from "./parsers/xml";
import { parseCsvFeed } from "./parsers/csv";
import { parseJsonFeed } from "./parsers/json";

export async function fetchAndParseFeed(supplier: {
  feedUrl: string;
  feedFormat: string;
  feedConfig: string;
}): Promise<FeedParseResult> {
  const mapping: FeedFieldMapping = JSON.parse(supplier.feedConfig);

  const response = await fetch(supplier.feedUrl, {
    headers: { "User-Agent": "QsportFeedBot/1.0" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Feed HTTP ${response.status}: ${response.statusText}`);
  }

  switch (supplier.feedFormat) {
    case "xml": {
      const text = await response.text();
      return parseXmlFeed(text, mapping);
    }
    case "csv": {
      const buffer = Buffer.from(await response.arrayBuffer());
      return parseCsvFeed(buffer, mapping);
    }
    case "json": {
      const text = await response.text();
      return parseJsonFeed(text, mapping);
    }
    default:
      throw new Error(`Unknown feed format: ${supplier.feedFormat}`);
  }
}
