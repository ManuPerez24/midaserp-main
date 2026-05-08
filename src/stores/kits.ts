import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { Kit } from "@/lib/types";

interface KitsState {
  kits: Kit[];
  add: (k: Omit<Kit, "id" | "createdAt" | "items"> & { items?: Kit["items"] }) => Kit;
  update: (id: string, patch: Partial<Kit>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  addItem: (kitId: string, productId: string, quantity: number) => void;
  updateItemQuantity: (kitId: string, productId: string, quantity: number) => void;
  removeItem: (kitId: string, productId: string) => void;
}

export const useKits = create<KitsState>((set, get) => ({
  kits: [],
  add: (k) => {
    const kit: Kit = {
      id: uuid(),
      name: k.name,
      description: k.description,
      items: k.items ?? [],
      createdAt: new Date().toISOString(),
    };
    set({ kits: [kit, ...get().kits] });
    return kit;
  },
  update: (id, patch) => set({ kits: get().kits.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  remove: (id) => set({ kits: get().kits.filter((x) => x.id !== id) }),
  removeMany: (ids) => {
    const s = new Set(ids);
    set({ kits: get().kits.filter((x) => !s.has(x.id)) });
  },
  addItem: (kitId, productId, quantity) =>
    set({
      kits: get().kits.map((k) => {
        if (k.id !== kitId) return k;
        const existing = k.items.find((i) => i.productId === productId);
        if (existing) {
          return {
            ...k,
            items: k.items.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i)),
          };
        }
        return { ...k, items: [...k.items, { productId, quantity }] };
      }),
    }),
  updateItemQuantity: (kitId, productId, quantity) =>
    set({
      kits: get().kits.map((k) => {
        if (k.id !== kitId) return k;
        const newQty = Math.max(1, quantity);
        return {
          ...k,
          items: k.items.map((i) =>
            i.productId === productId ? { ...i, quantity: newQty } : i,
          ),
        };
      }),
    }),
  removeItem: (kitId, productId) =>
    set({
      kits: get().kits.map((k) => (k.id === kitId ? { ...k, items: k.items.filter((i) => i.productId !== productId) } : k)),
    }),
}));

registerServerStore("midas:v1:kits", useKits, (state) => ({ kits: state.kits }), { shared: true });
