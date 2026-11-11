"use server";

import { sendEmail } from "@/lib/email";
import { EmailLayout } from "@/lib/emails/layout";
import { Text, Hr } from "@react-email/components";

export async function submitContactForm(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!name || !email || !message) {
    return { error: "Vyplňte všechna pole." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Zadejte platný e-mail." };
  }

  const adminEmail = process.env.ADMIN_EMAIL || "obchod@qsport.cz";

  await sendEmail({
    to: adminEmail,
    subject: `Kontaktní formulář — ${name}`,
    react: EmailLayout({
      preview: `Zpráva od ${name}`,
      children: [
        Text({ key: "h", style: { fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "0 0 16px" }, children: "Nová zpráva z kontaktního formuláře" }),
        Text({ key: "name", style: { fontSize: "13px", color: "#666", margin: "0 0 4px" }, children: `Jméno: ${name}` }),
        Text({ key: "email", style: { fontSize: "13px", color: "#666", margin: "0 0 4px" }, children: `E-mail: ${email}` }),
        Hr({ key: "hr", style: { borderColor: "#ddd", margin: "16px 0" } }),
        Text({ key: "msg", style: { fontSize: "14px", color: "#333", margin: 0, whiteSpace: "pre-wrap" }, children: message }),
      ],
    }),
  });

  return { success: true };
}
