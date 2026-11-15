import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const dump = readFileSync("/tmp/qsport-dump.sql", "utf-8");

// Split by semicolons, filter empty
const statements = dump
  .split(";\n")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("BEGIN") && !s.startsWith("COMMIT"));

// Separate CREATE statements and INSERT statements
const creates = statements.filter((s) => s.startsWith("CREATE"));
const inserts = statements.filter((s) => s.startsWith("INSERT"));
const others = statements.filter((s) => !s.startsWith("CREATE") && !s.startsWith("INSERT"));

console.log(`Schema: ${creates.length} tables, Data: ${inserts.length} inserts, Other: ${others.length}`);

// Disable foreign keys during migration
await client.execute("PRAGMA foreign_keys = OFF;");

let success = 0;
let errors = 0;

// 1. Create tables first
for (const stmt of creates) {
  try {
    await client.execute(stmt + ";");
    success++;
    console.log(`CREATE OK: ${stmt.slice(0, 60)}...`);
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log(`SKIP (exists): ${stmt.slice(0, 60)}...`);
    } else {
      console.error(`ERROR: ${err.message?.slice(0, 100)}`);
      errors++;
    }
  }
}

// 2. Insert data
for (const stmt of inserts) {
  try {
    await client.execute(stmt + ";");
    success++;
  } catch (err) {
    if (err.message?.includes("UNIQUE constraint")) {
      // Skip duplicates
    } else {
      console.error(`INSERT ERROR: ${err.message?.slice(0, 100)}`);
      console.error(`  SQL: ${stmt.slice(0, 100)}...`);
      errors++;
    }
  }
}

// 3. Other statements (indexes etc)
for (const stmt of others) {
  try {
    await client.execute(stmt + ";");
    success++;
  } catch (err) {
    if (err.message?.includes("already exists")) {
      // Skip
    } else {
      console.error(`OTHER ERROR: ${err.message?.slice(0, 100)}`);
      errors++;
    }
  }
}

// Re-enable foreign keys
await client.execute("PRAGMA foreign_keys = ON;");

console.log(`\nDone: ${success} OK, ${errors} errors`);
client.close();
