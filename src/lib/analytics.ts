// GA4 e-commerce event helpers
// All prices MUST be in CZK (not halere) — divide by 100 before calling

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export interface GA4Item {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
}

export function trackViewItem(item: GA4Item, value: number, currency = "CZK") {
  gtag("event", "view_item", { currency, value, items: [item] });
}

export function trackAddToCart(item: GA4Item, value: number, currency = "CZK") {
  gtag("event", "add_to_cart", { currency, value, items: [item] });
}

export function trackRemoveFromCart(item: GA4Item, value: number, currency = "CZK") {
  gtag("event", "remove_from_cart", { currency, value, items: [item] });
}

export function trackViewCart(items: GA4Item[], value: number, currency = "CZK") {
  gtag("event", "view_cart", { currency, value, items });
}

export function trackBeginCheckout(items: GA4Item[], value: number, coupon?: string, currency = "CZK") {
  gtag("event", "begin_checkout", { currency, value, coupon, items });
}

export function trackPurchase(params: {
  transactionId: string;
  value: number;
  shipping: number;
  discount?: number;
  coupon?: string;
  items: GA4Item[];
  currency?: string;
}) {
  gtag("event", "purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    shipping: params.shipping,
    discount: params.discount,
    coupon: params.coupon,
    currency: params.currency || "CZK",
    items: params.items,
  });
}

export function trackSearch(searchTerm: string) {
  gtag("event", "search", { search_term: searchTerm });
}
