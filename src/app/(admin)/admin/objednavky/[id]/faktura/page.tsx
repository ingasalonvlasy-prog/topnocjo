import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { getAllSettings } from "@/lib/settings";
import { PAYMENT_METHOD_LABELS } from "@/lib/order-constants";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shipping: true,
    },
  });

  if (!order) notFound();

  const settings = await getAllSettings();
  const storeName = settings.store_name || "Qsport.cz";
  const storeIco = settings.store_ico || "";
  const storeDic = settings.store_dic || "";
  const storeAddress = settings.store_address || "";
  const storeEmail = settings.store_email || "";
  const storePhone = settings.store_phone || "";

  const issueDate = order.paidAt || order.createdAt;
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 14);

  const hasShippingAddress =
    order.shippingStreet && order.shippingCity && order.shippingZip;

  return (
    <>
      {/* Print styles — hide admin sidebar + chrome */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
              .no-print { display: none !important; }
              [data-sidebar], nav, aside { display: none !important; }
              .lg\\:ml-60 { margin-left: 0 !important; }
              .p-6, .lg\\:p-8 { padding: 0 !important; }
              .min-h-screen { min-height: auto !important; background: white !important; }
              .invoice-card { box-shadow: none !important; border: none !important; padding: 0 !important; }
              @page { margin: 15mm; size: A4; }
            }
          `,
        }}
      />

      {/* Action bar — hidden when printing */}
      <div className="no-print mb-6 flex items-center gap-3">
        <PrintButton />
        <a
          href={`/admin/objednavky/${order.id}`}
          className="px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Zpět na objednávku
        </a>
      </div>

      {/* Invoice document */}
      <div className="invoice-card bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-[800px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-5" style={{ borderBottom: "3px solid #0B1727" }}>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {storeName}
            </div>
            {storeAddress && <div className="text-xs text-gray-500 mt-1">{storeAddress}</div>}
            {storeEmail && <div className="text-xs text-gray-500">{storeEmail}</div>}
            {storePhone && <div className="text-xs text-gray-500">{storePhone}</div>}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">FAKTURA</div>
            <div className="text-base font-semibold text-gray-600 mt-1">
              č. {order.orderNumber}
            </div>
          </div>
        </div>

        {/* Dates + payment */}
        <div className="flex justify-between mb-7">
          <div>
            <div className="text-xs text-gray-500">Datum vystavení</div>
            <div className="font-bold text-sm">{formatDate(issueDate)}</div>
            <div className="text-xs text-gray-500 mt-2">Datum splatnosti</div>
            <div className="font-bold text-sm">{formatDate(dueDate)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Způsob platby</div>
            <div className="font-bold text-sm">
              {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
            </div>
            <div className="text-xs text-gray-500 mt-2">Variabilní symbol</div>
            <div className="font-bold text-sm">{order.orderNumber}</div>
          </div>
        </div>

        {/* Supplier + Customer */}
        <div className="grid grid-cols-2 gap-6 mb-7">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Dodavatel
            </div>
            <div className="font-bold text-sm">{storeName}</div>
            {storeAddress && <div className="text-sm text-gray-700">{storeAddress}</div>}
            {storeIco && <div className="text-sm text-gray-700">IČO: {storeIco}</div>}
            {storeDic && <div className="text-sm text-gray-700">DIČ: {storeDic}</div>}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Odběratel
            </div>
            <div className="font-bold text-sm">
              {order.firstName} {order.lastName}
            </div>
            <div className="text-sm text-gray-700">{order.street}</div>
            <div className="text-sm text-gray-700">
              {order.zip} {order.city}
            </div>
            <div className="text-sm text-gray-700">{order.email}</div>
            {order.phone && (
              <div className="text-sm text-gray-700">{order.phone}</div>
            )}
          </div>
        </div>

        {/* Shipping address if different */}
        {hasShippingAddress && (
          <div className="mb-7 p-3 border border-gray-200 rounded-lg">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Doručovací adresa
            </div>
            <div className="text-sm text-gray-700">
              {order.shippingName && <>{order.shippingName}, </>}
              {order.shippingStreet}, {order.shippingZip} {order.shippingCity}
            </div>
          </div>
        )}

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Název
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Varianta
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-14">
                  Ks
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                  Cena/ks
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Celkem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {item.productName}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.variantTitle}</td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatPrice(item.unitPrice)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {formatPrice(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-200 pt-3">
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-500">Mezisoučet</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-500">
                  Doprava ({order.shipping?.name || "-"})
                </span>
                <span>{formatPrice(order.shippingPrice)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-500">
                    Sleva{order.discountCode ? ` (${order.discountCode})` : ""}
                  </span>
                  <span className="text-red-600">
                    -{formatPrice(order.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2.5 mt-1.5" style={{ borderTop: "2px solid #0B1727" }}>
                <span className="text-base font-extrabold">Celkem</span>
                <span className="text-lg font-extrabold text-gray-900">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[11px] text-gray-400">
          <p>Děkujeme za Váš nákup! Tento doklad slouží jako faktura — daňový doklad.</p>
          <p className="mt-1">
            {storeName}
            {storeIco ? ` · IČO: ${storeIco}` : ""}
            {storeDic ? ` · DIČ: ${storeDic}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}
