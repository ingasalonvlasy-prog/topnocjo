import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvEscape(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const header = "Kód,Typ,Sleva,Použití,Limit,Platnost od,Platnost do,Stav";
  const rows = codes.map((c) => {
    const expired = c.validTo && now > c.validTo;
    const exhausted = c.usageLimit && c.usageCount >= c.usageLimit;
    const status = !c.active ? "Neaktivní" : expired ? "Vypršel" : exhausted ? "Vyčerpán" : "Aktivní";
    const discount = c.type === "percentage" ? `${c.value} %` : `${(c.value / 100).toFixed(2)} Kč`;
    const fmtDate = (d: Date | null) =>
      d ? d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "";

    return [
      csvEscape(c.code),
      c.type === "percentage" ? "Procenta" : "Fixní",
      csvEscape(discount),
      String(c.usageCount),
      c.usageLimit ? String(c.usageLimit) : "",
      fmtDate(c.validFrom),
      fmtDate(c.validTo),
      status,
    ].join(",");
  });

  const bom = "\uFEFF";
  const csv = bom + header + "\n" + rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="slevy-export-${now.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
