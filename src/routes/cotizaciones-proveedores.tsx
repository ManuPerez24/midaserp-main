import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Eye, Sparkles, Check, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/data-table";
import { useSupplierQuotes } from "@/stores/supplier-quotes";
import { AnalyzeSupplierQuoteDialog } from "@/components/analyze-supplier-quote-dialog";
import { formatDate, formatMoney } from "@/lib/utils";
import type { SupplierQuote } from "@/lib/types";
import { PageGuard } from "@/components/page-guard";

export const Route = createFileRoute("/cotizaciones-proveedores")({
  head: () => ({ meta: [{ title: "Cotizaciones de proveedores · MIDAS ERP" }] }),
  component: () => (
    <PageGuard permission="page:cotizaciones-proveedores">
      <Page />
    </PageGuard>
  ),
});

function Page() {
  const quotes = useSupplierQuotes((s) => s.quotes);
  const remove = useSupplierQuotes((s) => s.remove);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [view, setView] = useState<SupplierQuote | null>(null);
  const [del, setDel] = useState<SupplierQuote | null>(null);

  const pendingCount = (q: SupplierQuote) =>
    Math.max(0, q.items.length - (q.appliedItemIndexes?.length ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones de proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Historial de cotizaciones recibidas y analizadas con IA.
          </p>
        </div>
        <Button onClick={() => setAnalyzeOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" /> Analizar nueva
        </Button>
      </div>

      <DataTable
        rows={quotes}
        rowKey={(q) => q.id}
        searchPlaceholder="Buscar por proveedor o referencia..."
        searchAccessor={(q) => `${q.supplier} ${q.reference ?? ""}`}
        emptyState={
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay cotizaciones analizadas. Sube tu primera con IA.
          </div>
        }
        columns={[
          { key: "supplier", header: "Proveedor", cell: (q) => <span className="font-medium">{q.supplier}</span> },
          { key: "ref", header: "Referencia", cell: (q) => q.reference || "—" },
          { key: "items", header: "Items", cell: (q) => q.items.length, className: "text-right" },
          {
            key: "src",
            header: "Origen",
            cell: (q) => (
              <Badge variant="outline">
                {q.source === "image" ? "Imagen" : q.source === "pdf" ? "PDF" : "Texto"}
              </Badge>
            ),
          },
          {
            key: "status",
            header: "Estado",
            cell: (q) => {
              if (q.appliedAt) {
                return (
                  <Badge>
                    <Check className="mr-1 h-3 w-3" /> Aplicada
                  </Badge>
                );
              }
              const pending = pendingCount(q);
              const partial = (q.appliedItemIndexes?.length ?? 0) > 0;
              if (partial && pending > 0) {
                return <Badge variant="outline">Parcial · {pending} pendientes</Badge>;
              }
              return <Badge variant="secondary">Pendiente</Badge>;
            },
          },
          { key: "date", header: "Fecha", cell: (q) => formatDate(q.createdAt) },
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (q) => {
              const canResume = !q.appliedAt && pendingCount(q) > 0;
              return (
                <div className="flex justify-end gap-1">
                  {canResume && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setResumeId(q.id);
                        setAnalyzeOpen(true);
                      }}
                      title="Retomar elementos pendientes"
                    >
                      <PlayCircle className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setView(q)} title="Ver">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDel(q)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      <AnalyzeSupplierQuoteDialog
        open={analyzeOpen}
        onOpenChange={(o) => {
          setAnalyzeOpen(o);
          if (!o) setResumeId(null);
        }}
        resumeQuoteId={resumeId}
      />

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cotización de {view?.supplier}</DialogTitle>
            <DialogDescription>
              {view?.reference ? `Ref: ${view.reference} · ` : ""}
              {view ? formatDate(view.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-3">
              {view.imageDataUrl && view.imageDataUrl.startsWith("data:application/pdf") ? (
                <iframe
                  src={view.imageDataUrl}
                  title="Documento PDF"
                  className="w-full h-80 rounded border bg-white"
                />
              ) : view.imageDataUrl ? (
                <img
                  src={view.imageDataUrl}
                  alt="cot"
                  className="max-h-48 rounded border object-contain"
                />
              ) : null}
              <ScrollArea className="max-h-80 rounded border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs uppercase">
                    <tr>
                      <th className="p-2 text-left">Nº parte</th>
                      <th className="p-2 text-left">Producto</th>
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2 text-right">Cant.</th>
                      <th className="p-2 text-left">Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono text-xs">{it.partNumber || "—"}</td>
                        <td className="p-2">
                          <div className="font-medium">{it.name}</div>
                          {it.description && (
                            <div className="text-xs text-muted-foreground">{it.description}</div>
                          )}
                        </td>
                        <td className="p-2 text-right">{formatMoney(it.price, it.currency)}</td>
                        <td className="p-2 text-right">{it.quantity ?? "—"}</td>
                        <td className="p-2">{it.unit ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              {view.rawText && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Ver texto original</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">
                    {view.rawText}
                  </pre>
                </details>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de la cotización de {del?.supplier}. Los productos del
              inventario no se afectan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (del) {
                  remove(del.id);
                  toast.success("Eliminada");
                  setDel(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
