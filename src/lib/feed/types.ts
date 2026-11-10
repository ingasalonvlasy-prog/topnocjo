export interface FeedFieldMapping {
  sku: string;
  name?: string;
  size?: string;
  color?: string;
  price: string;
  comparePrice?: string;
  stock: string;
  csvDelimiter?: string;
  csvEncoding?: string;
  xmlItemPath?: string;
  jsonItemPath?: string;
  priceMultiplier?: number;
  priceInCents?: boolean;
  stockMapping?: Record<string, number>;
}

export interface FeedItem {
  sku: string;
  name?: string;
  size?: string;
  color?: string;
  price: number;
  comparePrice?: number;
  stock: number;
}

export interface FeedParseResult {
  items: FeedItem[];
  errors: string[];
  rawCount: number;
}

export interface FeedImportResult {
  updated: number;
  created: number;
  zeroed: number;
  errors: string[];
  durationMs: number;
}
