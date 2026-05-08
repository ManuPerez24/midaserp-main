import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { Product } from "@/lib/types";
import { useSettings } from "./settings";

interface InventoryState {
  products: Product[];
  add: (p: Omit<Product, "id" | "sku" | "createdAt">) => Product;
  update: (id: string, patch: Partial<Product>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  bulkLoad: (items: Product[]) => void;
  clear: () => void;
}

function generateSku(category: string, partNumber: string) {
  const cat = (category || "GEN").slice(0, 3).toUpperCase().replace(/\s/g, "");
  const part = (partNumber || uuid().slice(0, 4)).slice(0, 6).toUpperCase().replace(/\s/g, "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${cat}-${part}-${rand}`;
}

export const useInventory = create<InventoryState>((set, get) => ({
  products: [],
  add: (p) => {
    const now = new Date().toISOString();
    const product: Product = {
      ...p,
      id: uuid(),
      sku: generateSku(p.category, p.partNumber),
      createdAt: now,
      priceHistory: [{ at: now, price: p.price, currency: p.currency }],
    };
    const s = useSettings.getState();
    const cats = p.categories && p.categories.length > 0 ? p.categories : p.category ? [p.category] : [];
    for (const c of cats) s.addCategory(c);
    if (p.supplier) s.addSupplier(p.supplier);
    if (p.unit) s.addUnit(p.unit);
    set({ products: [product, ...get().products] });
    return product;
  },
  update: (id, patch) =>
    set({
      products: get().products.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, ...patch };
        const priceChanged =
          (patch.price !== undefined && patch.price !== x.price) ||
          (patch.currency !== undefined && patch.currency !== x.currency);
        if (priceChanged) {
          const entry = { at: new Date().toISOString(), price: next.price, currency: next.currency };
          next.priceHistory = [...(x.priceHistory ?? []), entry];
        }
        return next;
      }),
    }),
  remove: (id) => set({ products: get().products.filter((x) => x.id !== id) }),
  removeMany: (ids) => {
    const s = new Set(ids);
    set({ products: get().products.filter((x) => !s.has(x.id)) });
  },
  bulkLoad: (items) => {
    const s = useSettings.getState();
    for (const p of items) {
      const cats = p.categories && p.categories.length > 0 ? p.categories : p.category ? [p.category] : [];
      for (const c of cats) s.addCategory(c);
      if (p.supplier) s.addSupplier(p.supplier);
      if (p.unit) s.addUnit(p.unit);
    }
    set({ products: [...items, ...get().products] });
  },
  clear: () => set({ products: [] }),
}));

registerServerStore("midas:v1:inventory", useInventory, (state) => ({ products: state.products }));
