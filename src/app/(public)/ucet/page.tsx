import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountNav } from "@/components/AccountNav";

export const metadata: Metadata = {
  title: "Můj účet | Qsport.cz",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni?redirect=/ucet");

  const memberSince = new Date(user.createdAt).toLocaleDateString("cs-CZ", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs items={[{ label: "Můj účet" }]} />

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Můj účet
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <AccountNav />

        <div>
          {/* Welcome */}
          <div className="bg-wash rounded-[10px] p-6 mb-6">
            <p className="text-[18px] font-bold text-navy">
              Ahoj{user.firstName ? `, ${user.firstName}` : ""}!
            </p>
            <p className="text-[14px] text-muted mt-1">
              Tady najdeš své objednávky a osobní údaje.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="border border-line rounded-[10px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted mb-1">
                Objednávky
              </p>
              <p className="text-[28px] font-extrabold text-navy">0</p>
            </div>
            <div className="border border-line rounded-[10px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted mb-1">
                Člen od
              </p>
              <p className="text-[18px] font-bold text-navy">{memberSince}</p>
            </div>
          </div>

          {/* Recent orders */}
          <div className="border border-line rounded-[10px] p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[18px] font-bold text-navy">Poslední objednávky</h2>
              <a href="/ucet/objednavky" className="text-[13px] text-blue hover:underline">
                Zobrazit vše
              </a>
            </div>
            <p className="text-[14px] text-muted">Zatím žádné objednávky.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
