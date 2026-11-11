import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Registrace | Qsport.cz",
  description: "Vytvoř si účet na Qsport.cz — sleduj objednávky a nakupuj rychleji.",
  openGraph: { title: "Registrace | Qsport.cz", description: "Vytvoř si účet na Qsport.cz — sleduj objednávky a nakupuj rychleji." },
};

export default async function RegistracePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/ucet");

  const sp = await searchParams;
  const error = sp.error as string | undefined;

  async function registerUser(formData: FormData) {
    "use server";
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;
    const newsletter = formData.get("newsletter") === "on";

    if (!email || !password) {
      redirect("/registrace?error=missing");
    }
    if (password.length < 8) {
      redirect("/registrace?error=weak");
    }
    if (password !== passwordConfirm) {
      redirect("/registrace?error=mismatch");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      redirect("/registrace?error=taken");
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        newsletter,
      },
    });

    await createSession(newUser.id);
    redirect("/ucet");
  }

  const errorMessages: Record<string, string> = {
    missing: "Vyplň e-mail a heslo.",
    weak: "Heslo musí mít alespoň 8 znaků.",
    mismatch: "Hesla se neshodují.",
    taken: "Tento e-mail je již registrovaný.",
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
            Vytvoř si účet
          </h1>
          <p className="text-[14px] text-muted">
            Sleduj objednávky, ulož si adresu a nakupuj rychleji.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
          {error && (
            <p className="text-[13px] text-sale mb-4 p-3 bg-red-50 rounded-lg">
              {errorMessages[error] || "Něco se pokazilo."}
            </p>
          )}

          <form action={registerUser}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-bold text-ink mb-1.5">Jméno</label>
                <input
                  name="firstName"
                  type="text"
                  className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink mb-1.5">Příjmení</label>
                <input
                  name="lastName"
                  type="text"
                  className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
                />
              </div>
            </div>

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
                minLength={8}
                className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
              />
              <p className="text-[12px] text-muted mt-1">Alespoň 8 znaků</p>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-bold text-ink mb-1.5">Heslo znovu</label>
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                className="w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
              />
            </div>

            <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
              <input
                type="checkbox"
                name="newsletter"
                className="mt-0.5 w-4 h-4 rounded border-line text-navy focus:ring-navy"
              />
              <span className="text-[13px] text-ink">
                Chci dostávat novinky a akce na e-mail
              </span>
            </label>

            <button
              type="submit"
              className="w-full h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
            >
              Vytvořit účet
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-muted mt-5">
          Už máš účet?
          <Link href="/prihlaseni" className="text-blue hover:underline ml-1">
            Přihlas se
          </Link>
        </p>
      </div>
    </div>
  );
}
