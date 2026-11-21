"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { syncContactToResend, removeContactFromResend } from "@/lib/newsletter-sync";

export async function toggleSubscriber(id: string, active: boolean) {
  await requireAdmin();
  const sub = await prisma.newsletterSubscriber.update({
    where: { id },
    data: { active },
  });
  // Sync to Resend
  syncContactToResend(sub.email, active).catch(() => {});
  revalidatePath("/admin/newsletter");
}

export async function deleteSubscriber(id: string) {
  await requireAdmin();
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  await prisma.newsletterSubscriber.delete({ where: { id } });
  // Remove from Resend
  if (sub?.resendContactId) {
    removeContactFromResend(sub.resendContactId).catch(() => {});
  }
  revalidatePath("/admin/newsletter");
}
