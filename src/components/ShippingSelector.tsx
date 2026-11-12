"use client";

import { useState, useEffect } from "react";
import { useCart, type SelectedShipping } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { ZasilkovnaWidget, type PacketaPoint } from "@/components/ZasilkovnaWidget";

interface ShippingOption {
  id: string;
  name: string;
  code: string;
  type: string;
  price: number;
  freeFrom: number | null;
  description: string | null;
  packetaApiKey?: string;
}

/* Bretton.cz style: large clickable cards with icon circle left, radio indicator right */

function PickupIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PersonalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "pickup_point": return <PickupIcon />;
    case "address": return <AddressIcon />;
    case "personal": return <PersonalIcon />;
    default: return <AddressIcon />;
  }
}

export function ShippingSelector() {
  const { subtotal, selectedShipping, setSelectedShipping, setPacketaPoint } = useCart();
  const [methods, setMethods] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [packetaPoint, setPacketaPointLocal] = useState<PacketaPoint | null>(null);

  useEffect(() => {
    fetch("/api/shipping")
      .then((r) => r.json())
      .then((data: ShippingOption[]) => {
        setMethods(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-select first method if nothing selected yet and methods loaded
  useEffect(() => {
    if (methods.length > 0 && !selectedShipping) {
      const first = methods[0];
      setSelectedShipping({
        methodId: first.id,
        methodName: first.name,
        methodCode: first.code,
        methodType: first.type,
        price: first.price,
        freeFrom: first.freeFrom,
      });
    }
  }, [methods, selectedShipping, setSelectedShipping]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-[72px] bg-wash rounded-[10px]" />
        <div className="animate-pulse h-[72px] bg-wash rounded-[10px]" />
      </div>
    );
  }

  function handleSelect(method: ShippingOption) {
    const shipping: SelectedShipping = {
      methodId: method.id,
      methodName: method.name,
      methodCode: method.code,
      methodType: method.type,
      price: method.price,
      freeFrom: method.freeFrom,
    };
    setSelectedShipping(shipping);
    if (method.type !== "pickup_point") {
      setPacketaPointLocal(null);
    }
  }

  function handlePointSelect(point: PacketaPoint) {
    setPacketaPointLocal(point);
    setPacketaPoint(
      String(point.id),
      `${point.name}, ${point.nameStreet}, ${point.city}`,
    );
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const isFree = method.freeFrom && subtotal >= method.freeFrom;
        const methodPrice = isFree ? 0 : method.price;
        const isSelected = selectedShipping?.methodId === method.id;

        return (
          <div key={method.id}>
            {/* Bretton.cz card: icon circle | name + price | radio indicator */}
            <button
              type="button"
              onClick={() => handleSelect(method)}
              className={`w-full flex items-center gap-4 p-4 rounded-[10px] border-2 text-left transition-all ${
                isSelected
                  ? "border-navy bg-white"
                  : "border-line bg-white hover:border-muted"
              }`}
            >
              {/* Icon circle */}
              <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isSelected ? "bg-navy text-white" : "bg-wash text-ink"
              }`}>
                {getIcon(method.type)}
              </span>

              {/* Name + description */}
              <span className="flex-1 min-w-0">
                <span className="text-[15px] font-bold text-ink block">{method.name}</span>
                {method.description && (
                  <span className="text-[12px] text-muted block mt-0.5">{method.description}</span>
                )}
              </span>

              {/* Price */}
              <span className="text-[14px] font-bold text-navy shrink-0">
                {methodPrice === 0 ? "Zdarma" : formatPrice(methodPrice)}
              </span>

              {/* Radio indicator */}
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? "border-navy bg-navy" : "border-line"
              }`}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
            </button>

            {/* Zasilkovna widget — inline under selected pickup_point */}
            {isSelected && method.type === "pickup_point" && method.packetaApiKey && (
              <div className="mt-2 ml-14">
                <ZasilkovnaWidget
                  apiKey={method.packetaApiKey}
                  onSelect={handlePointSelect}
                  selectedPoint={packetaPoint}
                />
                {selectedShipping?.packetaPointName && !packetaPoint && (
                  <div className="mt-2 p-3 bg-wash rounded-lg text-[13px] text-ink">
                    {selectedShipping.packetaPointName}
                  </div>
                )}
              </div>
            )}

            {/* Personal pickup info */}
            {isSelected && method.type === "personal" && (
              <div className="mt-2 ml-14 p-3 bg-wash rounded-lg">
                <p className="text-[13px] text-ink">
                  {method.description || "Osobni odber na pobocce — po domluv."}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
