"use client";

import { useState } from "react";

interface ZasilkovnaConfigProps {
  apiKey: string;
  senderLabel: string;
}

export function ZasilkovnaConfig({ apiKey, senderLabel }: ZasilkovnaConfigProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    error?: string;
    count?: number;
  } | null>(null);

  async function testConnection() {
    setTesting(true);
    setResult(null);
    try {
      const keyInput = (document.querySelector('input[name="config_apiKey"]') as HTMLInputElement)?.value;
      const res = await fetch("/api/admin/zasilkovna/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInput || apiKey }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: "Nepodařilo se připojit" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
        Zásilkovna
        {apiKey && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Nakonfigurováno
          </span>
        )}
        {!apiKey && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            Chybí API klíč
          </span>
        )}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API klíč</label>
          <input
            name="config_apiKey"
            type="text"
            defaultValue={apiKey}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Odesílatel</label>
          <input
            name="config_senderLabel"
            type="text"
            defaultValue={senderLabel}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Test connection */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {testing ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Testuji...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Test připojení
            </>
          )}
        </button>

        {result && (
          <span
            className={`text-xs font-medium ${
              result.valid ? "text-green-600" : "text-red-600"
            }`}
          >
            {result.valid
              ? "Připojení OK — API funguje"
              : `Chyba: ${result.error}`}
          </span>
        )}
      </div>

      {/* Integration info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${apiKey ? "bg-green-400" : "bg-gray-300"}`} />
            Widget v6 — mapa výdejních míst v checkoutu
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${apiKey ? "bg-green-400" : "bg-gray-300"}`} />
            API v4 — stahování poboček a trackování zásilek
          </div>
        </div>
      </div>
    </div>
  );
}
