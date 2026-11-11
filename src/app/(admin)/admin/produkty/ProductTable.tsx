"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/products";
import { bulkUpdateProductStatus, bulkDeleteProducts } from "./actions";

interface Product {
  id: string;
  name: string;
  status: string;
  photos: string;
  productType: string | null;
  brand: { name: string };
  variants: { price: number; ownStock: number; supplierStock: number }[];
  categories: string[];
}

export function ProductTable({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function handleBulkAction(action: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    if (action === "DELETE") {
      setShowConfirmDelete(true);
      return;
    }

    startTransition(async () => {
      await bulkUpdateProductStatus(ids, action as "ACTIVE" | "DRAFT" | "ARCHIVED");
      setSelected(new Set());
    });
  }

  function handleConfirmDelete() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkDeleteProducts(ids);
      setSelected(new Set());
      setShowConfirmDelete(false);
    });
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-gray-900 text-white rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "produkt vybrán" : selected.size < 5 ? "produkty vybrány" : "produktů vybráno"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction("ACTIVE")}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Aktivovat
            </button>
            <button
              onClick={() => handleBulkAction("DRAFT")}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              Deaktivovat
            </button>
            <button
              onClick={() => handleBulkAction("ARCHIVED")}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Archivovat
            </button>
            <button
              onClick={() => handleBulkAction("DELETE")}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Smazat
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors"
            >
              Zrušit výběr
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Produkt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Značka</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Typ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Kategorie</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Cena</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Sklad</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => {
                const photos: string[] = JSON.parse(product.photos || "[]");
                const photo = photos[0] || "https://placehold.co/40x40/e2e8f0/475569?text=?";
                const minPrice = product.variants.length > 0
                  ? Math.min(...product.variants.map((v) => v.price))
                  : 0;
                const totalStock = product.variants.reduce((sum, v) => sum + v.ownStock + v.supplierStock, 0);

                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${selected.has(product.id) ? "bg-green-50" : ""}`}>
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/produkty/${product.id}`} className="flex items-center gap-3 group">
                        <Image
                          src={photo}
                          alt=""
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover bg-gray-100"
                        />
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400">{product.variants.length} variant</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{product.brand.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{product.productType || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell text-sm">
                      {product.categories.length > 0
                        ? product.categories.slice(0, 2).join(", ") + (product.categories.length > 2 ? ` +${product.categories.length - 2}` : "")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {minPrice > 0 ? formatPrice(minPrice) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <div>
                        <span className={`text-sm font-medium ${
                          totalStock === 0 ? "text-red-500" : totalStock <= 2 ? "text-orange-500" : "text-gray-900"
                        }`}>
                          {totalStock}
                        </span>
                        <p className="text-[11px] text-gray-400">
                          u {product.variants.filter(v => (v.ownStock + v.supplierStock) > 0).length}/{product.variants.length} variant
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        product.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : product.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {product.status === "ACTIVE" ? "Aktivní" : product.status === "DRAFT" ? "Koncept" : "Archiv"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Smazat produkty?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Opravdu chcete smazat {selected.size} {selected.size === 1 ? "produkt" : selected.size < 5 ? "produkty" : "produktů"}? Tato akce je nevratná.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "Mazání..." : "Smazat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
