import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Eye, Sparkles, Check, PlayCircle, MoreHorizontal, X } from "lucide-react";
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
import { useSettings } from "@/stores/settings";

export const Route = createFileRoute("/cotizaciones-proveedores")({
  head: () => ({ meta: [{ title: `Cotizaciones de proveedores · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:cotizaciones-proveedores">
      <Page />
    </PageGuard>
  ),
});

function RadialMenuOverlay({
  open,
  coords,
  onClose,
  actions,
}: {
  open: boolean;
  coords: { x: number; y: number };
  onClose: () => void;
  actions: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
    isPrimary?: boolean;
  }[];
}) {
  if (!open || typeof document === "undefined") return null;

  const validActions = actions.filter((a) => !a.disabled);
  const sortedActions = [...validActions].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background/20 backdrop-blur-[1px] animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {sortedActions.map((a, i) => {
        const angle = (i / sortedActions.length) * 360 - 90;
        const radius = 75;
        const x = coords.x + Math.cos((angle * Math.PI) / 180) * radius;
        const y = coords.y + Math.sin((angle * Math.PI) / 180) * radius;
        const sizeClass = a.isPrimary ? "h-14 w-14" : "h-11 w-11";
        const iconWrapperClass = a.isPrimary ? "[&>svg]:h-6 [&>svg]:w-6" : "";
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center animate-in zoom-in duration-300 hover:z-50"
            style={{
              left: x,
              top: y,
              animationFillMode: "both",
              animationDelay: `${i * 15}ms`,
            }}
          >
            <button
              aria-label={a.label}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
                onClose();
              }}
              className={`peer flex ${sizeClass} items-center justify-center rounded-full bg-background border shadow-xl transition-all hover:scale-110 ${
                a.color || "text-foreground hover:text-primary"
              }`}
            >
              <div className={iconWrapperClass}>{a.icon}</div>
            </button>
            <span className="pointer-events-none absolute top-[calc(100%+8px)] opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-popover/95 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md border">
              {a.label}
            </span>
          </div>
        );
      })}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform animate-in zoom-in duration-200" style={{ left: coords.x, top: coords.y }} onClick={(e) => { e.stopPropagation(); onClose(); }} title="Cerrar menú">
        <X className="h-5 w-5" />
      </div>
    </div>,
    document.body
  );
}

function Page() {
  const quotes = useSupplierQuotes((s) => s.quotes);
  const remove = useSupplierQuotes((s) => s.remove);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [view, setView] = useState<SupplierQuote | null>(null);
  const [del, setDel] = useState<SupplierQuote | null>(null);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; quote: SupplierQuote | null }>({
    open: false,
    x: 0,
    y: 0,
    quote: null,
  });

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

      <RadialMenuOverlay
        open={menuState.open}
        coords={{ x: menuState.x, y: menuState.y }}
        onClose={() => setMenuState((prev) => ({ ...prev, open: false }))}
        actions={
          menuState.quote
            ? [
                ...(!menuState.quote.appliedAt && pendingCount(menuState.quote) > 0
                  ? [
                      {
                        label: "Retomar elementos pendientes",
                        icon: <PlayCircle className="h-4 w-4" />,
                        onClick: () => {
                          setResumeId(menuState.quote!.id);
                          setAnalyzeOpen(true);
                        },
                        color: "text-primary",
                    isPrimary: true,
                      },
                    ]
                  : []),
            { label: "Ver", icon: <Eye className="h-4 w-4" />, onClick: () => setView(menuState.quote), color: "text-blue-500", isPrimary: !!menuState.quote.appliedAt || pendingCount(menuState.quote) === 0 },
                {
                  label: "Eliminar",
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => setDel(menuState.quote),
                  color: "text-destructive hover:bg-destructive/10",
                },
              ]
            : []
        }
      />

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
        onRowClick={(e, q) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, input, a, label, [role='checkbox']")) return;

          let cx = e.clientX;
          let cy = e.clientY;

          const margin = 160;
          if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
          if (cx - margin < 0) cx = margin;
          if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
          if (cy - margin < 0) cy = margin;

          setMenuState({ open: true, x: cx, y: cy, quote: q });
        }}
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
              return (
                <div className="flex justify-end">
                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted rounded-full" title="Menú Radial" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); let cx = rect.left + rect.width / 2; let cy = rect.top + rect.height / 2; const margin = 160; if (cx + margin > window.innerWidth) cx = window.innerWidth - margin; if (cx - margin < 0) cx = margin; if (cy + margin > window.innerHeight) cy = window.innerHeight - margin; if (cy - margin < 0) cy = margin; setMenuState({ open: true, x: cx, y: cy, quote: q }); }}>
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground transition-transform hover:scale-110" />
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
