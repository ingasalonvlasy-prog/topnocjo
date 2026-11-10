"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function approveReview(id: string) {
  await prisma.productReview.update({
    where: { id },
    data: { approved: true },
  });
  revalidatePath("/admin/recenze");
}

export async function rejectReview(id: string) {
  await prisma.productReview.update({
    where: { id },
    data: { approved: false },
  });
  revalidatePath("/admin/recenze");
}

export async function deleteReview(id: string) {
  await prisma.productReview.delete({ where: { id } });
  revalidatePath("/admin/recenze");
}
