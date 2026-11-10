import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { updateDiscountCode, deleteDiscountCode } from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

function toLocalDatetime(d: Date | null): string {
  if (!d) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function EditDiscountPage({ params }: Props) {
  const { id } = await params;

  const code = await prisma.discountCode.findUnique({ where: { id } });
  if (!code) notFound();

  const displayValue = code.type === "fixed" ? code.value / 100 : code.value;
  const minOrderDisplay = code.minOrderAmount ? code.minOrderAmount / 100 : "";

  const updateAction = updateDiscountCode.bind(null, id);
  const deleteAction = deleteDiscountCode.bind(null, id);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Upravit kód: <span className="font-mono">{code.code}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Použito: {code.usageCount}x
          {code.usageLimit ? ` z ${code.usageLimit}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <form action={updateAction} className="max-w-lg">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <label className={labelCls}>Kód *</label>
              <input
                name="code"
                required
                defaultValue={code.code}
                className={inputCls + " uppercase font-mono"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Typ slevy *</label>
                <select name="type" required defaultValue={code.type} className={inputCls}>
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
                  defaultValue={displayValue}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Minimální hodnota objednávky (Kč)</label>
              <input
                name="minOrderAmount"
                type="number"
                min={0}
                defaultValue={minOrderDisplay}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Maximální počet použití</label>
              <input
                name="usageLimit"
                type="number"
                min={1}
                defaultValue={code.usageLimit || ""}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Platí od</label>
                <input
                  name="validFrom"
                  type="datetime-local"
                  defaultValue={toLocalDatetime(code.validFrom)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Platí do</label>
                <input
                  name="validTo"
                  type="datetime-local"
                  defaultValue={toLocalDatetime(code.validTo)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                id="active"
                defaultChecked={code.active}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <label htmlFor="active" className="text-sm text-gray-700">
                Aktivní
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Uložit změny
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

        {/* Sidebar: delete */}
        <div>
          <div className="bg-white rounded-lg border border-red-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-red-700 mb-2">Smazat kód</h3>
            <p className="text-xs text-gray-500 mb-3">
              Tato akce je nevratná. Kód bude trvale odstraněn.
            </p>
            <form action={deleteAction}>
              <button
                type="submit"
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Smazat
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
