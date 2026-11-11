import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", variants: { some: { active: true, ownStock: { gt: 0 } } } },
    include: {
      variants: { where: { active: true }, orderBy: { position: "asc" } },
      brand: true,
      categories: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Shuffle and pick 4
  const shuffled = products.sort(() => Math.random() - 0.5).slice(0, 4);

  return NextResponse.json({ products: shuffled });
}
