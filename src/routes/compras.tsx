import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShoppingCart, Truck, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { useQuotes } from "@/stores/quotes";
import { useInventory } from "@/stores/inventory";
import { useSettings } from "@/stores/settings";
import { PageGuard } from "@/components/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/compras")({
  head: () => ({ meta: [{ title: `Órdenes de Compra · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:cotizaciones">
      <ComprasPage />
    </PageGuard>
  ),
});

function ComprasPage() {
  const quotes = useQuotes((s) => s.quotes);
  const updateLineFields = useQuotes((s) => s.updateLineFields);
  const products = useInventory((s) => s.products);
  const [statusFilter, setStatusFilter] = useState<"Pendiente" | "Pedida" | "Recibida" | "Todas">("Pendiente");
  const [quoteFilter, setQuoteFilter] = useState<string>("all");

  const activeQuotes = useMemo(() => quotes.filter((q) => q.status === "Aceptada" || q.status === "Cerrada"), [quotes]);

  const linesBySupplier = useMemo(() => {
    const map = new Map<string, Array<{ quoteId: string; folio: string; line: any }>>();

    for (const q of activeQuotes) {
      if (quoteFilter !== "all" && q.id !== quoteFilter) continue;
      for (const l of q.lines) {
        const status = l.poStatus || "Pendiente";
        if (statusFilter !== "Todas" && status !== statusFilter) continue;

        const p = products.find((x) => x.id === l.productId);
        const supplier = (p?.supplier || "Sin proveedor").trim() || "Sin proveedor";

        if (!map.has(supplier)) map.set(supplier, []);
        map.get(supplier)!.push({ quoteId: q.id, folio: q.folio, line: l });
      }
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeQuotes, products, statusFilter, quoteFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de Compra (JIT)</h1>
          <p className="text-sm text-muted-foreground">
            Productos de cotizaciones aceptadas listos para pedirse a proveedor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cotización:</span>
            <Select value={quoteFilter} onValueChange={setQuoteFilter}>
              <SelectTrigger className="h-7 w-[160px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {activeQuotes.map(q => (
                  <SelectItem key={q.id} value={q.id}>{q.folio}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Estado:</span>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-7 w-[130px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendientes</SelectItem>
                <SelectItem value="Pedida">Pedidas</SelectItem>
                <SelectItem value="Recibida">Recibidas</SelectItem>
                <SelectItem value="Todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {linesBySupplier.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-card/50">
          <ShoppingCart className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>No hay productos en este estado.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {linesBySupplier.map(([supplier, items]) => (
            <Card key={supplier}>
              <CardHeader className="bg-muted/30 py-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> {supplier}
                  <Badge variant="secondary" className="ml-auto">{items.length} ítems</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {items.map((item, idx) => (
                    <div key={`${item.quoteId}-${item.line.productId}-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/10 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to="/cotizaciones/$id" params={{ id: item.quoteId }} className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1">
                            {item.folio} <ExternalLink className="h-3 w-3" />
                          </Link>
                          <Badge variant="outline" className="text-[10px]">
                            {item.line.quantity} {item.line.unit}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold truncate">{item.line.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          SKU: {item.line.sku} {item.line.partNumber ? `· NP: ${item.line.partNumber}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <div className="flex flex-col items-end gap-1 mr-2">
                          <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Recibido</span>
                          <div className="flex items-center gap-1">
                            <Input 
                              type="number" 
                              min="0" 
                              max={item.line.quantity} 
                              value={item.line.poReceivedQty ?? 0}
                              onChange={(e) => {
                                let val = parseInt(e.target.value);
                                if (isNaN(val)) val = 0;
                                let newStatus = item.line.poStatus || "Pendiente";
                                if (val > 0 && newStatus === "Pendiente") newStatus = "Pedida";
                                if (val >= item.line.quantity) newStatus = "Recibida";
                                else if (val < item.line.quantity && newStatus === "Recibida") newStatus = "Pedida";
                                updateLineFields(item.quoteId, item.line.productId, { poReceivedQty: val, poStatus: newStatus });
                              }}
                              className="h-8 w-16 text-right text-xs font-mono"
                            />
                            <span className="text-xs text-muted-foreground w-12">/ {item.line.quantity}</span>
                          </div>
                        </div>
                        <Select
                          value={item.line.poStatus || "Pendiente"}
                          onValueChange={(val: any) => {
                            const patch: any = { poStatus: val };
                            if (val === "Recibida") patch.poReceivedQty = item.line.quantity;
                            if (val === "Pendiente") patch.poReceivedQty = 0;
                            updateLineFields(item.quoteId, item.line.productId, patch);
                          }}
                        >
                          <SelectTrigger className={`w-[130px] h-8 text-xs ${
                            !item.line.poStatus || item.line.poStatus === "Pendiente" ? "border-amber-500/30 bg-amber-500/10 text-amber-700" :
                            item.line.poStatus === "Pedida" ? "border-blue-500/30 bg-blue-500/10 text-blue-700" :
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendiente"><span className="flex items-center gap-2"><Clock className="h-3 w-3" /> Pendiente</span></SelectItem>
                            <SelectItem value="Pedida"><span className="flex items-center gap-2"><Truck className="h-3 w-3" /> Pedida</span></SelectItem>
                            <SelectItem value="Recibida"><span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Recibida</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}