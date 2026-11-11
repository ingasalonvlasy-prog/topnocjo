import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentStatus } from "@/lib/comgate";
import { sendEmail } from "@/lib/email";
import { PaymentReceived } from "@/lib/emails/payment-received";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const transId = formData.get("transId") as string;
  const merchant = formData.get("merchant") as string;

  if (!transId || !merchant) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Always verify via Comgate status API — never trust push data alone
  const verified = await getPaymentStatus(transId);

  const order = await prisma.order.findFirst({
    where: { comgateTransId: transId },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (verified.status === "PAID" && order.paymentStatus !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
        paidAt: new Date(),
      },
    });

    // Send payment received email (fire-and-forget)
    sendEmail({
      to: order.email,
      subject: `Platba za objednávku ${order.orderNumber} přijata`,
      react: PaymentReceived({
        orderNumber: order.orderNumber,
        firstName: order.firstName,
        total: order.total,
        paidAt: new Date().toLocaleDateString("cs-CZ"),
        viewToken: order.viewToken || undefined,
      }),
    });
  } else if (verified.status === "CANCELLED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "CANCELLED",
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
  }

  // Must return 200 to acknowledge push notification
  return new NextResponse("OK", { status: 200 });
}
