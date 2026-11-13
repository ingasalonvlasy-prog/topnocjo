"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

export interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantTitle: string;
  price: number;
  comparePrice?: number;
  photo: string;
  quantity: number;
}

export interface SelectedShipping {
  methodId: string;
  methodName: string;
  methodCode: string;
  methodType: string;
  price: number;
  freeFrom: number | null;
  pickupPointId?: string;
  pickupPointName?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  loaded: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  selectedShipping: SelectedShipping | null;
  setSelectedShipping: (shipping: SelectedShipping | null) => void;
  setPickupPoint: (pointId: string, pointName: string) => void;
  shippingPrice: number;
}

const STORAGE_KEY = "qsport_cart";
const SHIPPING_STORAGE_KEY = "qsport_shipping";
const MAX_QTY = 10;

const CartContext = createContext<CartContextValue>({
  items: [],
  itemCount: 0,
  subtotal: 0,
  loaded: false,
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  selectedShipping: null,
  setSelectedShipping: () => {},
  setPickupPoint: () => {},
  shippingPrice: 0,
});

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedShippingState, setSelectedShippingState] = useState<SelectedShipping | null>(null);

  useEffect(() => {
    setItems(loadCart());
    try {
      const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
      if (raw) setSelectedShippingState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCart(items);
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId
            ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QTY) }
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, MAX_QTY) }];
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.variantId === variantId ? { ...i, quantity: Math.min(quantity, MAX_QTY) } : i
        )
      );
    }
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSelectedShippingState(null);
    localStorage.removeItem(SHIPPING_STORAGE_KEY);
  }, []);

  const setSelectedShipping = useCallback((shipping: SelectedShipping | null) => {
    setSelectedShippingState(shipping);
    if (shipping) {
      localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(shipping));
    } else {
      localStorage.removeItem(SHIPPING_STORAGE_KEY);
    }
  }, []);

  const setPickupPoint = useCallback((pointId: string, pointName: string) => {
    setSelectedShippingState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, pickupPointId: pointId, pickupPointName: pointName };
      localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const shippingPrice = useMemo(() => {
    if (!selectedShippingState) return 0;
    if (selectedShippingState.freeFrom && subtotal >= selectedShippingState.freeFrom) return 0;
    return selectedShippingState.price;
  }, [selectedShippingState, subtotal]);

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal, loaded, addItem, updateQuantity, removeItem, clearCart,
      selectedShipping: selectedShippingState, setSelectedShipping, setPickupPoint, shippingPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
