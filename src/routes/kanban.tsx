import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useSettings } from "@/stores/settings";
import { useInventory } from "@/stores/inventory";
import { useLocksStore } from "@/stores/locks";
import { useAuth } from "@/stores/auth";
import { PageGuard } from "@/components/page-guard";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Quote, QuoteStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft, ExternalLink, Eye, Trash2, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuotePreviewSheet } from "@/components/quote-preview-sheet";
import { generateQrDataUrl, quoteVerifyUrl } from "@/lib/qr";
import { toast } from "sonner";

export const Route = createFileRoute("/kanban")({
  head: () => ({ meta: [{ title: `Kanban de Cotizaciones · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:cotizaciones">
      <KanbanPage />
    </PageGuard>
  ),
});

const STATUSES: QuoteStatus[] = ["Pendiente", "En Proceso", "Aceptada", "Rechazada", "Cerrada"];

const statusColors: Record<QuoteStatus, { bg: string; text: string; badge: string }> = {
  Pendiente: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-700 dark:text-amber-500", badge: "bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20" },
  "En Proceso": { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-700 dark:text-blue-500", badge: "bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20" },
  Aceptada: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-500", badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20" },
  Rechazada: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-700 dark:text-rose-500", badge: "bg-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20" },
  Cerrada: { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-700 dark:text-slate-400", badge: "bg-slate-500/20 text-slate-700 dark:text-slate-400 hover:bg-slate-500/20" },
};

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
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      {validActions.map((a, i) => {
        const angle = (i / validActions.length) * 360 - 90;
        const radius = 75;
        const x = coords.x + Math.cos((angle * Math.PI) / 180) * radius;
        const y = coords.y + Math.sin((angle * Math.PI) / 180) * radius;
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
              onClick={(e) => { e.stopPropagation(); a.onClick(); onClose(); }}
              className={`peer flex h-11 w-11 items-center justify-center rounded-full bg-background border shadow-xl transition-all hover:scale-125 ${
                a.color || "text-foreground hover:text-primary"
              }`}
            >
              {a.icon}
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
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title="Cerrar menú"
      >
        <X className="h-5 w-5" />
      </div>
    </div>,
    document.body
  );
}

function KanbanPage() {
  const quotes = useQuotes((s) => s.quotes);
  const setStatus = useQuotes((s) => s.setStatus);
  const removeQuote = useQuotes((s) => s.remove);
  const clients = useClients((s) => s.clients);
  const settings = useSettings((s) => s.settings);
  const products = useInventory((s) => s.products);
  const updateProduct = useInventory((s) => s.update);
  
  const lockMap = useLocksStore((s) => s.locks);
  const currentUserId = useAuth((s) => s.user?.userId);
  const navigate = useNavigate();

  const [timeFilter, setTimeFilter] = useState<"7dias" | "mes" | "pasado" | "ano" | "todo">("mes");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; quote: Quote | null }>({ open: false, x: 0, y: 0, quote: null });
  const [deleteQ, setDeleteQ] = useState<Quote | null>(null);
  const [previewQ, setPreviewQ] = useState<Quote | null>(null);
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!previewQ) {
      setQrUrl(undefined);
      return;
    }
    let cancelled = false;
    generateQrDataUrl(quoteVerifyUrl(previewQ.id)).then((u) => { if (!cancelled) setQrUrl(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, [previewQ]);

  const getQuoteActions = (q: Quote) => {
    const isLocked = lockMap[`quote:${q.id}`] && lockMap[`quote:${q.id}`].userId !== currentUserId;
    return [
      { label: "Previsualización", icon: <Eye className="h-4 w-4" />, color: "text-blue-500", isPrimary: true, onClick: () => setPreviewQ(q) },
      ...(!isLocked ? [{
        label: "Eliminar",
        icon: <Trash2 className="h-4 w-4" />,
        color: "text-destructive hover:bg-destructive/10",
        onClick: () => setDeleteQ(q),
      }] : [])
    ];
  };

  const filteredQuotes = useMemo(() => {
    const now = new Date();
    return quotes.filter((q) => {
      if (timeFilter === "todo") return true;
      const d = new Date(q.createdAt);
      if (timeFilter === "7dias") {
         return Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }
      if (timeFilter === "mes") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (timeFilter === "pasado") {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
      }
      if (timeFilter === "ano") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [quotes, timeFilter]);

  const columns = useMemo(() => {
    const cols: Record<QuoteStatus, Quote[]> = {
      Pendiente: [],
      "En Proceso": [],
      Aceptada: [],
      Rechazada: [],
      Cerrada: [],
    };
    for (const q of filteredQuotes) {
      if (cols[q.status]) cols[q.status].push(q);
    }
    return cols;
  }, [filteredQuotes]);

  const quoteTotal = (q: Quote) => {
    const sub = q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
    return sub * (1 + settings.issuer.ivaPercent / 100);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: QuoteStatus) => {
    e.preventDefault();
    if (draggedId) {
      const q = quotes.find(x => x.id === draggedId);
      if (q && q.status !== status) {
        const h = lockMap[`quote:${q.id}`];
        if (h && h.userId !== currentUserId) {
           toast.error(`Cotización bloqueada por ${h.userName || h.userEmail}`);
           return;
        }
        
        const prev = q.status;
        setStatus(q.id, status);
        
        const isNowClosed = status === "Aceptada" || status === "Cerrada";
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
        toast.success(`Movida a ${status}`);
      }
      setDraggedId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/cotizaciones">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kanban de Cotizaciones</h1>
            <p className="text-sm text-muted-foreground">
              Arrastra y suelta para cambiar el estado.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Filtro:</span>
          <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
            <SelectTrigger className="h-7 w-[140px] text-xs border-none bg-transparent shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7dias">Últimos 7 días</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="pasado">Mes pasado</SelectItem>
              <SelectItem value="ano">Este año</SelectItem>
              <SelectItem value="todo">Todo el tiempo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4 items-stretch min-h-0">
        {STATUSES.map(status => {
          const colQuotes = columns[status];
          const colTotal = colQuotes.reduce((acc, q) => acc + quoteTotal(q), 0);
          
          return (
            <div
              key={status}
              className={`flex w-[300px] shrink-0 flex-col rounded-xl border p-3 ${statusColors[status].bg}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="mb-3 px-1 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm ${statusColors[status].text}`}>{status}</h3>
                  <Badge variant="secondary" className={`text-xs border-none ${statusColors[status].badge}`}>{colQuotes.length}</Badge>
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-1">
                  {formatMoney(colTotal, settings.branding.defaultCurrency || "MXN")}
                </div>
              </div>
              
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto min-h-0 pb-2">
                {colQuotes.map(q => {
                  const client = clients.find(c => c.id === q.clientId);
                  const total = quoteTotal(q);
                  const isLocked = lockMap[`quote:${q.id}`] && lockMap[`quote:${q.id}`].userId !== currentUserId;
                  return (
                    <Card
                      key={q.id}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, q.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const target = e.target as HTMLElement;
                        if (target.closest("button, a")) return;
                        let cx = e.clientX;
                        let cy = e.clientY;
                        const margin = 160;
                        if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
                        if (cx - margin < 0) cx = margin;
                        if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
                        if (cy - margin < 0) cy = margin;
                        setMenuState({ open: true, x: cx, y: cy, quote: q });
                      }}
                      className={`cursor-grab active:cursor-grabbing border-l-4 shadow-sm transition-all hover:shadow-md ${isLocked ? "opacity-75 cursor-not-allowed" : ""}`}
                      style={{ borderLeftColor: settings.branding.primaryColor }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Link to="/cotizaciones/$id" params={{ id: q.id }} className="font-mono text-xs font-bold hover:underline">
                            {q.folio}
                          </Link>
                          <span className="text-xs font-semibold text-foreground">
                            {formatMoney(total, q.lines[0]?.currency || settings.branding.defaultCurrency || "MXN")}
                          </span>
                        </div>
                        <div className="text-sm font-medium leading-tight mb-1 line-clamp-2">
                          {client?.receiver || "Sin cliente"}
                        </div>
                        {client?.company && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {client.company}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(q.createdAt)}
                          </div>
                          {isLocked && <span className="text-amber-600 font-medium text-[10px]">🔒 Bloqueada</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <RadialMenuOverlay
        open={menuState.open}
        coords={{ x: menuState.x, y: menuState.y }}
        onClose={() => setMenuState((prev) => ({ ...prev, open: false }))}
        actions={menuState.quote ? getQuoteActions(menuState.quote) : []}
      />

      <Dialog open={!!previewQ} onOpenChange={(o) => !o && setPreviewQ(null)}>
        <DialogContent className="max-w-5xl p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="font-mono">
              Previsualización · {previewQ?.folio}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] w-full bg-muted">
            {previewQ && (
              <div className="p-4 sm:p-6">
                <QuotePreviewSheet quote={previewQ} client={clients.find((c) => c.id === previewQ.clientId) ?? null} settings={settings} qrDataUrl={qrUrl} />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteQ} onOpenChange={(o) => !o && setDeleteQ(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la cotización {deleteQ?.folio}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteQ) {
                removeQuote(deleteQ.id);
                toast.success("Cotización eliminada");
                setDeleteQ(null);
              }
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}