import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
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

export default async function PackingSlipPage({ params }: Props) {
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
  const storeAddress = settings.store_address || "";

  const hasShippingAddress =
    order.shippingStreet && order.shippingCity && order.shippingZip;

  const recipientName = hasShippingAddress && order.shippingName
    ? order.shippingName
    : `${order.firstName} ${order.lastName}`;

  const recipientStreet = hasShippingAddress
    ? order.shippingStreet!
    : order.street;

  const recipientZip = hasShippingAddress
    ? order.shippingZip!
    : order.zip;

  const recipientCity = hasShippingAddress
    ? order.shippingCity!
    : order.city;

  return (
    <>
      {/* Print styles */}
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
              .packing-slip { box-shadow: none !important; border: none !important; padding: 0 !important; }
              @page { margin: 15mm; size: A4; }
            }
          `,
        }}
      />

      {/* Action bar */}
      <div className="no-print mb-6 flex items-center gap-3">
        <PrintButton />
        <a
          href={`/admin/objednavky/${order.id}`}
          className="px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Zpět na objednávku
        </a>
      </div>

      {/* Packing slip document */}
      <div className="packing-slip bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-[800px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-5" style={{ borderBottom: "3px solid #0B1727" }}>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {storeName}
            </div>
            {storeAddress && <div className="text-xs text-gray-500 mt-1">{storeAddress}</div>}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">BALICÍ LIST</div>
            <div className="text-base font-semibold text-gray-600 mt-1">
              č. {order.orderNumber}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(order.createdAt)}
            </div>
          </div>
        </div>

        {/* Recipient + Shipping */}
        <div className="grid grid-cols-2 gap-6 mb-7">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Příjemce
            </div>
            <div className="font-bold text-sm">{recipientName}</div>
            <div className="text-sm text-gray-700">{recipientStreet}</div>
            <div className="text-sm text-gray-700">{recipientZip} {recipientCity}</div>
            {order.phone && <div className="text-sm text-gray-700 mt-1">{order.phone}</div>}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Doprava
            </div>
            <div className="font-bold text-sm">{order.shipping?.name || "-"}</div>
            {order.pickupPointName && (
              <div className="text-sm text-gray-700 mt-1">
                Výdejní místo: {order.pickupPointName}
              </div>
            )}
            {order.trackingNumber && (
              <div className="text-sm text-gray-700 mt-1">
                Tracking: {order.trackingNumber}
              </div>
            )}
          </div>
        </div>

        {/* Items table — no prices */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Název produktu
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Velikost
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-14">
                  Ks
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                  Zabaleno
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">
                    {item.productName}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{item.variantTitle}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="inline-flex w-5 h-5 border-2 border-gray-300 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="border-t-2 border-gray-200 mt-4 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Celkem položek</span>
            <span className="font-bold">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} ks
            </span>
          </div>
        </div>

        {/* Customer note */}
        {order.note && (
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
              Poznámka zákazníka
            </div>
            <p className="text-sm text-amber-800">{order.note}</p>
          </div>
        )}

        {/* Signature space */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="border-b border-gray-300 pb-16" />
              <div className="text-xs text-gray-400 mt-2 text-center">
                Datum a razítko
              </div>
            </div>
            <div>
              <div className="border-b border-gray-300 pb-16" />
              <div className="text-xs text-gray-400 mt-2 text-center">
                Podpis
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[11px] text-gray-400">
          <p>Balicí list — {storeName} — objednávka č. {order.orderNumber}</p>
        </div>
      </div>
    </>
  );
}
