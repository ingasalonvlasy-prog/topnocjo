import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });

  if (!user) notFound();

  const fullName =
    user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Bez jména";

  const paidOrders = user.orders.filter((o) => o.paymentStatus === "PAID");
  const totalSpent = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const registeredAt = user.createdAt.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lastLogin = user.lastLoginAt
    ? user.lastLoginAt.toLocaleDateString("cs-CZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const address =
    user.street || user.city || user.zip
      ? [user.street, [user.zip, user.city].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/zakaznici"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Zpět na zákazníky
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left — orders */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">
                Objednávky ({user.orders.length})
              </h2>
            </div>

            {user.orders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Zákazník zatím nemá žádné objednávky.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Číslo</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Stav</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Platba</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Položky</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Celkem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {user.orders.map((order) => {
                      const statusKey = order.status as OrderStatus;
                      const paymentKey = order.paymentStatus as PaymentStatus;
                      const statusColor = ORDER_STATUS_COLORS[statusKey] || {
                        bg: "bg-gray-100",
                        text: "text-gray-700",
                      };
                      const paymentColor = PAYMENT_STATUS_COLORS[paymentKey] || {
                        bg: "bg-gray-100",
                        text: "text-gray-700",
                      };
                      const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

                      return (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/objednavky/${order.id}`}
                              className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {order.createdAt.toLocaleDateString("cs-CZ", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}
                            >
                              {ORDER_STATUS_LABELS[statusKey] || order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${paymentColor.bg} ${paymentColor.text}`}
                            >
                              {PAYMENT_STATUS_LABELS[paymentKey] || order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {itemCount} ks
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                            {formatPrice(order.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right — profile sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Přehled</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Objednávky</span>
                <span className="text-sm font-bold text-gray-900">{user.orders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Zaplaceno</span>
                <span className="text-sm font-bold text-gray-900">{paidOrders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Celková útrata</span>
                <span className="text-sm font-bold text-gray-900">
                  {totalSpent > 0 ? formatPrice(totalSpent) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Kontakt</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">E-mail:</span>{" "}
                <span className="text-gray-900">{user.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Telefon:</span>{" "}
                <span className="text-gray-900">{user.phone || "—"}</span>
              </div>
              {address && (
                <div>
                  <span className="text-gray-500">Adresa:</span>{" "}
                  <span className="text-gray-900">{address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account info */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Účet</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Registrace:</span>{" "}
                <span className="text-gray-900">{registeredAt}</span>
              </div>
              <div>
                <span className="text-gray-500">Poslední přihlášení:</span>{" "}
                <span className="text-gray-900">{lastLogin}</span>
              </div>
              <div>
                <span className="text-gray-500">Newsletter:</span>{" "}
                <span className="text-gray-900">{user.newsletter ? "Ano" : "Ne"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
