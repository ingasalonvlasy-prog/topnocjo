import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const checkout = await prisma.abandonedCheckout.findUnique({
    where: { recoveryToken: token },
  });

  if (!checkout || checkout.status === "EXPIRED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = JSON.parse(checkout.items);

  return NextResponse.json({
    email: checkout.email,
    phone: checkout.phone,
    firstName: checkout.firstName,
    lastName: checkout.lastName,
    items,
    subtotal: checkout.subtotal,
  });
}
