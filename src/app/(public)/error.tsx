"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold text-navy mb-2">
          Něco se pokazilo
        </h1>
        <p className="text-[14px] text-muted mb-8">
          Omlouváme se, při načítání stránky došlo k chybě. Zkuste to prosím znovu.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="h-[44px] px-6 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors cursor-pointer"
          >
            Zkusit znovu
          </button>
          <a
            href="/"
            className="h-[44px] px-6 border border-line text-ink text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)] hover:border-navy transition-colors flex items-center"
          >
            Hlavní stránka
          </a>
        </div>
      </div>
    </div>
  );
}
