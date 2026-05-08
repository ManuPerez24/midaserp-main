import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { SupplierQuote } from "@/lib/types";

interface State {
  quotes: SupplierQuote[];
  add: (q: Omit<SupplierQuote, "id" | "createdAt">) => SupplierQuote;
  update: (id: string, patch: Partial<SupplierQuote>) => void;
  remove: (id: string) => void;
  markApplied: (id: string) => void;
}

export const useSupplierQuotes = create<State>((set, get) => ({
  quotes: [],
  add: (q) => {
    const item: SupplierQuote = {
      ...q,
      id: uuid(),
      createdAt: new Date().toISOString(),
    };
    set({ quotes: [item, ...get().quotes] });
    return item;
  },
  update: (id, patch) => set({ quotes: get().quotes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  remove: (id) => set({ quotes: get().quotes.filter((x) => x.id !== id) }),
  markApplied: (id) =>
    set({
      quotes: get().quotes.map((x) => (x.id === id ? { ...x, appliedAt: new Date().toISOString() } : x)),
    }),
}));

registerServerStore("midas:v1:supplier-quotes", useSupplierQuotes, (state) => ({ quotes: state.quotes }));
