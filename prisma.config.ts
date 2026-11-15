import path from "node:path";
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
// For Turso libsql:// URLs, Prisma CLI needs a dummy sqlite URL
// (actual connection goes through the libsql adapter at runtime)
const datasourceUrl = url.startsWith("libsql://") ? "file:./prisma/dev.db" : url;

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: datasourceUrl,
  },
});
