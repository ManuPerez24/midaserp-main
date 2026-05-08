import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function PriceHistoryDialog({ product, open, onOpenChange }: Props) {
  const history = product?.priceHistory ?? [];
  // newest first
  const reversed = [...history].reverse();
  const first = history[0];
  const last = history[history.length - 1];
  const totalDelta = first && last ? last.price - first.price : 0;
  const totalPct = first && first.price > 0 ? (totalDelta / first.price) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Histórico de precios
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {product?.name} · SKU {product?.sku}
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin histórico aún.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-xs">
              <div>
                <div className="text-muted-foreground">Inicial</div>
                <div className="mt-0.5 font-semibold">
                  {formatMoney(first!.price, first!.currency)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Actual</div>
                <div className="mt-0.5 font-semibold">
                  {formatMoney(last!.price, last!.currency)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Variación</div>
                <div
                  className={`mt-0.5 font-semibold ${
                    totalDelta > 0
                      ? "text-rose-600"
                      : totalDelta < 0
                        ? "text-emerald-600"
                        : ""
                  }`}
                >
                  {totalDelta > 0 ? "+" : ""}
                  {totalPct.toFixed(1)}%
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-72">
              <ol className="space-y-2 border-l-2 border-border pl-4 pr-2">
                {reversed.map((h, i) => {
                  const prev = reversed[i + 1];
                  const delta = prev ? h.price - prev.price : 0;
                  const pct = prev && prev.price > 0 ? (delta / prev.price) * 100 : 0;
                  const Icon =
                    delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                  const color =
                    delta > 0
                      ? "text-rose-600"
                      : delta < 0
                        ? "text-emerald-600"
                        : "text-muted-foreground";
                  return (
                    <li key={h.at + i} className="relative">
                      <span className="absolute -left-[21px] top-1 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-primary" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatDate(h.at)}
                        </span>
                        <span className="font-semibold">
                          {formatMoney(h.price, h.currency)}
                        </span>
                      </div>
                      {prev ? (
                        <div className={`flex items-center gap-1 text-xs ${color}`}>
                          <Icon className="h-3 w-3" />
                          {delta !== 0
                            ? `${formatMoney(Math.abs(delta), h.currency)} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`
                            : "Sin cambio"}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Precio inicial
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
