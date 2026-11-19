/**
 * Direct SQLite → Turso migration via libsql client
 * Reads from local SQLite file, writes to Turso in batches
 */
import { createClient } from "@libsql/client";

const BATCH_SIZE = 100;

// Source: local SQLite
const localUrl = "file:./prisma/dev.db";
const local = createClient({ url: localUrl });

// Target: Turso production
const tursoUrl = process.env.TURSO_URL || process.env.DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing TURSO_URL/DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const remote = createClient({ url: tursoUrl, authToken: tursoToken });

// Test connections
try {
  await local.execute("SELECT 1");
  console.log("Local SQLite: OK");
} catch (err) {
  console.error("Local SQLite failed:", err.message);
  process.exit(1);
}

try {
  await remote.execute("SELECT 1");
  console.log("Turso remote: OK");
} catch (err) {
  console.error("Turso connection failed:", err.message);
  process.exit(1);
}

// Get all tables from local
const tablesRes = await local.execute(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
);
const tables = tablesRes.rows;
console.log(`\nFound ${tables.length} tables in local DB`);

// Get indexes
const indexesRes = await local.execute(
  "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
);
const indexes = indexesRes.rows.map((r) => r.sql);

// Step 1: Drop existing tables on Turso
console.log("\n--- Step 1: Cleaning Turso ---");
await remote.execute("PRAGMA foreign_keys = OFF;");

const remoteTables = await remote.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' AND name NOT LIKE 'libsql_%'"
);
for (const row of remoteTables.rows) {
  try {
    await remote.execute(`DROP TABLE IF EXISTS "${row.name}";`);
    console.log(`  Dropped: ${row.name}`);
  } catch (err) {
    console.error(`  Drop error ${row.name}: ${err.message.slice(0, 80)}`);
  }
}

// Step 2: Create tables on Turso
console.log("\n--- Step 2: Creating tables ---");
for (const table of tables) {
  try {
    await remote.execute(table.sql + ";");
    console.log(`  Created: ${table.name}`);
  } catch (err) {
    console.error(`  Error creating ${table.name}: ${err.message.slice(0, 100)}`);
  }
}

// Step 3: Create indexes
console.log("\n--- Step 3: Creating indexes ---");
for (const sql of indexes) {
  try {
    await remote.execute(sql + ";");
  } catch (err) {
    if (!err.message?.includes("already exists")) {
      console.error(`  Index error: ${err.message.slice(0, 100)}`);
    }
  }
}
console.log(`  ${indexes.length} indexes processed`);

// Step 4: Copy data table by table
// Order matters for FK constraints
const tableOrder = [
  "brands",
  "categories",
  "users",
  "products",
  "variants",
  "product_categories",
  "shipping_methods",
  "orders",
  "order_items",
  "order_events",
  "blog_posts",
];

// Add any tables not in the predefined order
const allTableNames = tables.map((t) => t.name);
for (const name of allTableNames) {
  if (!tableOrder.includes(name)) {
    tableOrder.push(name);
  }
}

console.log(`\n--- Step 4: Copying data ---`);
let grandTotal = 0;
let grandErrors = 0;

for (const tableName of tableOrder) {
  if (!allTableNames.includes(tableName)) continue;

  // Get row count
  const countRes = await local.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
  const totalRows = Number(countRes.rows[0].cnt);

  if (totalRows === 0) {
    console.log(`  ${tableName}: 0 rows (skip)`);
    continue;
  }

  console.log(`  ${tableName}: ${totalRows} rows`);

  // Get column names
  const colsRes = await local.execute(`PRAGMA table_info("${tableName}")`);
  const columns = colsRes.rows.map((r) => r.name);
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  let offset = 0;
  let tableSuccess = 0;
  let tableErrors = 0;

  while (offset < totalRows) {
    // Read batch from local
    const rows = await local.execute(
      `SELECT ${colList} FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
    );

    if (rows.rows.length === 0) break;

    // Build batch insert statements
    const batchStmts = rows.rows.map((row) => {
      const values = columns.map((col) => row[col]);
      return {
        sql: `INSERT OR IGNORE INTO "${tableName}" (${colList}) VALUES (${placeholders});`,
        args: values,
      };
    });

    try {
      await remote.batch(batchStmts, "write");
      tableSuccess += rows.rows.length;
    } catch (err) {
      // Fallback: insert one by one
      for (const stmt of batchStmts) {
        try {
          await remote.execute(stmt);
          tableSuccess++;
        } catch (innerErr) {
          tableErrors++;
          if (tableErrors <= 3) {
            console.error(`    Error: ${innerErr.message.slice(0, 100)}`);
          }
        }
      }
    }

    offset += BATCH_SIZE;

    // Progress every 50 batches
    if (offset % (BATCH_SIZE * 50) === 0 || offset >= totalRows) {
      const pct = Math.min(100, Math.round((offset / totalRows) * 100));
      console.log(`    ${pct}% (${Math.min(offset, totalRows)}/${totalRows})`);
    }
  }

  console.log(
    `    Done: ${tableSuccess} OK${tableErrors > 0 ? `, ${tableErrors} errors` : ""}`
  );
  grandTotal += tableSuccess;
  grandErrors += tableErrors;
}

// Re-enable FK
await remote.execute("PRAGMA foreign_keys = ON;");

console.log(`\n========================================`);
console.log(`Migration complete!`);
console.log(`  Total rows: ${grandTotal}`);
console.log(`  Errors: ${grandErrors}`);
console.log(`========================================`);

// Verify
console.log("\n--- Verification ---");
for (const tableName of tableOrder) {
  if (!allTableNames.includes(tableName)) continue;
  try {
    const localCount = await local.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
    const remoteCount = await remote.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
    const lc = Number(localCount.rows[0].cnt);
    const rc = Number(remoteCount.rows[0].cnt);
    const status = lc === rc ? "✅" : "❌";
    console.log(`  ${status} ${tableName}: local=${lc}, turso=${rc}`);
  } catch (err) {
    console.log(`  ❌ ${tableName}: ${err.message.slice(0, 60)}`);
  }
}

local.close();
remote.close();
