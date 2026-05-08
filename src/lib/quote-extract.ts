import type { ExtractedQuoteItem, Product } from "./types";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export type MatchKind = "exact" | "fuzzy" | "new";

export interface MatchResult {
  item: ExtractedQuoteItem;
  match: Product | null;
  kind: MatchKind;
  priceChanged: boolean;
}

export function matchExtractedItems(
  items: ExtractedQuoteItem[],
  products: Product[],
  supplier?: string,
): MatchResult[] {
  const byPart = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.partNumber) continue;
    const key = norm(p.partNumber);
    const arr = byPart.get(key) ?? [];
    arr.push(p);
    byPart.set(key, arr);
  }

  return items.map((it) => {
    let match: Product | null = null;
    let kind: MatchKind = "new";
    if (it.partNumber) {
      const cands = byPart.get(norm(it.partNumber)) ?? [];
      const preferred = supplier
        ? cands.find((p) => norm(p.supplier) === norm(supplier))
        : undefined;
      match = preferred ?? cands[0] ?? null;
      if (match) kind = "exact";
    }
    if (!match && it.name) {
      const target = norm(it.name);
      const found = products.find((p) => norm(p.name) === target);
      if (found) {
        match = found;
        kind = "fuzzy";
      }
    }
    const priceChanged = !!match && Math.abs((match.price ?? 0) - it.price) > 0.001;
    return { item: it, match, kind, priceChanged };
  });
}
