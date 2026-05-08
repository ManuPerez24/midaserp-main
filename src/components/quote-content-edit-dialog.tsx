import { useEffect, useState } from "react";
import { Plus, Trash2, FileEdit } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuotes } from "@/stores/quotes";
import { useSettings } from "@/stores/settings";
import { computeTotals, lineTotal } from "@/lib/quote-calc";
import { formatMoney } from "@/lib/utils";
import type { Quote, QuoteLine } from "@/lib/types";

interface Props {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteContentEditDialog({ quote, open, onOpenChange }: Props) {
  const settings = useSettings((s) => s.settings);
  const liveQuote = useQuotes((s) => s.quotes.find((q) => q.id === quote.id)) ?? quote;

  const updateLineQty = useQuotes((s) => s.updateLineQty);
  const updateLinePrice = useQuotes((s) => s.updateLinePrice);
  const updateLineDiscount = useQuotes((s) => s.updateLineDiscount);
  const updateLineFields = useQuotes((s) => s.updateLineFields);
  const removeLine = useQuotes((s) => s.removeLine);
  const addManualLine = useQuotes((s) => s.addManualLine);
  const setGlobalDiscount = useQuotes((s) => s.setGlobalDiscount);

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
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  };

  const markRemoved = (productId: string) => {
    setRemoved((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

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
      <DialogContent className="max-w-6xl p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 font-mono">
            <FileEdit className="h-5 w-5" /> Editar contenido · {liveQuote.folio}
          </DialogTitle>
          <DialogDescription>
            Modifica cantidades, precios, descuentos o elimina líneas. Guarda al terminar.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setLines((prev) => [...prev, createBlankLine()])}
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar línea manual
          </Button>
        </div>

        <ScrollArea className="h-[65vh] w-full">
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
                          value={l.unit}
                          onChange={(e) => patchLine(l.productId, { unit: e.target.value })}
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
        </ScrollArea>

        <div className="border-t bg-muted/30 px-6 py-4">
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

        <DialogFooter className="border-t px-6 py-3">
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
