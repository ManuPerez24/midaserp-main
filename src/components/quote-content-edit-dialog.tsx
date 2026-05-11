import { useEffect, useState, useMemo, useRef } from "react";
import { Plus, Trash2, FileEdit, Sparkles, PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuotes } from "@/stores/quotes";
import { useInventory } from "@/stores/inventory";
import { useSettings } from "@/stores/settings";
import { computeTotals, lineTotal } from "@/lib/quote-calc";
import { formatMoney } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { suggestCrossSellingWithAi } from "@/util/chat.functions";
import type { Quote, QuoteLine } from "@/lib/types";

interface Props {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteContentEditDialog({ quote, open, onOpenChange }: Props) {
  const settings = useSettings((s) => s.settings);
  const products = useInventory((s) => s.products);
  const liveQuote = useQuotes((s) => s.quotes.find((q) => q.id === quote.id)) ?? quote;

  const updateLineQty = useQuotes((s) => s.updateLineQty);
  const updateLinePrice = useQuotes((s) => s.updateLinePrice);
  const updateLineDiscount = useQuotes((s) => s.updateLineDiscount);
  const updateLineFields = useQuotes((s) => s.updateLineFields);
  const removeLine = useQuotes((s) => s.removeLine);
  const addManualLine = useQuotes((s) => s.addManualLine);
  const setGlobalDiscount = useQuotes((s) => s.setGlobalDiscount);
  const suggestCrossSelling = useServerFn(suggestCrossSellingWithAi);

  const defaultCurrency = liveQuote.lines[0]?.currency ?? settings.branding.defaultCurrency ?? "MXN";
  const createBlankLine = (): QuoteLine => ({
    productId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    sku: "",
    partNumber: undefined,
    name: "",
    description: "",
    unit: "pieza",
    unitPrice: 0,
    currency: defaultCurrency,
    quantity: 1,
  });

  const [lines, setLines] = useState<QuoteLine[]>(liveQuote.lines);
  const [removed, setRemoved] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [globalDiscount, setGlobalDiscountLocal] = useState<number>(
    liveQuote.globalDiscountPercent ?? 0
  );

  useEffect(() => {
    if (open) {
      setLines(liveQuote.lines.map((l) => ({ ...l })));
      setRemoved([]);
      setGlobalDiscountLocal(liveQuote.globalDiscountPercent ?? 0);
    }
  }, [open, liveQuote.id]);

  const patchLine = (productId: string, patch: Partial<QuoteLine>) => {
    setLines((prev) => prev.map((l) => {
      if (l.productId !== productId) return l;
      const nextLine = { ...l, ...patch };
      if (patch.quantity !== undefined) {
         const prod = products.find(p => p.id === productId);
         if (prod?.volumePrices && prod.volumePrices.length > 0) {
            const applicable = [...prod.volumePrices].sort((a,b) => b.minQty - a.minQty).find(v => nextLine.quantity >= v.minQty);
            const newPrice = applicable ? applicable.price : prod.price;
            if (newPrice !== nextLine.unitPrice) {
               nextLine.unitPrice = newPrice;
            }
         }
      }
      return nextLine;
    }));
  };

