import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runFeedImport, runAllFeedImports } from "@/lib/feed";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const supplierCode = url.searchParams.get("supplier");

  try {
    if (supplierCode) {
      const supplier = await prisma.supplier.findUnique({ where: { code: supplierCode } });
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
      const result = await runFeedImport(supplier.id);
      return NextResponse.json(result);
    }

    const results = await runAllFeedImports();
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
