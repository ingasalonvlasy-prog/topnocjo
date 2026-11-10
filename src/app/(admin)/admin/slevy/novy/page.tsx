import Link from "next/link";
import { createDiscountCode } from "../actions";

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function NewDiscountPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/slevy"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Zpět na slevové kódy
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nový slevový kód</h1>
      </div>

      <form action={createDiscountCode} className="max-w-lg">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className={labelCls}>Kód *</label>
            <input
              name="code"
              required
              placeholder="LETO2026"
              className={inputCls + " uppercase font-mono"}
            />
            <p className="text-xs text-gray-400 mt-1">Automaticky převeden na velká písmena</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Typ slevy *</label>
              <select name="type" required className={inputCls}>
                <option value="percentage">Procenta (%)</option>
                <option value="fixed">Fixní částka (Kč)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Hodnota *</label>
              <input
                name="value"
                type="number"
                min={1}
                required
                placeholder="10"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">Procenta (1–100) nebo Kč</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Minimální hodnota objednávky (Kč)</label>
            <input
              name="minOrderAmount"
              type="number"
              min={0}
              placeholder="Volitelné"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Maximální počet použití</label>
            <input
              name="usageLimit"
              type="number"
              min={1}
              placeholder="Neomezeno"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Platí od</label>
              <input name="validFrom" type="datetime-local" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Platí do</label>
              <input name="validTo" type="datetime-local" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Vytvořit kód
            </button>
            <Link
              href="/admin/slevy"
              className="px-6 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
