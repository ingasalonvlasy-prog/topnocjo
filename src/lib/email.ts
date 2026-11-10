import type { ReactElement } from "react";

const FROM = process.env.EMAIL_FROM || "Qsport.cz <objednavky@qsport.cz>";

interface SendEmailParams {
  to: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", subject);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to, subject, react });
  } catch (error) {
    // Fire-and-forget — email failure must never block order flow
    console.error("[email] Failed to send:", subject, error);
  }
}
