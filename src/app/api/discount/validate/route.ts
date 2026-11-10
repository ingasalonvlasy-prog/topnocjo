import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { code, subtotal } = (await req.json()) as {
    code?: string;
    subtotal?: number;
  };

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Zadejte slevový kód." }, { status: 400 });
  }

  const discount = await prisma.discountCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!discount || !discount.active) {
    return NextResponse.json({ error: "Neplatný slevový kód." }, { status: 404 });
  }

  const now = new Date();
  if (discount.validFrom && now < discount.validFrom) {
    return NextResponse.json({ error: "Slevový kód ještě není platný." }, { status: 400 });
  }
  if (discount.validTo && now > discount.validTo) {
    return NextResponse.json({ error: "Slevový kód již vypršel." }, { status: 400 });
  }
  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
    return NextResponse.json({ error: "Slevový kód byl již vyčerpán." }, { status: 400 });
  }
  if (discount.minOrderAmount && subtotal && subtotal < discount.minOrderAmount) {
    return NextResponse.json(
      {
        error: `Minimální hodnota objednávky pro tento kód je ${(discount.minOrderAmount / 100).toLocaleString("cs-CZ")} Kč.`,
      },
      { status: 400 },
    );
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (discount.type === "percentage") {
    discountAmount = subtotal ? Math.round((subtotal * discount.value) / 100) : 0;
  } else {
    discountAmount = discount.value;
  }

  // Don't let discount exceed subtotal
  if (subtotal && discountAmount > subtotal) {
    discountAmount = subtotal;
  }

  return NextResponse.json({
    code: discount.code,
    type: discount.type,
    value: discount.value,
    discountAmount,
    label:
      discount.type === "percentage"
        ? `${discount.value} %`
        : `${(discount.value / 100).toLocaleString("cs-CZ")} Kč`,
  });
}
