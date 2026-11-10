"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";

export function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const currentStatus = searchParams.get("status") || "";
  const currentPayment = searchParams.get("paymentStatus") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";
  const currentSearch = searchParams.get("search") || "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page when filter changes
      params.delete("page");
      router.push(`/admin/objednavky?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams("search", value);
    }, 300);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={currentStatus}
        onChange={(e) => updateParams("status", e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
      >
        <option value="">Všechny stavy</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s as OrderStatus]}
          </option>
        ))}
      </select>

      <select
        value={currentPayment}
        onChange={(e) => updateParams("paymentStatus", e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
      >
        <option value="">Všechny platby</option>
        {PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PAYMENT_STATUS_LABELS[s as PaymentStatus]}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={currentDateFrom}
        onChange={(e) => updateParams("dateFrom", e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
        placeholder="Datum od"
      />

      <input
        type="date"
        value={currentDateTo}
        onChange={(e) => updateParams("dateTo", e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
        placeholder="Datum do"
      />

      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          defaultValue={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Hledat..."
          className="rounded-md border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none w-48"
        />
      </div>
    </div>
  );
}
