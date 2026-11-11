import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { checkoutId, email, phone, firstName, lastName, items, subtotal, shippingMethodId, paymentMethod } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const itemsJson = JSON.stringify(
      (items || []).map((i: { variantId: string; productName: string; variantTitle: string; quantity: number; unitPrice: number; photo?: string }) => ({
        variantId: i.variantId,
        productName: i.productName,
        variantTitle: i.variantTitle,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        photo: i.photo || null,
      }))
    );
    const itemCount = (items || []).reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

    // If we have an existing checkoutId, update it
    if (checkoutId) {
      const existing = await prisma.abandonedCheckout.findUnique({ where: { id: checkoutId } });
      if (existing && (existing.status === "OPEN" || existing.status === "EMAIL_SENT")) {
        await prisma.abandonedCheckout.update({
          where: { id: checkoutId },
          data: {
            email,
            phone: phone || null,
            firstName: firstName || null,
            lastName: lastName || null,
            items: itemsJson,
            itemCount,
            subtotal: subtotal || 0,
            shippingMethodId: shippingMethodId || null,
            paymentMethod: paymentMethod || null,
          },
        });
        return NextResponse.json({ checkoutId: existing.id, recoveryToken: existing.recoveryToken });
      }
    }

    // Check for existing OPEN checkout with same email in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.abandonedCheckout.findFirst({
      where: {
        email,
        status: { in: ["OPEN", "EMAIL_SENT"] },
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.abandonedCheckout.update({
        where: { id: existing.id },
        data: {
          phone: phone || null,
          firstName: firstName || null,
          lastName: lastName || null,
          items: itemsJson,
          itemCount,
          subtotal: subtotal || 0,
          shippingMethodId: shippingMethodId || null,
          paymentMethod: paymentMethod || null,
        },
      });
      return NextResponse.json({ checkoutId: existing.id, recoveryToken: existing.recoveryToken });
    }

    // Create new
    const recoveryToken = crypto.randomUUID();
    const checkout = await prisma.abandonedCheckout.create({
      data: {
        email,
        phone: phone || null,
        firstName: firstName || null,
        lastName: lastName || null,
        items: itemsJson,
        itemCount,
        subtotal: subtotal || 0,
        shippingMethodId: shippingMethodId || null,
        paymentMethod: paymentMethod || null,
        recoveryToken,
      },
    });

    return NextResponse.json({ checkoutId: checkout.id, recoveryToken: checkout.recoveryToken });
  } catch (error) {
    console.error("[checkout/track] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
