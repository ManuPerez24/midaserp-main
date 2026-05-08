import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { QuoteTemplate } from "@/lib/types";

interface State {
  templates: QuoteTemplate[];
  add: (t: Omit<QuoteTemplate, "id" | "createdAt">) => QuoteTemplate;
  remove: (id: string) => void;
}

export const useQuoteTemplates = create<State>((set, get) => ({
  templates: [],
  add: (t) => {
    const tpl: QuoteTemplate = {
      ...t,
      id: uuid(),
      createdAt: new Date().toISOString(),
    };
    set({ templates: [tpl, ...get().templates] });
    return tpl;
  },
  remove: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),
}));

registerServerStore("midas:v1:quote-templates", useQuoteTemplates, (state) => ({ templates: state.templates }));
