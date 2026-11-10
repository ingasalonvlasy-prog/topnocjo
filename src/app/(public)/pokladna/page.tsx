"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { createOrder } from "./actions";
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

const inputCls =
  "w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all";
const labelCls = "block text-[13px] font-bold text-ink mb-1.5";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [shipping, setShipping] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [selectedPoint, setSelectedPoint] = useState<PacketaPoint | null>(null);
  const [differentShipping, setDifferentShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplied, setDiscountApplied] = useState<{
    code: string;
    label: string;
    discountAmount: number;
  } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");

  // Fetch shipping methods
  useEffect(() => {
    fetch("/api/shipping")
      .then((r) => r.json())
      .then((data: ShippingOption[]) => {
        setShipping(data);
        if (data.length > 0) setSelectedShipping(data[0].id);
      })
      .catch(() => {});
  }, []);

  const selectedMethod = shipping.find((s) => s.id === selectedShipping);
  const shippingPrice =
    selectedMethod && selectedMethod.freeFrom && subtotal >= selectedMethod.freeFrom
      ? 0
      : selectedMethod?.price || 0;
  const discountAmount = discountApplied?.discountAmount || 0;
  const total = subtotal - discountAmount + shippingPrice;

  if (items.length === 0) {
    return (
      <div className="max-w-[var(--container)] mx-auto px-6 py-12 text-center">
        <h1 className="text-[22px] font-extrabold text-navy mb-4">Košík je prázdný</h1>
        <p className="text-[14px] text-muted mb-6">Přidej něco do košíku a vrať se.</p>
        <Link
          href="/"
          className="inline-flex h-[44px] items-center px-8 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
        >
          Pokračovat v nákupu
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Validace: Zásilkovna vyžaduje vybraný bod
    if (selectedMethod?.type === "pickup_point" && !selectedPoint) {
      setError("Vyberte výdejní místo pro Zásilkovnu.");
      return;
    }

    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      await createOrder({
        email: (fd.get("email") as string)?.trim(),
        phone: (fd.get("phone") as string)?.trim() || "",
        firstName: (fd.get("firstName") as string)?.trim(),
        lastName: (fd.get("lastName") as string)?.trim(),
        street: (fd.get("street") as string)?.trim(),
        city: (fd.get("city") as string)?.trim(),
        zip: (fd.get("zip") as string)?.trim(),
        differentShipping,
        shippingName: (fd.get("shippingName") as string)?.trim() || "",
        shippingStreet: (fd.get("shippingStreet") as string)?.trim() || "",
        shippingCity: (fd.get("shippingCity") as string)?.trim() || "",
        shippingZip: (fd.get("shippingZip") as string)?.trim() || "",
        shippingMethodId: selectedShipping,
        packetaPointId: selectedPoint?.id ? String(selectedPoint.id) : "",
        packetaPointName: selectedPoint
          ? `${selectedPoint.name}, ${selectedPoint.nameStreet}, ${selectedPoint.city}`
          : "",
        paymentMethod,
        note: (fd.get("note") as string)?.trim() || "",
        discountCode: discountApplied?.code || "",
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      clearCart();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) {
        // Next.js redirect — let it propagate
        throw err;
      }
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="text-[13px] text-muted mb-6">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="mx-1.5 text-line">/</span>
        <Link href="/kosik" className="hover:text-navy transition-colors">Košík</Link>
        <span className="mx-1.5 text-line">/</span>
        <span className="text-ink font-medium">Pokladna</span>
      </nav>

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Pokladna
      </h1>

      {error && (
        <p className="text-[13px] text-sale p-3 bg-red-50 rounded-lg mb-6">{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Left — form sections */}
          <div className="space-y-6">
            {/* 1. Contact */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">1. Kontaktní údaje</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>E-mail *</label>
                  <input name="email" type="email" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input name="phone" type="tel" className={inputCls} />
                </div>
              </div>
            </div>

            {/* 2. Billing address */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">2. Fakturační adresa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Jméno *</label>
                  <input name="firstName" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Příjmení *</label>
                  <input name="lastName" required className={inputCls} />
                </div>
              </div>
              <div className="mb-4">
                <label className={labelCls}>Ulice a číslo *</label>
                <input name="street" required className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Město *</label>
                  <input name="city" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>PSČ *</label>
                  <input name="zip" required className={inputCls} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={differentShipping}
                  onChange={(e) => setDifferentShipping(e.target.checked)}
                  className="w-4 h-4 rounded border-line text-navy focus:ring-navy"
                />
                <span className="text-[13px] text-ink">Doručovací adresa je jiná</span>
              </label>

              {differentShipping && (
                <div className="mt-4 pt-4 border-t border-line">
                  <h3 className="text-[14px] font-bold text-ink mb-3">Doručovací adresa</h3>
                  <div className="mb-4">
                    <label className={labelCls}>Jméno příjemce</label>
                    <input name="shippingName" className={inputCls} />
                  </div>
                  <div className="mb-4">
                    <label className={labelCls}>Ulice a číslo</label>
                    <input name="shippingStreet" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Město</label>
                      <input name="shippingCity" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>PSČ</label>
                      <input name="shippingZip" className={inputCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Shipping */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">3. Doprava</h2>
              <div className="space-y-3">
                {shipping.map((method) => {
                  const isFree = method.freeFrom && subtotal >= method.freeFrom;
                  const methodPrice = isFree ? 0 : method.price;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-center gap-4 p-4 rounded-[8px] border cursor-pointer transition-all ${
                        selectedShipping === method.id
                          ? "border-navy bg-wash"
                          : "border-line hover:border-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={method.id}
                        checked={selectedShipping === method.id}
                        onChange={() => {
                          setSelectedShipping(method.id);
                          if (method.type !== "pickup_point") {
                            setSelectedPoint(null);
                          }
                        }}
                        className="w-4 h-4 text-navy focus:ring-navy"
                      />
                      <div className="flex-1">
                        <span className="text-[14px] font-bold text-ink">{method.name}</span>
                        {method.description && (
                          <p className="text-[12px] text-muted mt-0.5">{method.description}</p>
                        )}
                      </div>
                      <span className="text-[14px] font-bold text-navy">
                        {methodPrice === 0 ? "Zdarma" : formatPrice(methodPrice)}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Zásilkovna widget */}
              {selectedMethod?.type === "pickup_point" && selectedMethod.packetaApiKey && (
                <div className="mt-4 pl-0 sm:pl-8">
                  <ZasilkovnaWidget
                    apiKey={selectedMethod.packetaApiKey}
                    onSelect={(point) => setSelectedPoint(point)}
                    selectedPoint={selectedPoint}
                  />
                </div>
              )}
            </div>

            {/* 4. Payment */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">4. Platba</h2>
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-4 p-4 rounded-[8px] border cursor-pointer transition-all ${
                    paymentMethod === "card" ? "border-navy bg-wash" : "border-line hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="w-4 h-4 text-navy focus:ring-navy"
                  />
                  <div className="flex-1">
                    <span className="text-[14px] font-bold text-ink">Platba kartou</span>
                    <p className="text-[12px] text-muted mt-0.5">Visa, Mastercard — přes Comgate</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-4 p-4 rounded-[8px] border cursor-pointer transition-all ${
                    paymentMethod === "transfer" ? "border-navy bg-wash" : "border-line hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={() => setPaymentMethod("transfer")}
                    className="w-4 h-4 text-navy focus:ring-navy"
                  />
                  <div className="flex-1">
                    <span className="text-[14px] font-bold text-ink">Bankovní převod</span>
                    <p className="text-[12px] text-muted mt-0.5">Platba na účet — pokyny obdržíte po objednání</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 5. Discount code */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">5. Slevový kód</h2>
              {discountApplied ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <span className="text-[13px] font-bold text-green-700">
                      {discountApplied.code}
                    </span>
                    <span className="text-[13px] text-green-600 ml-2">
                      &minus;{discountApplied.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountApplied(null);
                      setDiscountInput("");
                    }}
                    className="text-[12px] font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Odebrat
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value.toUpperCase());
                      setDiscountError("");
                    }}
                    placeholder="Zadejte slevový kód"
                    className={inputCls + " flex-1"}
                  />
                  <button
                    type="button"
                    disabled={discountLoading || !discountInput.trim()}
                    onClick={async () => {
                      setDiscountError("");
                      setDiscountLoading(true);
                      try {
                        const res = await fetch("/api/discount/validate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            code: discountInput.trim(),
                            subtotal,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setDiscountError(data.error || "Neplatný kód.");
                        } else {
                          setDiscountApplied({
                            code: data.code,
                            label: data.label,
                            discountAmount: data.discountAmount,
                          });
                        }
                      } catch {
                        setDiscountError("Chyba při ověřování kódu.");
                      } finally {
                        setDiscountLoading(false);
                      }
                    }}
                    className="h-[44px] px-6 bg-navy text-white text-[12px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-field)] hover:bg-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {discountLoading ? "..." : "Použít"}
                  </button>
                </div>
              )}
              {discountError && (
                <p className="text-[12px] text-sale mt-2">{discountError}</p>
              )}
            </div>

            {/* 6. Note */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">6. Poznámka</h2>
              <textarea
                name="note"
                rows={3}
                placeholder="Poznámka k objednávce (volitelné)..."
                className={inputCls + " resize-y"}
              />
            </div>
          </div>

          {/* Right — summary */}
          <div>
            <div className="bg-wash rounded-[10px] p-6 sticky top-[80px]">
              <h2 className="text-[18px] font-bold text-navy mb-4">Rekapitulace</h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3">
                    <div className="w-12 h-12 bg-white rounded-[6px] overflow-hidden shrink-0">
                      {item.photo && (
                        <Image
                          src={item.photo}
                          alt=""
                          width={48}
                          height={48}
                          className="w-full h-full object-contain p-1"
                          style={{ mixBlendMode: "multiply" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink line-clamp-1">{item.productName}</p>
                      <p className="text-[12px] text-muted">
                        {item.variantTitle} &times; {item.quantity}
                      </p>
                    </div>
                    <span className="text-[13px] font-bold text-ink shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-line pt-4 space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-muted">Mezisoučet</span>
                  <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Sleva ({discountApplied.code})
                    </span>
                    <span className="font-bold text-green-600">
                      &minus;{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">
                    Doprava{selectedMethod ? ` (${selectedMethod.name})` : ""}
                  </span>
                  <span className="font-medium text-ink">
                    {shippingPrice === 0 ? (
                      <span className="text-navy font-bold">Zdarma</span>
                    ) : (
                      formatPrice(shippingPrice)
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-line mt-4 pt-4">
                <div className="flex justify-between">
                  <span className="text-[16px] font-bold text-navy">Celkem</span>
                  <span className="text-[22px] font-extrabold text-navy">{formatPrice(total)}</span>
                </div>
                <p className="text-[12px] text-muted mt-1">vč. DPH</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full h-[48px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Zpracovávám..." : "Objednat a zaplatit"}
              </button>

              <p className="text-[11px] text-muted mt-3 text-center">
                Odesláním objednávky souhlasíte s{" "}
                <Link href="/obchodni-podminky" className="underline">obchodními podmínkami</Link>.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
