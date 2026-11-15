"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";
import { formatPrice } from "@/lib/products";

// Fulfillment status mapping
const FULFILLMENT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  NEW: { label: "Nesplněno", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMED: { label: "Nesplněno", bg: "bg-yellow-100", text: "text-yellow-700" },
  PROCESSING: { label: "Probíhá", bg: "bg-blue-100", text: "text-blue-700" },
  AWAITING_SUPPLIER: { label: "Probíhá", bg: "bg-blue-100", text: "text-blue-700" },
  SHIPPED: { label: "Splněno", bg: "bg-green-100", text: "text-green-700" },
  DELIVERED: { label: "Doručeno", bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { label: "Zrušeno", bg: "bg-red-100", text: "text-red-700" },
};

function relativeDateLabel(createdAt: string, status: string): string {
  // Only show for unfulfilled orders
  if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) return "—";
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Dnes";
  if (diffDays === 1) return "Včera";
  return `Před ${diffDays} dny`;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  shippingName: string | null;
}

interface OrderTableClientProps {
  orders: OrderRow[];
}

export function OrderTableClient({ orders }: OrderTableClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }, [allSelected, orders]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} vybráno
          </span>
          <button className="text-xs font-medium px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer">
            Splnit
          </button>
          <button className="text-xs font-medium px-3 py-1 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            Tisknout
          </button>
          <button className="text-xs font-medium px-3 py-1 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            Exportovat CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Číslo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Zákazník</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Položky</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Celkem</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Platba</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Plnění</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Termín</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Doprava</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => {
              const statusKey = order.status as OrderStatus;
              const paymentKey = order.paymentStatus as PaymentStatus;
              const paymentColor = PAYMENT_STATUS_COLORS[paymentKey] || {
                bg: "bg-gray-100",
                text: "text-gray-700",
              };
              const fulfillment = FULFILLMENT_MAP[order.status] || {
                label: ORDER_STATUS_LABELS[statusKey] || order.status,
                bg: "bg-gray-100",
                text: "text-gray-700",
              };

              return (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedIds.has(order.id) ? "bg-blue-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleOne(order.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/objednavky/${order.id}`}
                      className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString("cs-CZ", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {order.firstName} {order.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{order.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {order.itemCount}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${paymentColor.bg} ${paymentColor.text}`}
                    >
                      {PAYMENT_STATUS_LABELS[paymentKey] || order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${fulfillment.bg} ${fulfillment.text}`}
                    >
                      {fulfillment.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {relativeDateLabel(order.createdAt, order.status)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {order.shippingName || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
