"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleSubscriber(id: string, active: boolean) {
  await requireAdmin();
  await prisma.newsletterSubscriber.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/admin/newsletter");
}

export async function deleteSubscriber(id: string) {
  await requireAdmin();
  await prisma.newsletterSubscriber.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}
