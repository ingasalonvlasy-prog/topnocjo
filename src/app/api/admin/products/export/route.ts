import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: {
      brand: true,
      variants: { where: { active: true } },
      categories: { include: { category: true } },
    },
    orderBy: { name: "asc" },
  });

  function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  const header = ["Název", "Značka", "Typ", "Kategorie", "Stav", "Varianty", "Sklad", "Nejnižší cena (Kč)"];
  const rows = products.map((p) => {
    const totalStock = p.variants.reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
    const minPrice = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price)) : 0;
    const cats = p.categories.map((pc) => pc.category.name).join("; ");
    return [
      csvEscape(p.name),
      csvEscape(p.brand.name),
      p.productType || "",
      csvEscape(cats),
      p.status,
      String(p.variants.length),
      String(totalStock),
      (minPrice / 100).toFixed(2).replace(".", ","),
    ];
  });

  const BOM = "\uFEFF";
  const csv = BOM + [header.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produkty-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
