import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { Product, Quote, QuoteEvent, QuoteEventKind, QuoteLine, QuoteStatus } from "@/lib/types";

interface QuotesState {
  quotes: Quote[];
  create: (clientId: string, folio: string) => Quote;
  clone: (id: string, newFolio: string) => Quote;
  update: (id: string, patch: Partial<Quote>) => void;
  setStatus: (id: string, status: QuoteStatus) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  addProduct: (quoteId: string, product: Product, quantity: number) => void;
  addManualLine: (quoteId: string, line: QuoteLine) => void;
  removeLine: (quoteId: string, productId: string) => void;
  updateLineQty: (quoteId: string, productId: string, quantity: number) => void;
  updateLineDiscount: (quoteId: string, productId: string, percent: number) => void;
  updateLinePrice: (quoteId: string, productId: string, price: number) => void;
  updateLineFields: (quoteId: string, productId: string, patch: Partial<QuoteLine>) => void;
  setGlobalDiscount: (id: string, percent: number) => void;
  setValidUntil: (id: string, iso: string | null) => void;
  applyTemplate: (quoteId: string, tpl: { lines: QuoteLine[]; notes?: string; commentary?: string; globalDiscountPercent?: number; validityDays?: number }) => void;
}

function lineFromProduct(product: Product, quantity: number): QuoteLine {
  return {
    productId: product.id,
    sku: product.sku,
    partNumber: product.partNumber,
    name: product.name,
    description: product.description,
    unit: product.unit,
    unitPrice: product.price,
    currency: product.currency,
    quantity,
  };
}

function pushEvent(q: Quote, kind: QuoteEventKind, message: string): Quote {
  const ev: QuoteEvent = { id: uuid(), at: new Date().toISOString(), kind, message };
  const events = [...(q.events ?? []), ev];
  return { ...q, events, updatedAt: ev.at };
}

