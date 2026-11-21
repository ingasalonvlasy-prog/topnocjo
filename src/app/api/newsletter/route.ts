import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncContactToResend } from "@/lib/newsletter-sync";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Zadejte e-mail." }, { status: 400 });
  }

  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return NextResponse.json({ error: "Neplatný e-mail." }, { status: 400 });
  }

  // Upsert — if already exists, reactivate silently
  await prisma.newsletterSubscriber.upsert({
    where: { email: trimmed },
    update: { active: true },
    create: { email: trimmed },
  });

  // Sync to Resend (fire-and-forget)
  syncContactToResend(trimmed, true).catch(() => {});

  return NextResponse.json({ success: true });
}
