"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function recalcProductRating(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: { productId, approved: true },
    select: { rating: true },
  });
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  await prisma.product.update({
    where: { id: productId },
    data: { avgRating: Math.round(avg * 10) / 10, reviewCount: count },
  });
}

export async function approveReview(id: string) {
  const review = await prisma.productReview.update({
    where: { id },
    data: { approved: true },
    select: { productId: true },
  });
  await recalcProductRating(review.productId);
  revalidatePath("/admin/recenze");
}

export async function rejectReview(id: string) {
  const review = await prisma.productReview.update({
    where: { id },
    data: { approved: false },
    select: { productId: true },
  });
  await recalcProductRating(review.productId);
  revalidatePath("/admin/recenze");
}

export async function deleteReview(id: string) {
  const review = await prisma.productReview.delete({
    where: { id },
    select: { productId: true },
  });
  await recalcProductRating(review.productId);
  revalidatePath("/admin/recenze");
}
