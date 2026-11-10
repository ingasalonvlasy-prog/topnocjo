import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ products: [] });
  }

  const ids = idsParam.split(",").filter(Boolean).slice(0, 10);
  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      status: "ACTIVE",
    },
    include: {
      variants: { where: { active: true }, orderBy: { position: "asc" } },
      brand: true,
      categories: { include: { category: true } },
    },
  });

  // Preserve requested order
  const sorted = ids
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  return NextResponse.json({ products: sorted });
}
