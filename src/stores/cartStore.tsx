import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, Product, ProductVariant } from "@/types";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant | null, qty?: number) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("mistaben_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("mistaben_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, variant: ProductVariant | null, qty = 1) => {
    setItems((prev) => {
      const cartId = variant ? `${product.id}-${variant.id}` : product.id;
      const existing = prev.find((i) => i.cartId === cartId);
      if (existing) {
        return prev.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + qty } : i));
      }
      const price = variant ? variant.price : product.base_price ?? 0;
      return [...prev, { cartId, product, variant, quantity: qty, price }];
    });
  };

  const removeItem = (cartId: string) => setItems((prev) => prev.filter((i) => i.cartId !== cartId));

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(cartId); return; }
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
