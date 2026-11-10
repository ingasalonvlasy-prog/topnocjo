import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountNav } from "@/components/AccountNav";

export const metadata: Metadata = {
  title: "Údaje a adresa | Qsport.cz",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni?redirect=/ucet/udaje");

  const sp = await searchParams;
  const saved = sp.saved as string | undefined;
  const error = sp.error as string | undefined;

  async function updateProfile(formData: FormData) {
    "use server";
    const current = await getCurrentUser();
    if (!current) redirect("/prihlaseni");

    const firstName = (formData.get("firstName") as string)?.trim() || null;
    const lastName = (formData.get("lastName") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;

    await prisma.user.update({
      where: { id: current.id },
      data: { firstName, lastName, phone },
    });

    revalidatePath("/ucet/udaje");
    redirect("/ucet/udaje?saved=profile");
  }

  async function updateAddress(formData: FormData) {
    "use server";
    const current = await getCurrentUser();
    if (!current) redirect("/prihlaseni");

    const street = (formData.get("street") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const zip = (formData.get("zip") as string)?.trim() || null;

    await prisma.user.update({
      where: { id: current.id },
      data: { street, city, zip },
    });

    revalidatePath("/ucet/udaje");
    redirect("/ucet/udaje?saved=address");
  }

  async function changePassword(formData: FormData) {
    "use server";
    const current = await getCurrentUser();
    if (!current) redirect("/prihlaseni");

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const newPasswordConfirm = formData.get("newPasswordConfirm") as string;

    if (!currentPassword || !newPassword) {
      redirect("/ucet/udaje?error=missing");
    }
    if (newPassword.length < 8) {
      redirect("/ucet/udaje?error=weak");
    }
    if (newPassword !== newPasswordConfirm) {
      redirect("/ucet/udaje?error=mismatch");
    }

    const full = await prisma.user.findUnique({ where: { id: current.id } });
    if (!full) redirect("/prihlaseni");

    const valid = await verifyPassword(currentPassword, full.passwordHash);
    if (!valid) {
      redirect("/ucet/udaje?error=wrong");
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: current.id },
      data: { passwordHash: newHash },
    });

    revalidatePath("/ucet/udaje");
    redirect("/ucet/udaje?saved=password");
  }

  const inputCls = "w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all";
  const labelCls = "block text-[13px] font-bold text-ink mb-1.5";

  const successMessages: Record<string, string> = {
    profile: "Osobní údaje uloženy.",
    address: "Adresa uložena.",
    password: "Heslo změněno.",
  };

  const errorMessages: Record<string, string> = {
    missing: "Vyplň všechna pole.",
    weak: "Nové heslo musí mít alespoň 8 znaků.",
    mismatch: "Nová hesla se neshodují.",
    wrong: "Stávající heslo je nesprávné.",
  };

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs
        items={[
          { label: "Můj účet", href: "/ucet" },
          { label: "Údaje a adresa" },
        ]}
      />

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Můj účet
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <AccountNav />

        <div className="space-y-6">
          {saved && (
            <p className="text-[13px] text-green-700 p-3 bg-green-50 rounded-lg">
              {successMessages[saved] || "Uloženo."}
            </p>
          )}
          {error && (
            <p className="text-[13px] text-sale p-3 bg-red-50 rounded-lg">
              {errorMessages[error] || "Něco se pokazilo."}
            </p>
          )}

          {/* Personal info */}
          <div className="bg-white border border-line rounded-[10px] p-6">
            <h2 className="text-[18px] font-bold text-navy mb-4">Osobní údaje</h2>
            <form action={updateProfile}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Jméno</label>
                  <input name="firstName" type="text" defaultValue={user.firstName || ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Příjmení</label>
                  <input name="lastName" type="text" defaultValue={user.lastName || ""} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>E-mail</label>
                  <div className="py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-wash text-muted">
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input name="phone" type="tel" defaultValue={user.phone || ""} className={inputCls} />
                </div>
              </div>
              <button
                type="submit"
                className="h-[40px] bg-navy text-white text-[12px] font-extrabold uppercase tracking-[0.12em] px-6 rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
              >
                Uložit údaje
              </button>
            </form>
          </div>

          {/* Address */}
          <div className="bg-white border border-line rounded-[10px] p-6">
            <h2 className="text-[18px] font-bold text-navy mb-4">Doručovací adresa</h2>
            <form action={updateAddress}>
              <div className="mb-4">
                <label className={labelCls}>Ulice a číslo</label>
                <input name="street" type="text" defaultValue={user.street || ""} className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Město</label>
                  <input name="city" type="text" defaultValue={user.city || ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>PSČ</label>
                  <input name="zip" type="text" defaultValue={user.zip || ""} className={inputCls} />
                </div>
              </div>
              <button
                type="submit"
                className="h-[40px] bg-navy text-white text-[12px] font-extrabold uppercase tracking-[0.12em] px-6 rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
              >
                Uložit adresu
              </button>
            </form>
          </div>

          {/* Password change */}
          <div className="bg-white border border-line rounded-[10px] p-6">
            <h2 className="text-[18px] font-bold text-navy mb-4">Změna hesla</h2>
            <form action={changePassword}>
              <div className="mb-4">
                <label className={labelCls}>Stávající heslo</label>
                <input name="currentPassword" type="password" required className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Nové heslo</label>
                  <input name="newPassword" type="password" required minLength={8} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nové heslo znovu</label>
                  <input name="newPasswordConfirm" type="password" required minLength={8} className={inputCls} />
                </div>
              </div>
              <button
                type="submit"
                className="h-[40px] bg-navy text-white text-[12px] font-extrabold uppercase tracking-[0.12em] px-6 rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
              >
                Změnit heslo
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
