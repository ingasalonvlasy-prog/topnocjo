import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Přihlášení | Qsport.cz",
  description: "Přihlas se ke svému účtu na Qsport.cz.",
  openGraph: { title: "Přihlášení | Qsport.cz", description: "Přihlas se ke svému účtu na Qsport.cz." },
};

export default async function PrihlaseniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/ucet");

  const sp = await searchParams;
  const error = sp.error as string | undefined;
  const redirectTo = (sp.redirect as string) || "/ucet";

  async function loginUser(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const redir = formData.get("redirect") as string;

    if (!email || !password) {
      redirect("/prihlaseni?error=missing");
    }

    const found = await prisma.user.findUnique({ where: { email } });
    if (!found) {
      redirect("/prihlaseni?error=invalid");
    }

    const valid = await verifyPassword(password, found.passwordHash);
    if (!valid) {
      redirect("/prihlaseni?error=invalid");
    }

    await prisma.user.update({
      where: { id: found.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession(found.id);
    redirect(redir || "/ucet");
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
            Přihlášení
          </h1>
          <p className="text-[14px] text-muted">
            Vítej zpět. Přihlas se ke svému účtu.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
          {error && (
            <p className="text-[13px] text-sale mb-4 p-3 bg-red-50 rounded-lg">
              {error === "missing"
                ? "Vyplň e-mail a heslo."
                : error === "noadmin"
                ? "Nemáte oprávnění k přístupu do administrace."
                : "Nesprávný e-mail nebo heslo."}
            </p>
          )}

          <form action={loginUser}>
            <input type="hidden" name="redirect" value={redirectTo} />

            <div className="mb-4">
              <label className="block text-[13px] font-bold text-ink mb-1.5">E-mail</label>
              <input
                name="email"
                type="email"
                required
                className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-bold text-ink mb-1.5">Heslo</label>
              <input
                name="password"
                type="password"
                required
                className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
              />
            </div>

            <div className="text-right mb-6 -mt-2">
              <Link href="/zapomenute-heslo" className="text-[12px] text-blue hover:underline">
                Zapomněli jste heslo?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
            >
              Přihlásit se
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-muted mt-5">
          Ještě nemáš účet?
          <Link href="/registrace" className="text-blue hover:underline ml-1">
            Zaregistruj se
          </Link>
        </p>
      </div>
    </div>
  );
}
