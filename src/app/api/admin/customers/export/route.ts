import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      orders: { select: { total: true, paymentStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Jméno,Příjmení,Email,Telefon,Adresa,Registrace,Objednávky,Útrata (Kč),Newsletter\n";
  const rows = users
    .map((u) => {
      const paidTotal = u.orders
        .filter((o) => o.paymentStatus === "PAID")
        .reduce((s, o) => s + o.total, 0);
      return [
        u.firstName || "",
        u.lastName || "",
        u.email,
        u.phone || "",
        [u.street, u.city, u.zip].filter(Boolean).join(" "),
        u.createdAt.toISOString().slice(0, 10),
        u.orders.length,
        (paidTotal / 100).toFixed(0),
        u.newsletter ? "Ano" : "Ne",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    })
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zakaznici-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
