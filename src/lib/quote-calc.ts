import type { Quote, QuoteLine } from "./types";

export function lineSubtotal(l: QuoteLine) {
  return l.unitPrice * l.quantity;
}

export function lineTotal(l: QuoteLine) {
  const sub = lineSubtotal(l);
  const d = (l.discountPercent ?? 0) / 100;
  return sub * (1 - d);
}

export interface QuoteTotals {
  subtotal: number;
  lineDiscounts: number;
  afterLineDiscounts: number;
  globalDiscount: number;
  taxableBase: number;
  iva: number;
  total: number;
}

export function computeTotals(quote: Quote, ivaPercent: number): QuoteTotals {
  const subtotal = quote.lines.reduce((a, l) => a + lineSubtotal(l), 0);
  const afterLineDiscounts = quote.lines.reduce((a, l) => a + lineTotal(l), 0);
  const lineDiscounts = subtotal - afterLineDiscounts;
  const gd = (quote.globalDiscountPercent ?? 0) / 100;
  const globalDiscount = afterLineDiscounts * gd;
  const taxableBase = afterLineDiscounts - globalDiscount;
  const iva = taxableBase * (ivaPercent / 100);
  const total = taxableBase + iva;
  return {
    subtotal,
    lineDiscounts,
    afterLineDiscounts,
    globalDiscount,
    taxableBase,
    iva,
    total,
  };
}

export function isExpired(validUntil?: string | null) {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < Date.now();
}

export function daysUntil(validUntil?: string | null) {
  if (!validUntil) return null;
  const ms = new Date(validUntil).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
