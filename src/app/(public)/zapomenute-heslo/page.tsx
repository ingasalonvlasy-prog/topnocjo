import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { PasswordReset } from "@/lib/emails/password-reset";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zapomenuté heslo",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sent = sp.sent === "true";

  async function requestReset(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) redirect("/zapomenute-heslo");

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = generateResetToken();
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiresAt },
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://qsport.cz";
      sendEmail({
        to: email,
        subject: "Obnova hesla — Qsport.cz",
        react: PasswordReset({
          firstName: user.firstName || undefined,
          resetUrl: `${baseUrl}/obnova-hesla?token=${resetToken}`,
        }),
      });
    }

    redirect("/zapomenute-heslo?sent=true");
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
            Zapomenuté heslo
          </h1>
          <p className="text-[14px] text-muted">
            Zadej svůj e-mail a pošleme ti odkaz pro obnovu hesla.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[14px] text-ink mb-2 font-bold">E-mail odeslán</p>
              <p className="text-[13px] text-muted">
                Pokud máte u nás účet, odeslali jsme Vám odkaz pro obnovu hesla.
                Zkontrolujte i složku spam.
              </p>
            </div>
          ) : (
            <form action={requestReset}>
              <div className="mb-6">
                <label className="block text-[13px] font-bold text-ink mb-1.5">E-mail</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
              >
                Odeslat odkaz
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[13px] text-muted mt-5">
          <Link href="/prihlaseni" className="text-blue hover:underline">
            Zpět na přihlášení
          </Link>
        </p>
      </div>
    </div>
  );
}
