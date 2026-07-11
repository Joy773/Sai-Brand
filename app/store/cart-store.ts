"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  slug: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
};

type AddToCartInput = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: AddToCartInput) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (slug: string) => boolean;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const quantityToAdd = Math.max(1, item.quantity ?? 1);
          const existingItem = state.items.find(
            (cartItem) => cartItem.slug === item.slug,
          );

          if (existingItem) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.slug === item.slug
                  ? {
                      ...cartItem,
                      quantity: cartItem.quantity + quantityToAdd,
                    }
                  : cartItem,
              ),
            };
          }

          return {
            items: [...state.items, { ...item, quantity: quantityToAdd }],
          };
        }),
      removeItem: (slug) =>
        set((state) => ({
          items: state.items.filter((item) => item.slug !== slug),
        })),
      updateQuantity: (slug, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.slug !== slug),
            };
          }

          return {
            items: state.items.map((item) =>
              item.slug === slug ? { ...item, quantity } : item,
            ),
          };
        }),
      clearCart: () => set({ items: [] }),
      isInCart: (slug) => get().items.some((item) => item.slug === slug),
    }),
    {
      name: "sai-brand-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectCartItemCount = (state: CartStore) =>
  state.items.reduce((total, item) => total + item.quantity, 0);
