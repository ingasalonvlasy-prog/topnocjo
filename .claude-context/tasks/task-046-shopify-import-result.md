# TASK-046: Shopify Import — Results

## Import Summary

- **Date:** 2026-11-15
- **Duration:** 286s (~4.8 min)
- **Errors:** 0

## Final DB Counts

| Entity | Count |
|--------|-------|
| Products | 15,142 |
| Variants | 52,924 |
| Brands | 203 |
| Categories | 66 |
| Product-Category Mappings | 3,881 |

## What was imported

1. **Collections (59)** → Categories via custom_collections + smart_collections API
2. **Products (15,092)** → Products + Variants via products API with cursor-based pagination (250/page, 61 pages)
3. **Collects (3,881 mapped)** → ProductCategory relations via collects API (87 pages)

## Technical details

- Script: `scripts/import-shopify.ts`
- Run: `npx tsx scripts/import-shopify.ts` (or `--reset` for fresh)
- Resume: State saved to `scripts/.shopify-import-state.json` after each page
- Rate limiting: 520ms between requests (~2 req/sec)
- SKU dedup: In-memory Set pre-loaded before import
- Photos: Shopify CDN URLs stored as JSON array
- Prices: Stored as integers (CZK * 100, i.e. hellers)
- Stock: inventory_quantity → supplierStock, ownStock = 0

## Store details

- Store: zt2xr1-ry.myshopify.com
- API version: 2024-01
