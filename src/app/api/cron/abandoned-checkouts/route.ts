import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { AbandonedCheckoutEmail } from "@/lib/emails/abandoned-checkout";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://qsport.cz";

  // 1. Find OPEN checkouts older than 1 hour but younger than 48 hours
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const openCheckouts = await prisma.abandonedCheckout.findMany({
    where: {
      status: "OPEN",
      createdAt: { gte: twoDaysAgo, lte: oneHourAgo },
    },
  });

  let emailsSent = 0;
  for (const checkout of openCheckouts) {
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
      where: { id: checkout.id },
      data: { status: "EMAIL_SENT", recoveryEmailSentAt: new Date() },
    });

    emailsSent++;
  }

  // 2. Expire old checkouts (30+ days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const expired = await prisma.abandonedCheckout.updateMany({
    where: {
      status: { in: ["OPEN", "EMAIL_SENT"] },
      createdAt: { lt: thirtyDaysAgo },
    },
    data: { status: "EXPIRED" },
  });

  if (emailsSent > 0 || expired.count > 0) {
    await logAdminAction(
      "ABANDONED_CHECKOUT_CRON",
      "AbandonedCheckout",
      undefined,
      `Odesláno ${emailsSent} recovery emailů, expirováno ${expired.count} checkoutů`,
    );
  }

  return NextResponse.json({
    emailsSent,
    expired: expired.count,
    processed: openCheckouts.length,
  });
}
