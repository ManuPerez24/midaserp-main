import { useMemo, useState } from "react";
import { Download, ShoppingCart, Truck } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useInventory } from "@/stores/inventory";
import { useSettings } from "@/stores/settings";
import type { Quote, QuoteLine } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: Quote;
}

export function PurchaseListsDialog({ open, onOpenChange, quote }: Props) {
  const products = useInventory((s) => s.products);
  const settings = useSettings((s) => s.settings);
  const [busy, setBusy] = useState(false);

  // Group lines by supplier (from product or "Sin proveedor")
  const groups = useMemo(() => {
    const map = new Map<string, QuoteLine[]>();
    for (const l of quote.lines) {
      const prod = products.find((p) => p.id === l.productId);
      const sup = (prod?.supplier || "Sin proveedor").trim() || "Sin proveedor";
      const arr = map.get(sup) ?? [];
      arr.push(l);
      map.set(sup, arr);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([supplier, lines]) => ({ supplier, lines }));
  }, [quote.lines, products]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(groups.map((g) => g.supplier)));

  const toggle = (s: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const generateOne = async (supplier: string, lines: QuoteLine[]) => {
    const [{ pdf }, { PurchasePdfDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/pdf/purchase-pdf"),
    ]);
    const blob = await pdf(
      <PurchasePdfDocument
        supplier={supplier}
        lines={lines}
        quote={quote}
        settings={settings}
      />,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = supplier.replace(/[^a-z0-9-]+/gi, "_").slice(0, 40);
    a.href = url;
    a.download = `${quote.folio}-compras-${safe}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const downloadSelected = async () => {
    const chosen = groups.filter((g) => selected.has(g.supplier));
    if (chosen.length === 0) {
      toast.error("Selecciona al menos un proveedor");
      return;
    }
    setBusy(true);
    try {
      for (const g of chosen) {
        await generateOne(g.supplier, g.lines);
      }
      toast.success(`${chosen.length} PDF(s) descargados`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Error al generar PDFs");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Listas de compras por proveedor
          </DialogTitle>
          <DialogDescription>
            Se genera un PDF por cada proveedor seleccionado, con nº de parte, nombre, descripción y cantidad.
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            La cotización no tiene productos.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {groups.map((g) => {
                const totalUnits = g.lines.reduce((s, l) => s + l.quantity, 0);
                return (
                  <label
                    key={g.supplier}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.has(g.supplier)}
                      onCheckedChange={() => toggle(g.supplier)}
                    />
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{g.supplier}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.lines.length} ítems · {totalUnits} unidades
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        generateOne(g.supplier, g.lines).then(() =>
                          toast.success(`PDF "${g.supplier}" descargado`),
                        );
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cerrar
          </Button>
          <Button onClick={downloadSelected} disabled={busy || groups.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Descargar seleccionados ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
