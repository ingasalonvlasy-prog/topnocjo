import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/wishlist — return array of productIds in user's wishlist
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ productIds: [] });
  }

  const items = await prisma.wishlist.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });

  return NextResponse.json({
    productIds: items.map((i) => i.productId),
  });
}

// POST /api/wishlist — toggle product in wishlist
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { productId } = await request.json();
  if (!productId || typeof productId !== "string") {
    return NextResponse.json({ error: "missing productId" }, { status: 400 });
  }

  // Check if already in wishlist
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: { userId: user.id, productId },
    },
  });

  if (existing) {
    // Remove
    await prisma.wishlist.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ added: false });
  } else {
    // Add
    await prisma.wishlist.create({
      data: { userId: user.id, productId },
    });
    return NextResponse.json({ added: true });
  }
}
