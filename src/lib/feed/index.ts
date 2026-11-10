import { prisma } from "@/lib/db";
import { fetchAndParseFeed } from "./processor";
import { importFeedItems } from "./importer";
import type { FeedImportResult } from "./types";

export type { FeedImportResult } from "./types";

export async function runFeedImport(supplierId: string): Promise<FeedImportResult> {
  const start = Date.now();
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  try {
    const parseResult = await fetchAndParseFeed(supplier);
    const importResult = await importFeedItems(parseResult.items, supplier);
    const duration = Date.now() - start;

    await prisma.feedImportLog.create({
      data: {
        supplierId: supplier.id,
        status: importResult.errors.length > 0 ? "partial" : "success",
        variantsUpdated: importResult.updated,
        variantsCreated: importResult.created,
        variantsZeroed: importResult.zeroed,
        duration,
        error: importResult.errors.length > 0 ? importResult.errors.slice(0, 20).join("; ") : null,
      },
    });

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        lastImportAt: new Date(),
        lastImportStatus: importResult.errors.length > 0 ? "partial" : "success",
        lastImportCount: importResult.updated + importResult.created,
        lastImportError: null,
      },
    });

    return { ...importResult, durationMs: duration };
  } catch (e) {
    const duration = Date.now() - start;
    const errorMsg = (e as Error).message;

    await prisma.feedImportLog.create({
      data: {
        supplierId: supplier.id,
        status: "error",
        duration,
        error: errorMsg,
      },
    });

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        lastImportAt: new Date(),
        lastImportStatus: "error",
        lastImportError: errorMsg,
      },
    });

    throw e;
  }
}

export async function runAllFeedImports(): Promise<Record<string, FeedImportResult>> {
  const suppliers = await prisma.supplier.findMany({ where: { active: true } });
  const results: Record<string, FeedImportResult> = {};

  for (const supplier of suppliers) {
    try {
      results[supplier.code] = await runFeedImport(supplier.id);
    } catch (e) {
      results[supplier.code] = {
        updated: 0,
        created: 0,
        zeroed: 0,
        errors: [(e as Error).message],
        durationMs: 0,
      };
    }
  }

  return results;
}
