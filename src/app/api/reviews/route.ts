import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const reviews = await prisma.productReview.findMany({
    where: { productId, approved: true },
    orderBy: { createdAt: "desc" },
  });

  const count = reviews.length;
  const avgRating = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  return NextResponse.json({ reviews, count, avgRating });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productId, authorName, rating, title, content } = body;

  if (!productId || !authorName || !rating || !content) {
    return NextResponse.json({ error: "Vyplňte všechna povinná pole." }, { status: 400 });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Hodnocení musí být 1–5." }, { status: 400 });
  }

  if (authorName.length > 100 || content.length > 2000) {
    return NextResponse.json({ error: "Text je příliš dlouhý." }, { status: 400 });
  }

  // Rate-limiting: max 1 review per product per author per day
  const recentReview = await prisma.productReview.findFirst({
    where: {
      productId,
      authorName: authorName.trim(),
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentReview) {
    return NextResponse.json(
      { error: "Můžete přidat jen jednu recenzi za den." },
      { status: 429 },
    );
  }

  const review = await prisma.productReview.create({
    data: {
      productId,
      authorName: authorName.trim(),
      rating,
      title: title?.trim() || null,
      content: content.trim(),
      approved: false,
    },
  });

  return NextResponse.json({ review, message: "Děkujeme za recenzi! Bude zobrazena po schválení." });
}
