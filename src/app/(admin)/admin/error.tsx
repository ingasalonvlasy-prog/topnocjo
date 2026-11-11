"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center max-w-[480px] mx-auto">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C1121F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="text-[22px] font-extrabold text-gray-900 mb-2">
          Chyba při načítání
        </h1>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
          Při zpracování požadavku nastala chyba. Zkuste stránku načíst znovu.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="h-[40px] px-6 bg-navy text-white text-[13px] font-bold rounded-lg hover:bg-ink transition-colors"
          >
            Zkusit znovu
          </button>
          <a
            href="/admin"
            className="h-[40px] px-6 inline-flex items-center text-[13px] font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
