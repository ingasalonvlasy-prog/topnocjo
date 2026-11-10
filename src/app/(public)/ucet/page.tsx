import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-constants";
import type { OrderStatus } from "@/lib/order-constants";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountNav } from "@/components/AccountNav";

export const metadata: Metadata = {
  title: "Můj účet | Qsport.cz",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni?redirect=/ucet");

  const [orderCount, recentOrders] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: true },
    }),
  ]);

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
              <p className="text-[28px] font-extrabold text-navy">{orderCount}</p>
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
            {recentOrders.length === 0 ? (
              <p className="text-[14px] text-muted">Zatím žádné objednávky.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const status = order.status as OrderStatus;
                  const statusColor = ORDER_STATUS_COLORS[status] || { bg: "bg-gray-100", text: "text-gray-700" };
                  const date = new Date(order.createdAt).toLocaleDateString("cs-CZ", {
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <a
                      key={order.id}
                      href={`/objednavka/${order.orderNumber}`}
                      className="flex items-center justify-between py-2 border-b border-wash last:border-0 hover:bg-wash/50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div>
                        <span className="text-[14px] font-bold text-navy">#{order.orderNumber}</span>
                        <span className="text-[13px] text-muted ml-2">{date}</span>
                        <span className={`ml-2 inline-flex items-center h-[20px] px-2 text-[10px] font-bold uppercase rounded-full ${statusColor.bg} ${statusColor.text}`}>
                          {ORDER_STATUS_LABELS[status] || order.status}
                        </span>
                      </div>
                      <span className="text-[14px] font-bold text-ink">{formatPrice(order.total)}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
