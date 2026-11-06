"use client";

export function AddToCartButton() {
  return (
    <button
      onClick={() => alert("Košík bude brzy k dispozici!")}
      className="flex-1 h-[52px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
    >
      Přidat do košíku
    </button>
  );
}
