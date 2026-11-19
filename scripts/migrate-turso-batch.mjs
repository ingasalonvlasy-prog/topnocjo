import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const BATCH_SIZE = 200; // Turso batch limit is ~1000, stay safe

const url = process.env.TURSO_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_URL/DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

console.log(`Connecting to: ${url.slice(0, 50)}...`);

const client = createClient({ url, authToken });

// Test connection
try {
  const r = await client.execute("SELECT 1");
  console.log("Connection OK");
} catch (err) {
  console.error("Connection failed:", err.message);
  process.exit(1);
}

const dumpFile = process.argv[2] || "/tmp/qsport-full-dump.sql";
console.log(`Reading dump: ${dumpFile}`);
const dump = readFileSync(dumpFile, "utf-8");

// Parse statements
const statements = dump
  .split(";\n")
  .map((s) => s.trim())
  .filter(
    (s) =>
      s.length > 0 &&
      !s.startsWith("BEGIN") &&
      !s.startsWith("COMMIT") &&
      !s.startsWith("PRAGMA") &&
      s !== ";"
  );

const creates = statements.filter(
  (s) => s.startsWith("CREATE TABLE") || s.startsWith('CREATE TABLE')
);
const indexes = statements.filter((s) => s.startsWith("CREATE INDEX") || s.startsWith("CREATE UNIQUE INDEX"));
const inserts = statements.filter((s) => s.startsWith("INSERT"));
const deletes = statements.filter((s) => s.startsWith("DELETE"));
const others = statements.filter(
  (s) =>
    !s.startsWith("CREATE") &&
    !s.startsWith("INSERT") &&
    !s.startsWith("DELETE")
);

console.log(
  `Parsed: ${creates.length} tables, ${indexes.length} indexes, ${inserts.length} inserts, ${deletes.length} deletes, ${others.length} other`
);

// Step 1: Drop existing tables (clean slate)
console.log("\n--- Step 1: Dropping existing tables ---");
// Get table list from Turso
const tablesResult = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' AND name NOT LIKE 'libsql_%'"
);
const existingTables = tablesResult.rows.map((r) => r.name);
console.log(`Found ${existingTables.length} existing tables: ${existingTables.join(", ")}`);

// Disable FK checks
await client.execute("PRAGMA foreign_keys = OFF;");

// Drop all tables
for (const table of existingTables) {
  try {
    await client.execute(`DROP TABLE IF EXISTS "${table}";`);
    console.log(`  Dropped: ${table}`);
  } catch (err) {
    console.error(`  Drop error for ${table}: ${err.message}`);
  }
}

// Step 2: Create tables
console.log("\n--- Step 2: Creating tables ---");
for (const stmt of creates) {
  try {
    await client.execute(stmt + ";");
    const tableName = stmt.match(/CREATE TABLE[^"]*"(\w+)"/)?.[1] || "?";
    console.log(`  Created: ${tableName}`);
  } catch (err) {
    console.error(`  Create error: ${err.message.slice(0, 120)}`);
  }
}

// Step 3: Create indexes
console.log("\n--- Step 3: Creating indexes ---");
for (const stmt of indexes) {
  try {
    await client.execute(stmt + ";");
  } catch (err) {
    if (!err.message?.includes("already exists")) {
      console.error(`  Index error: ${err.message.slice(0, 120)}`);
    }
  }
}
console.log(`  ${indexes.length} indexes processed`);

// Step 4: Batch insert data
console.log(`\n--- Step 4: Inserting ${inserts.length} rows in batches of ${BATCH_SIZE} ---`);

// Group inserts by table for ordered insertion (respect FK constraints)
const tableOrder = [
  "brands",
  "categories",
  "users",
  "products",
  "variants",
  "product_categories",
  "orders",
  "order_items",
  "order_events",
  "shipping_methods",
  "blog_posts",
];

const insertsByTable = {};
for (const stmt of inserts) {
  const tableName = stmt.match(/INSERT INTO (\w+)/)?.[1] || "unknown";
  if (!insertsByTable[tableName]) insertsByTable[tableName] = [];
  insertsByTable[tableName].push(stmt);
}

// Process tables in FK order
const processedTables = new Set();
let totalSuccess = 0;
let totalErrors = 0;

async function processTable(tableName, stmts) {
  if (processedTables.has(tableName)) return;
  processedTables.add(tableName);

  console.log(`\n  Table: ${tableName} (${stmts.length} rows)`);
  let tableSuccess = 0;
  let tableErrors = 0;

  for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
    const batch = stmts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(stmts.length / BATCH_SIZE);

    try {
      await client.batch(
        batch.map((s) => ({ sql: s + ";", args: [] })),
        "write"
      );
      tableSuccess += batch.length;

      // Progress every 10 batches or on last batch
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        const pct = Math.round((Math.min(i + BATCH_SIZE, stmts.length) / stmts.length) * 100);
        console.log(
          `    Batch ${batchNum}/${totalBatches} — ${pct}% (${tableSuccess}/${stmts.length})`
        );
      }
    } catch (err) {
      // If batch fails, try one by one
      console.log(`    Batch ${batchNum} failed, retrying individually...`);
      for (const stmt of batch) {
        try {
          await client.execute(stmt + ";");
          tableSuccess++;
        } catch (innerErr) {
          if (!innerErr.message?.includes("UNIQUE constraint")) {
            tableErrors++;
            if (tableErrors <= 5) {
              console.error(`    Error: ${innerErr.message.slice(0, 100)}`);
            }
          }
        }
      }
    }
  }

  console.log(`    Done: ${tableSuccess} OK, ${tableErrors} errors`);
  totalSuccess += tableSuccess;
  totalErrors += tableErrors;
}

// Process in order
for (const table of tableOrder) {
  if (insertsByTable[table]) {
    await processTable(table, insertsByTable[table]);
  }
}

// Process any remaining tables not in the order list
for (const [table, stmts] of Object.entries(insertsByTable)) {
  if (!processedTables.has(table)) {
    await processTable(table, stmts);
  }
}

// Re-enable FK
await client.execute("PRAGMA foreign_keys = ON;");

console.log(`\n========================================`);
console.log(`Migration complete!`);
console.log(`  Success: ${totalSuccess}`);
console.log(`  Errors: ${totalErrors}`);
console.log(`========================================`);

// Verify counts
console.log("\n--- Verification ---");
for (const table of tableOrder) {
  try {
    const result = await client.execute(`SELECT COUNT(*) as cnt FROM "${table}";`);
    console.log(`  ${table}: ${result.rows[0].cnt} rows`);
  } catch (err) {
    console.log(`  ${table}: ${err.message.slice(0, 60)}`);
  }
}

client.close();
