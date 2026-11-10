"use client";

import { useEffect, useCallback, useRef } from "react";
import { PACKETA_WIDGET_URL } from "@/lib/zasilkovna";

declare global {
  interface Window {
    Packeta?: {
      Widget: {
        pick: (
          apiKey: string,
          callback: (point: PacketaPoint | null) => void,
          options?: Record<string, unknown>,
        ) => void;
      };
    };
  }
}

export interface PacketaPoint {
  id: number;
  name: string;
  nameStreet: string;
  city: string;
  zip: string;
  country: string;
  photo?: string[];
  url?: string;
}

interface ZasilkovnaWidgetProps {
  apiKey: string;
  /** Called when user selects a pickup point */
  onSelect: (point: PacketaPoint) => void;
  /** Country filter (default: "cz") */
  country?: string;
  /** Language (default: "cs") */
  language?: string;
  /** Currently selected point (for display) */
  selectedPoint?: PacketaPoint | null;
  /** Custom class for the trigger button */
  className?: string;
}

export function ZasilkovnaWidget({
  apiKey,
  onSelect,
  country = "cz",
  language = "cs",
  selectedPoint,
  className,
}: ZasilkovnaWidgetProps) {
  const scriptLoaded = useRef(false);

  // Load Packeta widget script
  useEffect(() => {
    if (scriptLoaded.current || document.getElementById("packeta-widget-script")) {
      scriptLoaded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.id = "packeta-widget-script";
    script.src = PACKETA_WIDGET_URL;
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.head.appendChild(script);
  }, []);

  const openWidget = useCallback(() => {
    if (!window.Packeta) {
      console.error("Packeta widget not loaded");
      return;
    }
    window.Packeta.Widget.pick(
      apiKey,
      (point) => {
        if (point) onSelect(point);
      },
      { country, language, appIdentity: "qsport-eshop" },
    );
  }, [apiKey, onSelect, country, language]);

  return (
    <div>
      <button
        type="button"
        onClick={openWidget}
        className={
          className ||
          "w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
        }
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
          />
        </svg>
        {selectedPoint
          ? `${selectedPoint.name}, ${selectedPoint.city}`
          : "Vybrat výdejní místo"}
      </button>

      {selectedPoint && (
        <div className="mt-2 p-3 bg-orange-50 rounded-lg text-sm">
          <div className="font-medium text-gray-900">{selectedPoint.name}</div>
          <div className="text-gray-600">
            {selectedPoint.nameStreet}, {selectedPoint.city} {selectedPoint.zip}
          </div>
        </div>
      )}
    </div>
  );
}
