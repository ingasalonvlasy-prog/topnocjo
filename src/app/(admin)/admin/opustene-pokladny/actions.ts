"use server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { AbandonedCheckoutEmail } from "@/lib/emails/abandoned-checkout";
import { logAdminAction } from "@/lib/admin-log";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function sendRecoveryEmail(checkoutId: string) {
  await requireAdmin();
  const checkout = await prisma.abandonedCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout || checkout.status === "RECOVERED" || checkout.status === "EXPIRED") {
    throw new Error("Checkout nelze obnovit.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://qsport.cz";
  const items = JSON.parse(checkout.items);
  const recoveryUrl = `${baseUrl}/pokladna?recover=${checkout.recoveryToken}`;

  await sendEmail({
    to: checkout.email,
    subject: "Zapomněli jste něco v košíku?",
    react: AbandonedCheckoutEmail({
      firstName: checkout.firstName || undefined,
      email: checkout.email,
      items,
      subtotal: checkout.subtotal,
      recoveryUrl,
    }),
  });

  await prisma.abandonedCheckout.update({
    where: { id: checkoutId },
    data: { status: "EMAIL_SENT", recoveryEmailSentAt: new Date() },
  });

  await logAdminAction(
    "ABANDONED_CHECKOUT_EMAIL",
    "AbandonedCheckout",
    checkoutId,
    `Recovery email odeslán na ${checkout.email}`,
  );

  revalidatePath("/admin/opustene-pokladny");
}

export async function deleteAbandonedCheckout(checkoutId: string) {
  await requireAdmin();
  await prisma.abandonedCheckout.delete({ where: { id: checkoutId } });
  revalidatePath("/admin/opustene-pokladny");
}