  const markRemoved = (productId: string) => {
    setRemoved((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const cartNamesStr = useMemo(() => JSON.stringify(lines.map(l => ({ name: l.name }))), [lines]);
  const aiSettings = settings.ai;

  useEffect(() => {
    if (lines.length === 0) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      const catalog = products.map(p => ({ id: p.id, name: p.name, category: p.category || "" }));
      suggestCrossSelling({
        data: {
          cart: JSON.parse(cartNamesStr),
          catalog,
          provider: aiSettings?.provider,
          apiKey: aiSettings?.apiKey,
          model: aiSettings?.model,
          baseUrl: aiSettings?.baseUrl,
        }
      }).then(res => {
        if (res.ok && res.data?.recommendedIds) {
          const recommended = res.data.recommendedIds.map((id: string) => products.find(p => p.id === id)).filter(Boolean);
          setSuggestions(recommended);
        }
        setLoadingSuggestions(false);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [cartNamesStr, products, aiSettings]);

  const draftQuote: Quote = { ...liveQuote, lines, globalDiscountPercent: globalDiscount };
  const totals = computeTotals(draftQuote, settings.issuer.ivaPercent);
  const currency = lines[0]?.currency ?? "MXN";

  const handleSave = () => {
    // Apply removals
    for (const pid of removed) removeLine(liveQuote.id, pid);
    // Apply field/qty/price/discount updates per line
    for (const l of lines) {
      const original = liveQuote.lines.find((x) => x.productId === l.productId);
      if (!original) {
        addManualLine(liveQuote.id, l);
        continue;
      }
      if (l.quantity !== original.quantity) updateLineQty(liveQuote.id, l.productId, l.quantity);
      if (l.unitPrice !== original.unitPrice) updateLinePrice(liveQuote.id, l.productId, l.unitPrice);
      if ((l.discountPercent ?? 0) !== (original.discountPercent ?? 0))
        updateLineDiscount(liveQuote.id, l.productId, l.discountPercent ?? 0);
      if (
        l.name !== original.name ||
        l.description !== original.description ||
        l.unit !== original.unit
      ) {
        updateLineFields(liveQuote.id, l.productId, {
          name: l.name,
          description: l.description,
          unit: l.unit,
        });
      }
    }
    if ((globalDiscount ?? 0) !== (liveQuote.globalDiscountPercent ?? 0)) {
      setGlobalDiscount(liveQuote.id, globalDiscount);
    }
    toast.success("Cambios guardados");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] flex-col overflow-hidden max-w-6xl p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 font-mono">
            <FileEdit className="h-5 w-5" /> Editar contenido · {liveQuote.folio}
          </DialogTitle>
          <DialogDescription>
            Modifica cantidades, precios, descuentos o elimina líneas. Guarda al terminar.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 overflow-hidden min-w-0">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setLines((prev) => [...prev, createBlankLine()])}
            className="shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar línea manual
          </Button>

          {suggestions.length > 0 && (
            <div className="flex-1 min-w-0 flex items-center gap-3 overflow-hidden rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-400">
              <Sparkles className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0 overflow-x-auto pb-0.5 scrollbar-thin">
                <div className="flex w-max items-center gap-2">
                  <span className="font-semibold whitespace-nowrap shrink-0 mr-2">Sugerencias IA:</span>
                  {loadingSuggestions ? (
                    <span className="flex items-center text-xs text-amber-600/70 whitespace-nowrap shrink-0">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Pensando...
                    </span>
                  ) : (
                    suggestions.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-background shrink-0 whitespace-nowrap hover:bg-background/80"
                      onClick={() => {
                        const existing = lines.find((l) => l.productId === p.id);
                        if (existing) {
                          patchLine(p.id, { quantity: existing.quantity + 1 });
                        } else {
                          setLines((prev) => [...prev, { productId: p.id, sku: p.sku, partNumber: p.partNumber, name: p.name, description: p.description, unit: p.unit, unitPrice: p.price, currency: p.currency, quantity: 1 }]);
                        }
                        toast.success(`Agregado: ${p.name}`);
                      }}
                    >
                      <PlusCircle className="mr-1 h-3 w-3" /> {p.name}
                    </Button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <datalist id="unit-options">
            {settings.units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <div className="p-4 sm:p-6">
            {lines.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                No hay líneas en esta cotización.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">SKU</TableHead>
                    <TableHead className="min-w-[220px]">Producto</TableHead>
                    <TableHead className="min-w-[260px]">Descripción</TableHead>
                    <TableHead className="w-[90px]">Unidad</TableHead>
                    <TableHead className="w-[90px]">Cant.</TableHead>
                    <TableHead className="w-[120px]">Precio</TableHead>
                    <TableHead className="w-[90px]">Desc. %</TableHead>
                    <TableHead className="w-[120px] text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.productId}>
                      <TableCell className="font-mono text-xs">{l.sku}</TableCell>
                      <TableCell>
                        <Input
                          value={l.name}
                          onChange={(e) => patchLine(l.productId, { name: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          rows={2}
                          value={l.description}
                          onChange={(e) =>
                            patchLine(l.productId, { description: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="unit-options"
                          value={l.unit}
                          onChange={(e) => patchLine(l.productId, { unit: e.target.value })}
                          onBlur={(e) => {
                            if (e.target.value.trim()) useSettings.getState().addUnit?.(e.target.value.trim().toUpperCase());
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) =>
                            patchLine(l.productId, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) =>
                            patchLine(l.productId, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={l.discountPercent ?? 0}
                          onChange={(e) =>
                            patchLine(l.productId, {
                              discountPercent: Math.max(
                                0,
                                Math.min(100, Number(e.target.value) || 0)
                              ),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(lineTotal(l), l.currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => markRemoved(l.productId)}
                          title="Eliminar línea"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4 shrink-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Descuento global (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-28"
                  value={globalDiscount}
                  onChange={(e) =>
                    setGlobalDiscountLocal(
                      Math.max(0, Math.min(100, Number(e.target.value) || 0))
                    )
                  }
                />
              </div>
            </div>
            <div className="space-y-1 text-right text-sm">
              <div className="text-muted-foreground">
                Subtotal: <span className="font-medium text-foreground">{formatMoney(totals.afterLineDiscounts, currency)}</span>
              </div>
              <div className="text-muted-foreground">
                IVA ({settings.issuer.ivaPercent}%): <span className="font-medium text-foreground">{formatMoney(totals.iva, currency)}</span>
              </div>
              <div className="text-base font-semibold">
                Total: {formatMoney(totals.total, currency)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button data-primary="true" onClick={handleSave}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
