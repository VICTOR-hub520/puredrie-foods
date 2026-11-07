"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { z } from "zod";

export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  variantName: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "pure-drie-cart";
const cartSchema = z.array(
  z.object({
    variantId: z.string(),
    productId: z.string(),
    name: z.string(),
    variantName: z.string(),
    slug: z.string(),
    image: z.string(),
    price: z.number().int().nonnegative(),
    quantity: z.number().int().min(1).max(50),
  }),
);
const listeners = new Set<() => void>();
let cartHydrated = false;

function getSnapshot() {
  return localStorage.getItem(storageKey) ?? "[]";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getHydratedSnapshot() {
  return cartHydrated;
}

function subscribeHydrated(callback: () => void) {
  if (!cartHydrated) {
    cartHydrated = true;
    callback();
  }
  return () => undefined;
}

function readItems(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(getSnapshot());
    const validated = cartSchema.safeParse(parsed);
    return validated.success ? validated.data : [];
  } catch {
    return [];
  }
}

function writeItems(items: CartItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
  for (const listener of listeners) listener();
}

export function CartProvider({ children }: { children: ReactNode }) {
  const cartValue = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const hydrated = useSyncExternalStore(subscribeHydrated, getHydratedSnapshot, () => false);
  const parsed = useMemo(() => {
    try {
      const validated = cartSchema.safeParse(JSON.parse(cartValue));
      return validated.success ? validated.data : [];
    } catch {
      return [];
    }
  }, [cartValue]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    const current = readItems();
    const existing = current.find((line) => line.variantId === item.variantId);
    const updated = existing
      ? current.map((line) =>
          line.variantId === item.variantId
            ? { ...line, quantity: Math.min(line.quantity + 1, 50) }
            : line,
        )
      : [...current, { ...item, quantity: 1 }];
    writeItems(updated);
  }, []);
  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const current = readItems();
    const updated =
      quantity <= 0
        ? current.filter((line) => line.variantId !== variantId)
        : current.map((line) =>
            line.variantId === variantId
              ? { ...line, quantity: Math.min(quantity, 50) }
              : line,
          );
    writeItems(updated);
  }, []);
  const removeItem = useCallback((variantId: string) => setQuantity(variantId, 0), [setQuantity]);
  const clearCart = useCallback(() => writeItems([]), []);
  const value = useMemo(
    () => ({
      items: parsed,
      count: parsed.reduce((total, item) => total + item.quantity, 0),
      subtotal: parsed.reduce((total, item) => total + item.price * item.quantity, 0),
      hydrated,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [parsed, hydrated, addItem, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside CartProvider.");
  return cart;
}
