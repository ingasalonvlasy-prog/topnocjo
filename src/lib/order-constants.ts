// ==================== ORDER STATUS ====================

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "AWAITING_SUPPLIER",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Nová",
  CONFIRMED: "Potvrzená",
  PROCESSING: "Připravuje se",
  AWAITING_SUPPLIER: "Čeká na dodavatele",
  SHIPPED: "Odeslaná",
  DELIVERED: "Doručená",
  CANCELLED: "Zrušená",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  NEW: { bg: "bg-blue-100", text: "text-blue-700" },
  CONFIRMED: { bg: "bg-indigo-100", text: "text-indigo-700" },
  PROCESSING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  AWAITING_SUPPLIER: { bg: "bg-orange-100", text: "text-orange-700" },
  SHIPPED: { bg: "bg-purple-100", text: "text-purple-700" },
  DELIVERED: { bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
};

/**
 * Povolené přechody stavu.
 * Klíč = aktuální stav, hodnota = možné další stavy.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "AWAITING_SUPPLIER", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  AWAITING_SUPPLIER: ["PROCESSING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// Button labels for transitions
export const ORDER_TRANSITION_LABELS: Record<OrderStatus, string> = {
  NEW: "Nová",
  CONFIRMED: "Potvrdit",
  PROCESSING: "Začít připravovat",
  AWAITING_SUPPLIER: "Čeká na dodavatele",
  SHIPPED: "Označit jako odesláno",
  DELIVERED: "Označit jako doručeno",
  CANCELLED: "Zrušit objednávku",
};

// ==================== PAYMENT STATUS ====================

export const PAYMENT_STATUSES = ["PENDING", "PAID", "CANCELLED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Čeká na platbu",
  PAID: "Zaplaceno",
  CANCELLED: "Zrušeno",
  REFUNDED: "Vráceno",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  PAID: { bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
  REFUNDED: { bg: "bg-gray-100", text: "text-gray-700" },
};

// ==================== PAYMENT METHOD ====================

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Kartou online",
  transfer: "Bankovním převodem",
  cod: "Dobírkou",
};
