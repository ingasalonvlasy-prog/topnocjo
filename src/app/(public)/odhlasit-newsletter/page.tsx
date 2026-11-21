import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { syncContactToResend } from "@/lib/newsletter-sync";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email || "";
  const done = params.done === "true";

  async function unsubscribe(formData: FormData) {
    "use server";
    const emailValue = (formData.get("email") as string)?.trim().toLowerCase();
    if (!emailValue) return;

    await prisma.newsletterSubscriber.updateMany({
      where: { email: emailValue },
      data: { active: false },
    });

    await prisma.user.updateMany({
      where: { email: emailValue },
      data: { newsletter: false },
    });

    // Sync to Resend (fire-and-forget)
    syncContactToResend(emailValue, false).catch(() => {});

    redirect(`/odhlasit-newsletter?email=${encodeURIComponent(emailValue)}&done=true`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Odhlášení z newsletteru
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Qsport.cz
        </p>

        {done ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-green-700 font-medium mb-1">Úspěšně odhlášeno</p>
            <p className="text-sm text-gray-500">
              Email <strong>{email}</strong> byl odhlášen z newsletteru.
            </p>
          </div>
        ) : (
          <form action={unsubscribe}>
            {email ? (
              <>
                <p className="text-sm text-gray-600 text-center mb-4">
                  Chcete odhlásit <strong>{email}</strong> z odběru newsletteru?
                </p>
                <input type="hidden" name="email" value={email} />
              </>
            ) : (
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Váš email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="vas@email.cz"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-medium rounded-md text-white transition-colors"
              style={{ backgroundColor: "#0B1727" }}
            >
              Odhlásit z newsletteru
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
