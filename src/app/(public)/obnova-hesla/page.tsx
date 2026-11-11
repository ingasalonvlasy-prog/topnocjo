import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Obnova hesla | Qsport.cz",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = sp.token as string | undefined;
  const error = sp.error as string | undefined;

  if (!token) {
    return <InvalidToken />;
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true, firstName: true },
  });

  if (!user) {
    return <InvalidToken />;
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const tokenValue = formData.get("token") as string;
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;

    if (!password || password.length < 8) {
      redirect(`/obnova-hesla?token=${tokenValue}&error=weak`);
    }
    if (password !== passwordConfirm) {
      redirect(`/obnova-hesla?token=${tokenValue}&error=mismatch`);
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        resetToken: tokenValue,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!targetUser) {
      redirect("/zapomenute-heslo?error=expired");
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    await createSession(targetUser.id);
    redirect("/ucet");
  }

  const errorMessages: Record<string, string> = {
    weak: "Heslo musí mít alespoň 8 znaků.",
    mismatch: "Hesla se neshodují.",
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold tracking-[-0.04em] text-navy mb-2">
            Nové heslo
          </h1>
          <p className="text-[14px] text-muted">
            Zadejte své nové heslo.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[10px] p-6 lg:p-8">
          {error && (
            <p className="text-[13px] text-sale mb-4 p-3 bg-red-50 rounded-lg">
              {errorMessages[error] || "Něco se pokazilo."}
            </p>
          )}

          <form action={resetPassword}>
            <input type="hidden" name="token" value={token} />

            <div className="mb-4">
              <label className="block text-[13px] font-bold text-ink mb-1.5">Nové heslo</label>
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

            <button
              type="submit"
              className="w-full h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
            >
              Nastavit heslo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InvalidToken() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[440px] mx-auto px-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-sale rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold text-navy mb-2">
          Neplatný odkaz
        </h1>
        <p className="text-[14px] text-muted mb-6">
          Odkaz pro obnovu hesla vypršel nebo je neplatný. Požádejte o nový.
        </p>
        <Link
          href="/zapomenute-heslo"
          className="inline-block h-[44px] leading-[44px] px-8 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
        >
          Nový odkaz
        </Link>
      </div>
    </div>
  );
}
