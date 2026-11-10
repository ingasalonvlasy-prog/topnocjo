"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

interface WishlistButtonProps {
  productId: string;
  size?: "sm" | "md";
  className?: string;
}

// Global cache so all buttons share state
let wishlistCache: Set<string> | null = null;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function loadWishlist() {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/wishlist")
    .then((res) => res.json())
    .then((data) => {
      wishlistCache = new Set(data.productIds || []);
      notifyListeners();
    })
    .catch(() => {
      wishlistCache = new Set();
    });
  return fetchPromise;
}

function useWishlist() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    if (!wishlistCache) loadWishlist();
    return () => { listeners.delete(listener); };
  }, []);

  return wishlistCache || new Set<string>();
}

export function WishlistButton({ productId, size = "md", className = "" }: WishlistButtonProps) {
  const router = useRouter();
  const wishlist = useWishlist();
  const isWished = wishlist.has(productId);
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const filled = optimistic !== null ? optimistic : isWished;

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    setOptimistic(!filled);
    if (wishlistCache) {
      if (filled) wishlistCache.delete(productId);
      else wishlistCache.add(productId);
      notifyListeners();
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.status === 401) {
          // Not logged in — redirect to login
          setOptimistic(null);
          if (wishlistCache) {
            // Revert
            if (!filled) wishlistCache.delete(productId);
            else wishlistCache.add(productId);
            notifyListeners();
          }
          router.push("/prihlaseni?redirect=" + encodeURIComponent(window.location.pathname));
          return;
        }

        const data = await res.json();
        // Sync actual state
        if (wishlistCache) {
          if (data.added) wishlistCache.add(productId);
          else wishlistCache.delete(productId);
          notifyListeners();
        }
        setOptimistic(null);
      } catch {
        // Revert on error
        setOptimistic(null);
        if (wishlistCache) {
          if (!filled) wishlistCache.delete(productId);
          else wishlistCache.add(productId);
          notifyListeners();
        }
      }
    });
  }

  const iconSize = size === "sm" ? 16 : 20;
  const btnSize = size === "sm" ? "w-[36px] h-[36px]" : "w-[52px] h-[52px]";

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`${btnSize} border border-line rounded-[var(--radius-pill)] flex items-center justify-center transition-all cursor-pointer ${
        filled
          ? "border-sale text-sale hover:bg-red-50"
          : "text-muted hover:border-navy hover:text-navy"
      } ${className}`}
      aria-label={filled ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
