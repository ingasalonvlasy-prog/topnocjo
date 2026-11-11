import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
  });

  const BOM = "\uFEFF";
  const header = "Email,Stav,Datum přihlášení";
  const rows = subscribers.map((s) => {
    const email = `"${s.email.replace(/"/g, '""')}"`;
    return [
      email,
      s.active ? "Aktivní" : "Odhlášen",
      s.subscribedAt.toISOString().slice(0, 10),
    ].join(",");
  });

  const csv = BOM + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
