"use client";

import { useEffect, useRef, useCallback } from "react";

const GLS_WIDGET_URL = "https://map.gls-czech.com/widget/gls-dpm.js";

export interface GlsPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

interface GlsWidgetProps {
  onSelect: (point: GlsPoint) => void;
  selectedPoint?: GlsPoint | null;
  filterType?: "parcel-shop" | "parcel-locker";
}

export function GlsWidget({
  onSelect,
  selectedPoint,
  filterType = "parcel-shop",
}: GlsWidgetProps) {
  const scriptLoaded = useRef(false);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scriptLoaded.current || document.getElementById("gls-widget-script")) {
      scriptLoaded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.id = "gls-widget-script";
    script.src = GLS_WIDGET_URL;
    script.type = "module";
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        onSelect({
          id: detail.id,
          name: detail.name || detail.contact?.name || "",
          address: detail.contact?.address || "",
          city: detail.contact?.city || "",
          postalCode: detail.contact?.postalCode || "",
          countryCode: detail.contact?.countryCode || "CZ",
        });
      }
    };

    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onSelect]);

  const openDialog = useCallback(() => {
    const el = dialogRef.current;
    if (el && typeof (el as unknown as { showModal: () => void }).showModal === "function") {
      (el as unknown as { showModal: () => void }).showModal();
    }
  }, []);

  return (
    <div>
      {/* @ts-expect-error gls-dpm-dialog is a custom HTML element */}
      <gls-dpm-dialog
        ref={dialogRef}
        country="cz"
        language="cs"
        filter-type={filterType}
      />

      <button
        type="button"
        onClick={openDialog}
        className="w-full px-4 py-3 border-2 border-dashed border-line rounded-[8px] text-[13px] font-bold text-ink hover:border-navy hover:text-navy transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        {selectedPoint
          ? `${selectedPoint.name}, ${selectedPoint.city}`
          : filterType === "parcel-shop"
            ? "Vybrat výdejní místo GLS"
            : "Vybrat GLS ParcelBox"}
      </button>

      {selectedPoint && (
        <div className="mt-2 p-3 bg-wash rounded-lg text-[13px]">
          <div className="font-bold text-ink">{selectedPoint.name}</div>
          <div className="text-muted">
            {selectedPoint.address}, {selectedPoint.city} {selectedPoint.postalCode}
          </div>
        </div>
      )}
    </div>
  );
}
