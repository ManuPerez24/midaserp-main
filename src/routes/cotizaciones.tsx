import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  Download,
  FileDown,
  Printer,
  PrinterIcon,
  History,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Settings2,
  ShoppingCart,
  ExternalLink,
  FileEdit,
  RefreshCw,
  MoreHorizontal,
  Kanban,
  Copy,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuotePreviewSheet } from "@/components/quote-preview-sheet";
import { QuoteEditDialog } from "@/components/quote-edit-dialog";
import { PurchaseListsDialog } from "@/components/purchase-lists-dialog";
import { QuoteContentEditDialog } from "@/components/quote-content-edit-dialog";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useSettings } from "@/stores/settings";
import { useInventory } from "@/stores/inventory";
import { requestActivateQuote } from "@/stores/active-task";
import { useLocksStore } from "@/stores/locks";
import { useAuth } from "@/stores/auth";
import { logAction } from "@/stores/audit-log";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Quote, QuoteEvent, QuoteStatus } from "@/lib/types";
import { generateQrDataUrl, quoteVerifyUrl } from "@/lib/qr";
import { QuotePdfDocument } from "@/components/pdf/quote-pdf";
import { notify } from "@/stores/notifications";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";

export const Route = createFileRoute("/cotizaciones")({
  head: () => ({ meta: [{ title: `Cotizaciones · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:cotizaciones">
      <QuotesPage />
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
    icon: React.ReactNode;
    onClick: () => void;
    color?: string;
    isPrimary?: boolean;
  }[];
}) {
  if (!open || typeof document === "undefined") return null;

  // Manda la acción primaria al índice 0 (parte superior del círculo)
  const sortedActions = [...actions].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

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
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform animate-in zoom-in duration-200"
        style={{ left: coords.x, top: coords.y }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Cerrar menú"
      >
        <X className="h-5 w-5" />
      </div>
    </div>,
    document.body
  );
}

const statusVariant: Record<QuoteStatus, string> = {
  Pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  "En Proceso": "bg-blue-100 text-blue-800 border-blue-200",
  Aceptada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Rechazada: "bg-rose-100 text-rose-800 border-rose-200",
  Cerrada: "bg-slate-100 text-slate-700 border-slate-200",
};

function quoteTotal(q: Quote, ivaPercent: number) {
  const sub = q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  return sub * (1 + ivaPercent / 100);
}

// Group consecutive events made within 5 min by same kind
function groupTimelineEvents(events: QuoteEvent[]): QuoteEvent[][] {
  const groups: QuoteEvent[][] = [];
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  for (const ev of sorted) {
    const last = groups[groups.length - 1];
    const lastEv = last?.[last.length - 1];
    if (
      last &&
      lastEv &&
      new Date(ev.at).getTime() - new Date(lastEv.at).getTime() < 5 * 60 * 1000
    ) {
      last.push(ev);
    } else {
      groups.push([ev]);
    }
  }
  return groups;
}

function QuotesPage() {
  const quotes = useQuotes((s) => s.quotes);
  const createQuote = useQuotes((s) => s.create);
  const cloneQuote = useQuotes((s) => s.clone);
  const removeQuote = useQuotes((s) => s.remove);
  const removeManyQuotes = useQuotes((s) => s.removeMany);
  const setStatus = useQuotes((s) => s.setStatus);
  const updateLinePrice = useQuotes((s) => s.updateLinePrice);
  const updateQuote = useQuotes((s) => s.update);

  const clients = useClients((s) => s.clients);
  const settings = useSettings((s) => s.settings);
  const products = useInventory((s) => s.products);
  const updateProduct = useInventory((s) => s.update);
  const consumeFolio = useSettings((s) => s.consumeFolio);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [deleteQ, setDeleteQ] = useState<Quote | null>(null);
  const [previewQ, setPreviewQ] = useState<Quote | null>(null);
  const [timelineQ, setTimelineQ] = useState<Quote | null>(null);
  const [editQ, setEditQ] = useState<Quote | null>(null);
  const [purchaseQ, setPurchaseQ] = useState<Quote | null>(null);
  const [rejectQ, setRejectQ] = useState<Quote | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [contentEditQ, setContentEditQ] = useState<Quote | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; quote: Quote | null }>({
    open: false,
    x: 0,
    y: 0,
    quote: null,
  });

  const canCreate = useCan("cotizaciones:create");
  const canEdit = useCan("cotizaciones:edit");
  const canDelete = useCan("cotizaciones:delete");
  const canStatus = useCan("cotizaciones:status");
  const lockMap = useLocksStore((s) => s.locks);
  const currentUserId = useAuth((s) => s.user?.userId);
  const isLockedByOther = (qid: string) => {
    const h = lockMap[`quote:${qid}`];
    return !!h && h.userId !== currentUserId;
  };
  const lockHolder = (qid: string) => lockMap[`quote:${qid}`] ?? null;

  // Keyboard shortcut: 'n' creates new
  useEffect(() => {
    const onNew = () => {
      if (canCreate) setCreateOpen(true);
    };
    window.addEventListener("app:new", onNew);
    if (sessionStorage.getItem("autoOpenCreate") === "true" && canCreate) {
      sessionStorage.removeItem("autoOpenCreate");
      setCreateOpen(true);
    }
    return () => window.removeEventListener("app:new", onNew);
  }, [canCreate]);

  // Generate QR for the open preview
  useEffect(() => {
    if (!previewQ) {
      setQrUrl(undefined);
      return;
    }
    let cancelled = false;
    generateQrDataUrl(quoteVerifyUrl(previewQ.id))
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [previewQ]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const handleCreate = () => {
    if (!selectedClient) {
      toast.error("Selecciona un cliente");
      return;
    }
    const folio = consumeFolio();
    const q = createQuote(selectedClient, folio);
    requestActivateQuote(q.id);
    setCreateOpen(false);
    setSelectedClient("");
    toast.success(`Cotización ${folio} creada y activa`);
    notify("success", `Cotización ${folio} creada`, `/cotizaciones/${q.id}`);
  };

  const livePreview = useMemo(() => {
    if (!previewQ) return null;
    return quotes.find((x) => x.id === previewQ.id) ?? previewQ;
  }, [previewQ, quotes]);

  const previewClient = livePreview
    ? clients.find((c) => c.id === livePreview.clientId) ?? null
    : null;

  const generatePdf = async (hidePrices: boolean) => {
    if (!livePreview) return null;
    const qrDataUrl = await generateQrDataUrl(quoteVerifyUrl(livePreview.id));
    const partLookup: Record<string, string> = {};
    for (const p of products) partLookup[p.id] = p.partNumber;
    const { pdf } = await import("@react-pdf/renderer");
    return pdf(
      <QuotePdfDocument
        quote={livePreview}
        client={previewClient}
        settings={settings}
        hidePrices={hidePrices}
        qrDataUrl={qrDataUrl}
        partLookup={partLookup}
      />
    ).toBlob();
  };

  const downloadPdf = async (hidePrices: boolean) => {
    if (!livePreview) return;
    setPdfBusy(true);
    try {
      const blob = await generatePdf(hidePrices);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${livePreview.folio}${hidePrices ? "-sin-precios" : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const printPdf = async (hidePrices: boolean) => {
    if (!livePreview) return;
    setPdfBusy(true);
    try {
      const blob = await generatePdf(hidePrices);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) w.onload = () => w.print();
    } catch {
      toast.error("No se pudo imprimir");
    } finally {
      setPdfBusy(false);
    }
  };

  const openQuoteDetail = (id: string) => {
    window.location.assign(`/cotizaciones/${encodeURIComponent(id)}`);
  };

  const handleExportCSV = () => {
    const headers = ["Folio", "Cliente", "Estado", "Total", "Moneda", "Fecha"];
    const csvRows = quotes.map((q) => {
      const c = clients.find((x) => x.id === q.clientId);
      const total = quoteTotal(q, settings.issuer.ivaPercent);
      const currency = q.lines[0]?.currency ?? "MXN";
      return [
        `"${q.folio.replace(/"/g, '""')}"`,
        `"${(c?.receiver || "").replace(/"/g, '""')}"`,
        `"${q.status.replace(/"/g, '""')}"`,
        total.toFixed(2),
        currency,
        new Date(q.createdAt).toLocaleDateString(),
      ].join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotizaciones-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changeStatus = (q: Quote, next: QuoteStatus, reason?: string) => {
    const prev = q.status;
    if (prev === next) return;
    
    setStatus(q.id, next);
    if (reason) {
      updateQuote(q.id, { notes: (q.notes ? q.notes + "\n\n" : "") + "Motivo de rechazo: " + reason });
    }

    const isNowClosed = next === "Aceptada" || next === "Cerrada";
    const wasClosed = prev === "Aceptada" || prev === "Cerrada";

    if ((settings as any).inventory?.enableStock) {
      if (isNowClosed && !wasClosed) {
        q.lines.forEach((l) => {
          const p = products.find((x) => x.id === l.productId);
          if (p) updateProduct(p.id, { stock: ((p as any).stock || 0) - l.quantity } as any);
        });
        toast.success("Stock descontado");
      } else if (!isNowClosed && wasClosed) {
        q.lines.forEach((l) => {
          const p = products.find((x) => x.id === l.productId);
          if (p) updateProduct(p.id, { stock: ((p as any).stock || 0) + l.quantity } as any);
        });
        toast.success("Stock restaurado");
      }
    }

    if (next === "Aceptada") {
      notify("success", `${q.folio} aceptada`, `/cotizaciones/${q.id}`);
    } else if (next === "Rechazada") {
      notify("warning", `${q.folio} rechazada`, `/cotizaciones/${q.id}`);
    }
  };

  const getQuoteActions = (q: Quote) => {
    const blocked = isLockedByOther(q.id);
    return [
      ...(canEdit && !blocked ? [{
        label: "Activar / editar líneas",
        icon: <Pencil className="h-4 w-4" />,
        color: "text-emerald-600",
        isPrimary: true,
        onClick: async () => {
          if (await requestActivateQuote(q.id)) {
            toast.success(`Cotización ${q.folio} activa`);
          }
        },
      }] : []),
      ...(canEdit && !blocked && q.lines.length > 0 ? [{
        label: "Editar contenido",
        icon: <FileEdit className="h-4 w-4" />,
        color: "text-amber-600",
        onClick: () => setContentEditQ(q),
      }] : []),
      ...(canEdit && !blocked ? [{
        label: "Modificar metadatos",
        icon: <Settings2 className="h-4 w-4" />,
        color: "text-slate-600",
        onClick: () => setEditQ(q),
      }] : []),
      ...(canEdit && !blocked && q.lines.length > 0 ? [{
        label: "Actualizar precios",
        icon: <RefreshCw className="h-4 w-4" />,
        color: "text-sky-600",
        onClick: () => {
          let updated = 0;
          let missing = 0;
          for (const l of q.lines) {
            const p = products.find((x) => x.id === l.productId);
            if (!p) {
              missing++;
              continue;
            }
            if (p.price !== l.unitPrice) {
              updateLinePrice(q.id, l.productId, p.price);
              updated++;
            }
          }
          if (updated === 0 && missing === 0) {
            toast.info("Los precios ya están actualizados");
          } else {
            toast.success(
              `Precios actualizados: ${updated} línea(s)${missing ? ` · ${missing} sin producto en inventario` : ""}`
            );
          }
        },
      }] : []),
      {
        label: "Previsualización",
        icon: <Eye className="h-4 w-4" />,
        color: "text-blue-500",
        onClick: () => setPreviewQ(q),
      },
      {
        label: "Línea de tiempo",
        icon: <History className="h-4 w-4" />,
        color: "text-purple-500",
        onClick: () => setTimelineQ(q),
      },
      ...(q.lines.length > 0 ? [{
        label: "Compras por proveedor",
        icon: <ShoppingCart className="h-4 w-4" />,
        color: "text-teal-500",
        onClick: () => setPurchaseQ(q),
      }] : []),
      ...(canCreate ? [{
        label: "Duplicar cotización",
        icon: <Copy className="h-4 w-4" />,
        onClick: () => {
          const folio = consumeFolio();
          cloneQuote(q.id, folio);
          toast.success(`Cotización duplicada como ${folio}`);
          logAction("quote:clone", `Cotización '${q.folio}' duplicada como '${folio}'.`);
        },
      }] : []),
      ...(canDelete && !blocked ? [{
        label: "Eliminar",
        icon: <Trash2 className="h-4 w-4" />,
        color: "text-destructive hover:bg-destructive/10",
        onClick: () => setDeleteQ(q),
      }] : []),
    ];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tus folios, estados y exporta a PDF.
        </p>
      </div>

      <DataTable
        rows={quotes}
        rowKey={(q) => q.id}
        onRowClick={(e, q) => {
          // Evitar que el menú se abra si hacemos clic en botones, checkboxes o selectores
          const target = e.target as HTMLElement;
          if (target.closest("button, input, a, label, [role='checkbox'], select, [role='combobox']")) return;

          let cx = e.clientX;
          let cy = e.clientY;

          const margin = 160;
          if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
          if (cx - margin < 0) cx = margin;
          if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
          if (cy - margin < 0) cy = margin;

          setMenuState({ open: true, x: cx, y: cy, quote: q });
        }}
        searchPlaceholder="Buscar por folio o cliente..."
        searchAccessor={(q) => {
          const c = clients.find((x) => x.id === q.clientId);
          return `${q.folio} ${c?.receiver ?? ""} ${c?.company ?? ""}`;
        }}
        toolbar={
          <div className="flex gap-2">
            {canDelete && selected.size > 0 && (
              <Button variant="destructive" onClick={() => setBulkOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selected.size})
              </Button>
            )}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Button asChild variant="outline">
              <Link to="/kanban"><Kanban className="mr-2 h-4 w-4" /> Vista Kanban</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/compras"><ShoppingCart className="mr-2 h-4 w-4" /> Órdenes de compra</Link>
            </Button>
            {canCreate && (
              <Button disabled={clients.length === 0} onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nueva cotización
              </Button>
            )}
          </div>
        }
        emptyState={
          clients.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Necesitas crear un cliente antes de cotizar.
              </p>
              <Link to="/clientes">
                <Button variant="outline" size="sm">
                  Ir a clientes
                </Button>
              </Link>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sin cotizaciones aún.</span>
          )
        }
        columns={[
          {
            key: "select",
            header: "",
            className: "w-8",
            cell: (q) => (
              <Checkbox
                checked={selected.has(q.id)}
                onCheckedChange={() => toggle(q.id)}
                aria-label="Seleccionar"
              />
            ),
          },
          {
            key: "folio",
            header: "Folio",
            sortable: true,
            accessor: (q) => q.folio,
          cell: (q) => <Link to="/cotizaciones/$id" params={{ id: q.id }} className="font-mono font-bold text-primary hover:underline">{q.folio}</Link>,
          },
          {
            key: "client",
            header: "Cliente",
            sortable: true,
            accessor: (q) => clients.find((c) => c.id === q.clientId)?.receiver ?? "",
            cell: (q) => {
              const c = clients.find((x) => x.id === q.clientId);
              return c ? (
                <div>
                  <div className="font-medium">{c.receiver}</div>
                  {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                </div>
              ) : (
                <span className="text-muted-foreground italic">Cliente eliminado</span>
              );
            },
          },
          {
            key: "status",
            header: "Estado",
            sortable: true,
            accessor: (q) => q.status,
            cell: (q) => (
              <Select
                value={q.status}
                disabled={!canStatus}
                onValueChange={(v) => {
                  const next = v as QuoteStatus;
                  if (next === "Rechazada" && q.status !== "Rechazada") {
                    setRejectQ(q);
                  } else {
                    changeStatus(q, next);
                  }
                }}
              >
                <SelectTrigger className={`h-8 w-[140px] border ${statusVariant[q.status]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Pendiente", "En Proceso", "Aceptada", "Rechazada", "Cerrada"] as const).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            ),
          },
          {
            key: "lines",
            header: "Líneas",
            sortable: true,
            accessor: (q) => q.lines.length,
            cell: (q) => <Badge variant="secondary">{q.lines.length}</Badge>,
          },
          {
            key: "total",
            header: "Total",
            sortable: true,
            accessor: (q) => quoteTotal(q, settings.issuer.ivaPercent),
            cell: (q) => (
              <span className="font-semibold">
                {formatMoney(
                  quoteTotal(q, settings.issuer.ivaPercent),
                  q.lines[0]?.currency ?? "MXN"
                )}
              </span>
            ),
          },
          {
            key: "date",
            header: "Fecha",
            sortable: true,
            accessor: (q) => q.createdAt,
            cell: (q) => <span className="text-sm">{formatDate(q.createdAt)}</span>,
          },
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (q) => {
              const blocked = isLockedByOther(q.id);
              const holder = lockHolder(q.id);
              return (
                <div className="flex items-center justify-end gap-1">
                  {blocked && holder && (
                    <span
                      className="text-[10px] text-amber-700"
                      title={`En edición por ${holder.userName ?? holder.userEmail}`}
                    >
                      🔒 {holder.userName ?? holder.userEmail}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-muted rounded-full"
                    title="Menú Radial"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      let cx = rect.left + rect.width / 2;
                      let cy = rect.top + rect.height / 2;

                      const margin = 160;
                      if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
                      if (cx - margin < 0) cx = margin;
                      if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
                      if (cy - margin < 0) cy = margin;

                      setMenuState({ open: true, x: cx, y: cy, quote: q });
                    }}
                  >
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground transition-transform hover:scale-110" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cotización</DialogTitle>
            <DialogDescription>
              Folio:{" "}
              <span className="font-mono">
                {settings.folio.prefix}{String(settings.folio.nextNumber).padStart(settings.folio.pad, "0")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.receiver} {c.company && `· ${c.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const c = clients.find((x) => x.id === selectedClient);
              if (!c) return null;
              const qs = quotes.filter((q) => q.clientId === c.id);
              const totalAmount = qs.reduce(
                (sum, q) => sum + quoteTotal(q, settings.issuer.ivaPercent),
                0
              );
              const currency = qs[0]?.lines[0]?.currency ?? "MXN";
              return (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Resumen del cliente
                  </div>
                  <div>
                    {qs.length} cotizaciones históricas
                  </div>
                  {qs.length > 0 ? (
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">Total cotizado:</span>
                      <span className="font-semibold">
                        {formatMoney(totalAmount, currency)}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            <div className="flex justify-between gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/clientes">Ir a clientes</Link>
              </Button>
              <Button onClick={handleCreate} disabled={!selectedClient}>
                Crear y activar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview con 4 botones imprimir/descargar */}
      <Dialog open={!!previewQ} onOpenChange={(o) => !o && setPreviewQ(null)}>
        <DialogContent className="max-w-5xl p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="font-mono">
              Previsualización · {livePreview?.folio}
            </DialogTitle>
            <DialogDescription>
              {previewClient?.receiver ?? "Sin cliente"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[65vh] w-full bg-muted">
            {livePreview && (
              <div className="p-4 sm:p-6">
                <QuotePreviewSheet
                  quote={livePreview}
                  client={previewClient}
                  settings={settings}
                  qrDataUrl={qrUrl}
                />
              </div>
            )}
          </ScrollArea>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
            {livePreview ? (
              <Button variant="ghost" onClick={() => openQuoteDetail(livePreview.id)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir detalle
              </Button>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printPdf(true)}
                disabled={pdfBusy}
              >
                <PrinterIcon className="mr-2 h-4 w-4" /> Imprimir sin precios
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPdf(true)}
                disabled={pdfBusy}
              >
                <FileDown className="mr-2 h-4 w-4" /> Descargar sin precios
              </Button>
              <Button size="sm" variant="outline" onClick={() => printPdf(false)} disabled={pdfBusy}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir cotización
              </Button>
              <Button size="sm" onClick={() => downloadPdf(false)} disabled={pdfBusy}>
                <Download className="mr-2 h-4 w-4" /> Descargar cotización
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Línea de tiempo */}
      <Dialog open={!!timelineQ} onOpenChange={(o) => !o && setTimelineQ(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              Línea de tiempo · {timelineQ?.folio}
            </DialogTitle>
            <DialogDescription>
              Cambios y modificaciones (las acciones del mismo tipo en menos de 5 minutos
              se agrupan).
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            {timelineQ && (() => {
              const groups = groupTimelineEvents(timelineQ.events ?? []);
              if (groups.length === 0) {
                return (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Sin eventos registrados.
                  </p>
                );
              }
              return (
                <ol className="relative ml-3 space-y-4 border-l pl-5">
                  {groups.map((group) => {
                    const first = group[0];
                    const last = group[group.length - 1];
                    return (
                      <li key={first.id} className="relative">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                        <p className="text-xs text-muted-foreground">
                          {new Date(first.at).toLocaleString("es-MX")}
                          {group.length > 1 && (
                            <>
                              {" → "}
                              {new Date(last.at).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                          {group.length > 1 && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              ×{group.length}
                            </Badge>
                          )}
                        </p>
                        <ul className="mt-1 space-y-0.5 text-sm">
                          {group.map((ev) => (
                            <li key={ev.id}>{ev.message}</li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ol>
              );
            })()}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimelineQ(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteQ} onOpenChange={(o) => !o && setDeleteQ(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cotización {deleteQ?.folio}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteQ) {
                  removeQuote(deleteQ.id);
                  toast.success("Cotización eliminada");
                  setDeleteQ(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selected.size} cotización(es)</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeManyQuotes([...selected]);
                setSelected(new Set());
                setBulkOpen(false);
                toast.success("Cotizaciones eliminadas");
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editQ ? (
        <QuoteEditDialog
          quote={editQ}
          open={!!editQ}
          onOpenChange={(o) => !o && setEditQ(null)}
        />
      ) : null}

      {purchaseQ ? (
        <PurchaseListsDialog
          quote={purchaseQ}
          open={!!purchaseQ}
          onOpenChange={(o) => !o && setPurchaseQ(null)}
        />
      ) : null}

      {contentEditQ ? (
        <QuoteContentEditDialog
          quote={contentEditQ}
          open={!!contentEditQ}
          onOpenChange={(o) => !o && setContentEditQ(null)}
        />
      ) : null}

      <Dialog open={!!rejectQ} onOpenChange={(o) => !o && setRejectQ(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de rechazo</DialogTitle>
            <DialogDescription>
              ¿Por qué se rechazó la cotización {rejectQ?.folio}? (Opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Precio alto, se fue con la competencia, tiempo de entrega..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectQ(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (rejectQ) changeStatus(rejectQ, "Rechazada", rejectReason);
              setRejectQ(null);
              setRejectReason("");
            }}>Confirmar rechazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RadialMenuOverlay
        open={menuState.open}
        coords={{ x: menuState.x, y: menuState.y }}
        onClose={() => setMenuState((prev) => ({ ...prev, open: false }))}
        actions={menuState.quote ? getQuoteActions(menuState.quote) : []}
      />
    </div>
  );
}
