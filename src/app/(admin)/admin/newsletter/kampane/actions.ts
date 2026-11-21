"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSetting } from "@/lib/settings";

export async function createCampaign(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const content = (formData.get("content") as string) || "";

  if (!name || !subject) {
    throw new Error("Název a předmět jsou povinné");
  }

  const campaign = await prisma.newsletterCampaign.create({
    data: { name, subject, content },
  });

  redirect(`/admin/newsletter/kampane/${campaign.id}`);
}

export async function updateCampaign(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const content = (formData.get("content") as string) || "";

  if (!name || !subject) {
    throw new Error("Název a předmět jsou povinné");
  }

  await prisma.newsletterCampaign.update({
    where: { id },
    data: { name, subject, content },
  });

  revalidatePath(`/admin/newsletter/kampane/${id}`);
}

export async function deleteCampaign(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.newsletterCampaign.delete({ where: { id } });
  redirect("/admin/newsletter/kampane");
}

export async function sendTestEmail(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;

  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) throw new Error("Kampaň nenalezena");

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY není nastaven");
  }

  const adminEmail = await getSetting("admin_email") || "info@qsport.cz";
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = wrapInLayout(campaign.content, true);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Qsport.cz <objednavky@qsport.cz>",
    to: adminEmail,
    subject: `[TEST] ${campaign.subject}`,
    html,
  });

  revalidatePath(`/admin/newsletter/kampane/${id}`);
  return { success: true };
}

export async function sendCampaign(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const scheduledAtStr = formData.get("scheduledAt") as string;

  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) throw new Error("Kampaň nenalezena");
  if (campaign.status !== "DRAFT") throw new Error("Lze odeslat pouze koncepty");

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY není nastaven");
  }

  const audienceId = await getSetting("resend_audience_id");
  if (!audienceId) {
    throw new Error("resend_audience_id není nastaveno v Nastavení");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = wrapInLayout(campaign.content, true);
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : undefined;

  const activeCount = await prisma.newsletterSubscriber.count({
    where: { active: true },
  });

  const fromAddress = process.env.EMAIL_FROM || "Qsport.cz <objednavky@qsport.cz>";
  const textContent = campaign.content.replace(/<[^>]*>/g, "");

  const baseOptions = {
    name: campaign.name,
    audienceId,
    from: fromAddress,
    subject: campaign.subject,
    html,
    text: textContent,
  } as const;

  const { data } = scheduledAt
    ? await resend.broadcasts.create({
        ...baseOptions,
        send: true,
        scheduledAt: scheduledAt.toISOString(),
      })
    : await resend.broadcasts.create({
        ...baseOptions,
        send: true,
      });

  if (data?.id) {
    await prisma.newsletterCampaign.update({
      where: { id },
      data: {
        status: scheduledAt ? "SCHEDULED" : "SENT",
        resendId: data.id,
        sentAt: scheduledAt ? null : new Date(),
        scheduledAt: scheduledAt || null,
        recipientCount: activeCount,
      },
    });
  }

  revalidatePath(`/admin/newsletter/kampane/${id}`);
  redirect(`/admin/newsletter/kampane/${id}`);
}

export async function duplicateCampaign(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;

  const original = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!original) throw new Error("Kampaň nenalezena");

  const copy = await prisma.newsletterCampaign.create({
    data: {
      name: `${original.name} (kopie)`,
      subject: original.subject,
      content: original.content,
    },
  });

  redirect(`/admin/newsletter/kampane/${copy.id}`);
}

function wrapInLayout(content: string, includeUnsubscribe: boolean): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="background-color:#F3F3F0;font-family:Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background-color:#0B1727;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <span style="color:#CEFF2F;font-size:24px;font-weight:bold;letter-spacing:1px;">Qsport.cz</span>
  </div>
  <div style="background-color:#FFFFFF;padding:32px 28px;border-radius:0 0 8px 8px;">
    ${content}
  </div>
  <div style="padding:20px;text-align:center;">
    <p style="color:#666;font-size:12px;margin:0 0 4px;">Qsport.cz — Sportovní vybavení</p>
    <p style="color:#999;font-size:11px;margin:0 0 4px;">Máte dotaz? Odpovězte na tento email nebo nás kontaktujte na info@qsport.cz</p>
    <p style="color:#999;font-size:11px;margin:0 0 8px;">Qsport.cz | IČO: 23673389</p>
    ${includeUnsubscribe ? '<p style="color:#999;font-size:11px;margin:0;"><a href="{{{ unsubscribe_url }}}" style="color:#999;text-decoration:underline;">Odhlásit z odběru newsletteru</a></p>' : ""}
  </div>
</div>
</body>
</html>`;
}
