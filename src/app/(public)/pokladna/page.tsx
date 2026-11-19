"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { createOrder } from "./actions";
import { PAYMENT_METHOD_LABELS } from "@/lib/order-constants";

const inputCls =
  "w-full py-2.5 px-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all";
const inputErrorCls =
  "w-full py-2.5 px-4 text-[14px] font-medium border border-sale rounded-[var(--radius-field)] bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all";
const labelCls = "block text-[13px] font-bold text-ink mb-1.5";


function CheckoutSkeleton() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <div className="h-4 w-48 bg-wash rounded mb-6" />
      <div className="h-10 w-40 bg-wash rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-wash rounded-[10px]" />
          ))}
        </div>
        <div>
          <div className="h-80 bg-wash rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { items, subtotal, loaded, clearCart, selectedShipping: cartShipping, shippingPrice: cartShippingPrice } = useCart();
  const [differentShipping, setDifferentShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplied, setDiscountApplied] = useState<{
    code: string;
    label: string;
    discountAmount: number;
  } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [checkoutTrackId, setCheckoutTrackId] = useState<string | null>(null);
  const [userData, setUserData] = useState<{
    email: string; phone?: string; firstName?: string; lastName?: string;
    street?: string; city?: string; zip?: string;
  } | null>(null);
  const [recoveryData, setRecoveryData] = useState<{
    email: string; phone?: string; firstName?: string; lastName?: string;
  } | null>(null);
  const [recoveryBanner, setRecoveryBanner] = useState(false);
  const trackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Track abandoned checkout (fire-and-forget)
  const trackCheckout = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    if (trackTimeoutRef.current) clearTimeout(trackTimeoutRef.current);
    trackTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/checkout/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkoutId: checkoutTrackId,
            email,
            phone: (form.querySelector('[name="phone"]') as HTMLInputElement)?.value?.trim() || undefined,
            firstName: (form.querySelector('[name="firstName"]') as HTMLInputElement)?.value?.trim() || undefined,
            lastName: (form.querySelector('[name="lastName"]') as HTMLInputElement)?.value?.trim() || undefined,
            items: items.map((i) => ({
              variantId: i.variantId,
              productName: i.productName,
              variantTitle: i.variantTitle,
              quantity: i.quantity,
              unitPrice: i.price,
              photo: i.photo,
            })),
            subtotal,
            shippingMethodId: cartShipping?.methodId || undefined,
            paymentMethod,
          }),
        });
        const data = await res.json();
        if (data.checkoutId) setCheckoutTrackId(data.checkoutId);
      } catch { /* fire-and-forget */ }
    }, 2000);
  }, [checkoutTrackId, items, subtotal, cartShipping?.methodId]);

  // Recovery: load data from token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("recover");
    if (!token) return;

    fetch(`/api/checkout/recover?token=${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setRecoveryData({
          email: data.email,
          phone: data.phone || undefined,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
        });
        setRecoveryBanner(true);
        // Add items to cart if cart is empty
        if (items.length === 0 && data.items?.length > 0) {
          for (const item of data.items) {
            // Items from recovery have the cart structure
            window.dispatchEvent(new CustomEvent("qsport-recovery-item", { detail: item }));
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch logged-in user data for prefill
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUserData(data);
      })
      .catch(() => {});
  }, []);

  const isPersonalPickup = cartShipping?.methodType === "personal";
  const discountAmount = discountApplied?.discountAmount || 0;
  const total = subtotal - discountAmount + cartShippingPrice;

  if (!loaded) {
    return <CheckoutSkeleton />;
  }

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

  function validateForm(fd: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    const email = (fd.get("email") as string)?.trim();
    const phone = (fd.get("phone") as string)?.trim();
    const firstName = (fd.get("firstName") as string)?.trim();
    const lastName = (fd.get("lastName") as string)?.trim();
    const street = (fd.get("street") as string)?.trim();
    const city = (fd.get("city") as string)?.trim();
    const zip = (fd.get("zip") as string)?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Zadej platný e-mail.";
    }
    if (!phone) {
      errors.phone = "Telefon je povinný pro dopravu.";
    }
    if (!firstName) errors.firstName = "Vyplň jméno.";
    if (!lastName) errors.lastName = "Vyplň příjmení.";
    if (!street) errors.street = "Vyplň ulici a číslo.";
    if (!city) errors.city = "Vyplň město.";
    if (!zip || !/^\d{3}\s?\d{2}$/.test(zip)) {
      errors.zip = "Zadej platné PSČ (např. 110 00).";
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Client-side validation
    const errors = validateForm(fd);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorField = form.querySelector(`[name="${Object.keys(errors)[0]}"]`);
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Shipping must be selected in cart
    if (!cartShipping?.methodId) {
      setError("Nebyla vybrána doprava. Vyberte ji v košíku.");
      return;
    }

    // Pickup point methods require selected point
    if (cartShipping.methodType === "pickup_point" && !cartShipping.pickupPointId) {
      setError("Vyber výdejní místo v košíku.");
      return;
    }

    setSubmitting(true);

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
        shippingMethodId: cartShipping.methodId,
        pickupPointId: cartShipping.pickupPointId || "",
        pickupPointName: cartShipping.pickupPointName || "",
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

  const submitLabel = "Objednat a zaplatit";

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8 pb-[140px] lg:pb-8">
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

      {recoveryBanner && (
        <div className="text-[13px] text-green-700 p-3 bg-green-50 border border-green-200 rounded-lg mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Vítejte zpět! Vaše položky jsou připravené k dokončení objednávky.
        </div>
      )}

      {error && (
        <p className="text-[13px] text-sale p-3 bg-red-50 rounded-lg mb-6">{error}</p>
      )}

      <form onSubmit={handleSubmit} noValidate ref={formRef} key={userData?.email || "anon"}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Left — form sections */}
          <div className="space-y-6">
            {/* 1. Contact */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">1. Kontaktní údaje</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>E-mail *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={recoveryData?.email || userData?.email || ""}
                    className={fieldErrors.email ? inputErrorCls : inputCls}
                    onChange={() => setFieldErrors((p) => ({ ...p, email: "" }))}
                    onBlur={trackCheckout}
                  />
                  {fieldErrors.email && <p className="text-[12px] text-sale mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className={labelCls}>Telefon *</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    defaultValue={recoveryData?.phone || userData?.phone || ""}
                    className={fieldErrors.phone ? inputErrorCls : inputCls}
                    onChange={() => setFieldErrors((p) => ({ ...p, phone: "" }))}
                  />
                  {fieldErrors.phone && <p className="text-[12px] text-sale mt-1">{fieldErrors.phone}</p>}
                </div>
              </div>
            </div>

            {/* 2. Billing address */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">2. Fakturační adresa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Jméno *</label>
                  <input
                    name="firstName"
                    required
                    defaultValue={recoveryData?.firstName || userData?.firstName || ""}
                    className={fieldErrors.firstName ? inputErrorCls : inputCls}
                    onChange={() => setFieldErrors((p) => ({ ...p, firstName: "" }))}
                  />
                  {fieldErrors.firstName && <p className="text-[12px] text-sale mt-1">{fieldErrors.firstName}</p>}
                </div>
                <div>
                  <label className={labelCls}>Příjmení *</label>
                  <input
                    name="lastName"
                    required
                    defaultValue={recoveryData?.lastName || userData?.lastName || ""}
                    className={fieldErrors.lastName ? inputErrorCls : inputCls}
                    onChange={() => setFieldErrors((p) => ({ ...p, lastName: "" }))}
                  />
                  {fieldErrors.lastName && <p className="text-[12px] text-sale mt-1">{fieldErrors.lastName}</p>}
                </div>
              </div>
              <div className="mb-4">
                <label className={labelCls}>Ulice a číslo *</label>
                <input
                  name="street"
                  required
                  defaultValue={userData?.street || ""}
                  className={fieldErrors.street ? inputErrorCls : inputCls}
                  onChange={() => setFieldErrors((p) => ({ ...p, street: "" }))}
                />
                {fieldErrors.street && <p className="text-[12px] text-sale mt-1">{fieldErrors.street}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Město *</label>
                  <input
                    name="city"
                    required
                    defaultValue={userData?.city || ""}
                    className={fieldErrors.city ? inputErrorCls : inputCls}
                    onChange={() => setFieldErrors((p) => ({ ...p, city: "" }))}
                  />
                  {fieldErrors.city && <p className="text-[12px] text-sale mt-1">{fieldErrors.city}</p>}
                </div>
                <div>
                  <label className={labelCls}>PSČ *</label>
                  <input
                    name="zip"
                    required
                    defaultValue={userData?.zip || ""}
                    className={fieldErrors.zip ? inputErrorCls : inputCls}
                    onChange={() => setFieldErrors((p) => ({ ...p, zip: "" }))}
                  />
                  {fieldErrors.zip && <p className="text-[12px] text-sale mt-1">{fieldErrors.zip}</p>}
                </div>
              </div>

              {!isPersonalPickup && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={differentShipping}
                    onChange={(e) => setDifferentShipping(e.target.checked)}
                    className="w-4 h-4 rounded border-line text-navy focus:ring-navy"
                  />
                  <span className="text-[13px] text-ink">Doručovací adresa je jiná</span>
                </label>
              )}

              {differentShipping && !isPersonalPickup && (
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

            {/* 3. Shipping (read-only — selection happens in cart) */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">3. Doprava</h2>
              {cartShipping ? (
                <div className="flex items-center justify-between p-4 bg-wash rounded-[8px]">
                  <div>
                    <span className="text-[14px] font-bold text-ink">{cartShipping.methodName}</span>
                    {cartShipping.pickupPointName && (
                      <p className="text-[12px] text-muted mt-0.5">{cartShipping.pickupPointName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-bold text-navy">
                      {cartShippingPrice === 0 ? "Zdarma" : formatPrice(cartShippingPrice)}
                    </span>
                    <Link href="/kosik" className="text-[12px] text-blue underline">Změnit</Link>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-[8px]">
                  <p className="text-[13px] text-sale">Nebyla vybrána doprava.</p>
                  <Link href="/kosik" className="text-[12px] text-blue underline mt-1 inline-block">Vybrat v košíku</Link>
                </div>
              )}
            </div>

            {/* 4. Payment method */}
            <div className="bg-white border border-line rounded-[10px] p-6">
              <h2 className="text-[18px] font-bold text-navy mb-4">4. Způsob platby</h2>
              <div className="space-y-3">
                {(["card", "transfer"] as const).map((method) => (
                  <label
                    key={method}
                    className={`flex items-center gap-3 p-4 rounded-[8px] border cursor-pointer transition-all ${
                      paymentMethod === method
                        ? "border-navy bg-navy/5"
                        : "border-line hover:border-navy/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="w-4 h-4 text-navy focus:ring-navy"
                    />
                    <span className="text-[14px] font-bold text-ink">
                      {PAYMENT_METHOD_LABELS[method]}
                    </span>
                  </label>
                ))}
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
            <div className="bg-wash rounded-[10px] p-6 sticky top-[100px]">
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
                          className="w-full h-full object-contain p-1 mix-blend-multiply"
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
                    Doprava{cartShipping ? ` (${cartShipping.methodName})` : ""}
                  </span>
                  <span className="font-medium text-ink">
                    {cartShippingPrice === 0 ? (
                      <span className="text-navy font-bold">Zdarma</span>
                    ) : (
                      formatPrice(cartShippingPrice)
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
                className="mt-6 w-full h-[48px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Zpracovávám...
                  </>
                ) : (
                  submitLabel
                )}
              </button>

              <p className="text-[11px] text-muted mt-3 text-center">
                Odesláním objednávky souhlasíte s{" "}
                <Link href="/obchodni-podminky" className="underline">obchodními podmínkami</Link>.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-4 lg:hidden z-40 safe-area-bottom">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold text-navy">Celkem</span>
          <span className="text-[18px] font-extrabold text-navy">{formatPrice(total)}</span>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            formRef.current?.requestSubmit();
          }}
          className="w-full h-[48px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Zpracovávám...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  );
}
