import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/products";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountNav } from "@/components/AccountNav";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Objednávky",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni?redirect=/ucet/objednavky");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs
        items={[
          { label: "Můj účet", href: "/ucet" },
          { label: "Objednávky" },
        ]}
      />

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Můj účet
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <AccountNav />

        <div>
          <h2 className="text-[22px] font-extrabold text-navy mb-6">Objednávky</h2>

          {orders.length === 0 ? (
            <div className="border border-line rounded-[10px] p-8 text-center">
              <p className="text-[16px] font-bold text-ink mb-2">
                Zatím jsi u nás nic neobjednal/a.
              </p>
              <p className="text-[13px] text-muted">
                Mrkni, co máme nového —{" "}
                <Link href="/" className="text-blue hover:underline">
                  přejít na e-shop
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = order.status as OrderStatus;
                const paymentStatus = order.paymentStatus as PaymentStatus;
                const statusColor = ORDER_STATUS_COLORS[status] || { bg: "bg-gray-100", text: "text-gray-700" };
                const paymentColor = PAYMENT_STATUS_COLORS[paymentStatus] || { bg: "bg-gray-100", text: "text-gray-700" };
                const date = new Date(order.createdAt).toLocaleDateString("cs-CZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const itemsSummary = order.items
                  .slice(0, 3)
                  .map((i) => i.productName)
                  .join(", ");
                const moreCount = order.items.length - 3;

                return (
                  <Link
                    key={order.id}
                    href={`/objednavka/${order.orderNumber}${order.viewToken ? `?token=${order.viewToken}` : ""}`}
                    className="block border border-line rounded-[10px] p-5 hover:border-navy/30 hover:shadow-sm transition-all"
                  >
                    {/* Header: order number + date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-extrabold text-navy">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[13px] text-muted">{date}</span>
                      </div>
                      <span className="text-[18px] font-extrabold text-navy">
                        {formatPrice(order.total)}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`inline-flex items-center h-[24px] px-2.5 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full ${statusColor.bg} ${statusColor.text}`}
                      >
                        {ORDER_STATUS_LABELS[status] || order.status}
                      </span>
                      <span
                        className={`inline-flex items-center h-[24px] px-2.5 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full ${paymentColor.bg} ${paymentColor.text}`}
                      >
                        {PAYMENT_STATUS_LABELS[paymentStatus] || order.paymentStatus}
                      </span>
                    </div>

                    {/* Items summary */}
                    <p className="text-[13px] text-muted line-clamp-1">
                      {itemsSummary}
                      {moreCount > 0 && ` a ${moreCount} ${moreCount === 1 ? "další" : "dalších"}`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
