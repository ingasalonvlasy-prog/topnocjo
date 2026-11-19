"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_KEY = "qsport_cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

type ConsentLevel = "all" | "necessary" | "custom";

interface ConsentState {
  level: ConsentLevel;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

function setConsentCookie(consent: ConsentState) {
  // Save to localStorage for client-side reads
  localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
  // Set a simple cookie so server can check consent exists
  document.cookie = `${COOKIE_KEY}=${consent.level}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function getStoredConsent(): ConsentState | null {
  try {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAcceptAll() {
    const consent: ConsentState = {
      level: "all",
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    setConsentCookie(consent);
    setVisible(false);
  }

  function handleNecessaryOnly() {
    const consent: ConsentState = {
      level: "necessary",
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    setConsentCookie(consent);
    setVisible(false);
  }

  function handleSaveCustom() {
    const consent: ConsentState = {
      level: "custom",
      analytics,
      marketing,
      timestamp: Date.now(),
    };
    setConsentCookie(consent);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-line shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="max-w-[var(--container)] mx-auto px-6 py-4">
        {!showSettings ? (
          /* Main banner */
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-navy mb-1">
                Tento web používá cookies
              </p>
              <p className="text-[13px] text-muted leading-relaxed">
                Používáme cookies pro správné fungování webu, analýzu návštěvnosti a personalizaci obsahu.{" "}
                <Link href="/cookies" className="text-blue hover:underline">
                  Více informací
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setShowSettings(true)}
                className="h-[44px] px-4 text-[13px] font-bold text-ink border border-line rounded-[var(--radius-pill)] hover:bg-wash transition-colors cursor-pointer"
              >
                Nastavení
              </button>
              <button
                onClick={handleNecessaryOnly}
                className="h-[44px] px-4 text-[13px] font-bold text-ink border border-line rounded-[var(--radius-pill)] hover:bg-wash transition-colors cursor-pointer"
              >
                Pouze nezbytné
              </button>
              <button
                onClick={handleAcceptAll}
                className="h-[44px] px-5 text-[13px] font-extrabold text-white bg-navy rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors cursor-pointer"
              >
                Přijmout vše
              </button>
            </div>
          </div>
        ) : (
          /* Settings panel */
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-bold text-navy">Nastavení cookies</p>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {/* Necessary — always on */}
              <label className="flex items-center justify-between p-3 bg-wash rounded-[8px]">
                <div>
                  <span className="text-[13px] font-bold text-ink">Nezbytné cookies</span>
                  <p className="text-[12px] text-muted mt-0.5">Nutné pro fungování webu, košík a přihlášení.</p>
                </div>
                <div className="w-10 h-6 bg-navy rounded-full relative cursor-not-allowed opacity-60">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full" />
                </div>
              </label>

              {/* Analytics */}
              <label className="flex items-center justify-between p-3 bg-wash rounded-[8px] cursor-pointer">
                <div>
                  <span className="text-[13px] font-bold text-ink">Analytické cookies</span>
                  <p className="text-[12px] text-muted mt-0.5">Pomáhají nám pochopit, jak web používáte.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  onClick={() => setAnalytics(!analytics)}
                  className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                    analytics ? "bg-navy" : "bg-line"
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    analytics ? "right-0.5" : "left-0.5"
                  }`} />
                </button>
              </label>

              {/* Marketing */}
              <label className="flex items-center justify-between p-3 bg-wash rounded-[8px] cursor-pointer">
                <div>
                  <span className="text-[13px] font-bold text-ink">Marketingové cookies</span>
                  <p className="text-[12px] text-muted mt-0.5">Umožňují zobrazování relevantních reklam.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marketing}
                  onClick={() => setMarketing(!marketing)}
                  className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                    marketing ? "bg-navy" : "bg-line"
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    marketing ? "right-0.5" : "left-0.5"
                  }`} />
                </button>
              </label>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleNecessaryOnly}
                className="h-[36px] px-4 text-[13px] font-bold text-ink border border-line rounded-[var(--radius-pill)] hover:bg-wash transition-colors cursor-pointer"
              >
                Odmítnout volitelné
              </button>
              <button
                onClick={handleSaveCustom}
                className="h-[36px] px-5 text-[13px] font-extrabold text-white bg-navy rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors cursor-pointer"
              >
                Uložit nastavení
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