export const useQuotes = create<QuotesState>((set, get) => ({
  quotes: [],
  create: (clientId, folio) => {
    const now = new Date().toISOString();
    const q: Quote = {
      id: uuid(),
      folio,
      clientId,
      status: "Pendiente",
      lines: [],
      notes: "",
      createdAt: now,
      updatedAt: now,
      events: [{ id: uuid(), at: now, kind: "created", message: `Cotización ${folio} creada` }],
    };
    set({ quotes: [q, ...get().quotes] });
    return q;
  },
  clone: (id, newFolio) => {
    const q = get().quotes.find((x) => x.id === id);
    if (!q) throw new Error("Cotización no encontrada");
    const now = new Date().toISOString();
    const newQuote: Quote = {
      ...q,
      id: uuid(),
      folio: newFolio,
      status: "Pendiente",
      createdAt: now,
      updatedAt: now,
      events: [{ id: uuid(), at: now, kind: "created", message: `Cotización ${newFolio} clonada de ${q.folio}` }],
      validUntil: null, // Reiniciamos vigencia
    };
    set({ quotes: [newQuote, ...get().quotes] });
    return newQuote;
  },
  update: (id, patch) =>
    set({
      quotes: get().quotes.map((x) => {
        if (x.id !== id) return x;
        let next = { ...x, ...patch, updatedAt: new Date().toISOString() };
        if (patch.notes !== undefined && patch.notes !== x.notes) next = pushEvent(next, "notes", "Notas actualizadas");
        if (patch.commentary !== undefined && patch.commentary !== x.commentary) next = pushEvent(next, "notes", "Descripción / comentarios actualizados");
        if (patch.clientId !== undefined && patch.clientId !== x.clientId) next = pushEvent(next, "client", "Cliente cambiado");
        return next;
      }),
    }),
  setStatus: (id, status) =>
    set({
      quotes: get().quotes.map((x) => {
        if (x.id !== id) return x;
        if (x.status === status) return x;
        const next = { ...x, status, updatedAt: new Date().toISOString() };
        return pushEvent(next, "status", `Estado: ${x.status} → ${status}`);
      }),
    }),
  remove: (id) => set({ quotes: get().quotes.filter((x) => x.id !== id) }),
  removeMany: (ids) => {
    const set_ = new Set(ids);
    set({ quotes: get().quotes.filter((x) => !set_.has(x.id)) });
  },
  addProduct: (quoteId, product, quantity) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const existing = q.lines.find((l) => l.productId === product.id);
        const lines = existing
          ? q.lines.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + quantity } : l))
          : [...q.lines, lineFromProduct(product, quantity)];
        const next = { ...q, lines, updatedAt: new Date().toISOString() };
        return pushEvent(next, "line_added", existing ? `+${quantity} ${product.name} (cantidad acumulada)` : `Agregado: ${product.name} ×${quantity}`);
      }),
    }),
  addManualLine: (quoteId, line) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const nextLines = [...q.lines, { ...line }];
        const next = { ...q, lines: nextLines, updatedAt: new Date().toISOString() };
        return pushEvent(next, "line_added", `Agregado manual: ${line.name || line.sku || "línea"}`);
      }),
    }),
  removeLine: (quoteId, productId) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const line = q.lines.find((l) => l.productId === productId);
        const next = { ...q, lines: q.lines.filter((l) => l.productId !== productId), updatedAt: new Date().toISOString() };
        return pushEvent(next, "line_removed", `Eliminado: ${line?.name ?? productId}`);
      }),
    }),
  updateLineQty: (quoteId, productId, quantity) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const line = q.lines.find((l) => l.productId === productId);
        const newQty = Math.max(1, quantity);
        if (!line || line.quantity === newQty) return q;
        const next = { ...q, lines: q.lines.map((l) => (l.productId === productId ? { ...l, quantity: newQty } : l)), updatedAt: new Date().toISOString() };
        return pushEvent(next, "line_qty", `Cantidad de \"${line.name}\": ${line.quantity} → ${newQty}`);
      }),
    }),
  updateLineDiscount: (quoteId, productId, percent) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const p = Math.max(0, Math.min(100, percent || 0));
        return { ...q, lines: q.lines.map((l) => (l.productId === productId ? { ...l, discountPercent: p } : l)), updatedAt: new Date().toISOString() };
      }),
    }),
  updateLinePrice: (quoteId, productId, price) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const line = q.lines.find((l) => l.productId === productId);
        const newPrice = Math.max(0, price || 0);
        if (!line || line.unitPrice === newPrice) return q;
        const next = { ...q, lines: q.lines.map((l) => (l.productId === productId ? { ...l, unitPrice: newPrice } : l)), updatedAt: new Date().toISOString() };
        return pushEvent(next, "line_qty", `Precio de "${line.name}": ${line.unitPrice} → ${newPrice}`);
      }),
    }),
  updateLineFields: (quoteId, productId, patch) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        return { ...q, lines: q.lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)), updatedAt: new Date().toISOString() };
      }),
    }),
  setGlobalDiscount: (id, percent) =>
    set({
      quotes: get().quotes.map((q) => q.id === id ? { ...q, globalDiscountPercent: Math.max(0, Math.min(100, percent || 0)), updatedAt: new Date().toISOString() } : q),
    }),
  setValidUntil: (id, iso) =>
    set({ quotes: get().quotes.map((q) => (q.id === id ? { ...q, validUntil: iso, updatedAt: new Date().toISOString() } : q)) }),
  applyTemplate: (quoteId, tpl) =>
    set({
      quotes: get().quotes.map((q) => {
        if (q.id !== quoteId) return q;
        const validUntil = tpl.validityDays && tpl.validityDays > 0 ? new Date(Date.now() + tpl.validityDays * 86400000).toISOString() : q.validUntil;
        const next: Quote = {
          ...q,
          lines: tpl.lines.map((l) => ({ ...l })),
          notes: tpl.notes ?? q.notes,
          commentary: tpl.commentary ?? q.commentary,
          globalDiscountPercent: tpl.globalDiscountPercent ?? q.globalDiscountPercent,
          validUntil,
          updatedAt: new Date().toISOString(),
        };
        return pushEvent(next, "line_added", `Plantilla aplicada (${tpl.lines.length} líneas)`);
      }),
    }),
}));

registerServerStore("midas:v1:quotes", useQuotes, (state) => ({ quotes: state.quotes }), { shared: true });
