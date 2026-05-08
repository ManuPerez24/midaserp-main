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
} from "lucide-react";
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
import { formatDate, formatMoney } from "@/lib/utils";
import type { Quote, QuoteEvent, QuoteStatus } from "@/lib/types";
import { generateQrDataUrl, quoteVerifyUrl } from "@/lib/qr";
import { QuotePdfDocument } from "@/components/pdf/quote-pdf";
import { notify } from "@/stores/notifications";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";

export const Route = createFileRoute("/cotizaciones")({
  head: () => ({ meta: [{ title: "Cotizaciones · MIDAS ERP" }] }),
  component: () => (
    <PageGuard permission="page:cotizaciones">
      <QuotesPage />
    </PageGuard>
  ),
});

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
      lastEv.kind === ev.kind &&
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
  const removeQuote = useQuotes((s) => s.remove);
  const removeManyQuotes = useQuotes((s) => s.removeMany);
  const setStatus = useQuotes((s) => s.setStatus);
  const updateLinePrice = useQuotes((s) => s.updateLinePrice);

  const clients = useClients((s) => s.clients);
  const settings = useSettings((s) => s.settings);
  const products = useInventory((s) => s.products);
  const consumeFolio = useSettings((s) => s.consumeFolio);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [deleteQ, setDeleteQ] = useState<Quote | null>(null);
  const [previewQ, setPreviewQ] = useState<Quote | null>(null);
  const [timelineQ, setTimelineQ] = useState<Quote | null>(null);
  const [editQ, setEditQ] = useState<Quote | null>(null);
  const [purchaseQ, setPurchaseQ] = useState<Quote | null>(null);
  const [contentEditQ, setContentEditQ] = useState<Quote | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);
  const [pdfBusy, setPdfBusy] = useState(false);

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
            cell: (q) => <span className="font-mono font-semibold">{q.folio}</span>,
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
                  if (next === q.status) return;
                  setStatus(q.id, next);
                  if (next === "Aceptada") {
                    notify("success", `${q.folio} aceptada`, `/cotizaciones/${q.id}`);
                  } else if (next === "Rechazada") {
                    notify("warning", `${q.folio} rechazada`, `/cotizaciones/${q.id}`);
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
                    size="icon"
                    className="h-8 w-8"
                    title="Abrir detalle"
                    onClick={() => openQuoteDetail(q.id)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Ver previsualización"
                    onClick={() => setPreviewQ(q)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Línea de tiempo"
                    onClick={() => setTimelineQ(q)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={blocked}
                      title={blocked ? "En edición por otro usuario" : "Modificar"}
                      onClick={() => setEditQ(q)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={blocked || q.lines.length === 0}
                      title={blocked ? "En edición por otro usuario" : "Editar contenido"}
                      onClick={() => setContentEditQ(q)}
                    >
                      <FileEdit className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={blocked || q.lines.length === 0}
                      title={blocked ? "En edición por otro usuario" : "Actualizar precios"}
                      onClick={() => {
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
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Compras por proveedor"
                    disabled={q.lines.length === 0}
                    onClick={() => setPurchaseQ(q)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={blocked}
                      title={blocked ? "En edición por otro usuario" : "Activar / editar líneas"}
                      onClick={async () => {
                        if (await requestActivateQuote(q.id)) {
                          toast.success(`Cotización ${q.folio} activa`);
                        }
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={blocked}
                      onClick={() => setDeleteQ(q)}
                      title={blocked ? "En edición por otro usuario" : "Eliminar"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
                {settings.folio.prefix}
                {settings.folio.nextNumber.toString().padStart(settings.folio.pad, "0")}
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
              if (!c) {
                return (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Selecciona un cliente para ver su información.
                  </div>
                );
              }
              const previous = quotes.filter((q) => q.clientId === c.id);
              const totalCount = previous.length;
              const totalAmount = previous.reduce(
                (acc, q) =>
                  acc +
                  q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) *
                    (1 + settings.issuer.ivaPercent / 100),
                0
              );
              const currency = previous[0]?.lines[0]?.currency ?? "MXN";
              return (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-base font-semibold">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {c.receiver}
                      </p>
                      {c.company ? (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {c.company}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {totalCount} cotiz.
                    </Badge>
                  </div>
                  <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    ) : null}
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {c.phone}
                      </a>
                    ) : null}
                    {c.address ? (
                      <p className="flex items-start gap-1.5 sm:col-span-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{c.address}</span>
                      </p>
                    ) : null}
                  </div>
                  {totalCount > 0 ? (
                    <div className="flex items-center justify-between border-t pt-2 text-xs">
                      <span className="text-muted-foreground">
                        Histórico ({totalCount} cotizaciones)
                      </span>
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
    </div>
  );
}
