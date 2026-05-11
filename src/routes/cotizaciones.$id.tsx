import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  FileDown,
  Pencil,
  Printer,
  Trash2,
  Package,
  Share2,
  Save,
  LayoutTemplate,
  Calendar,
  Copy,
  ShoppingCart,
  MessageCircle,
  RefreshCcw,
  Mail,
  Paperclip,
  Upload,
  File,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useSettings } from "@/stores/settings";
import { useInventory } from "@/stores/inventory";
import { useActiveTask, requestActivateQuote, clearActiveTask } from "@/stores/active-task";
import { logAction } from "@/stores/audit-log";
import { useResourceLock } from "@/lib/use-resource-lock";
import { useAuth } from "@/stores/auth";
import { useQuoteTemplates } from "@/stores/quote-templates";
import { formatDate, formatMoney } from "@/lib/utils";
import { computeTotals, daysUntil, isExpired } from "@/lib/quote-calc";
import { generateQrDataUrl, quoteVerifyUrl } from "@/lib/qr";
import { QuotePdfDocument } from "@/components/pdf/quote-pdf";
import { QuoteEditDialog } from "@/components/quote-edit-dialog";
import { PurchaseListsDialog } from "@/components/purchase-lists-dialog";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";

export const Route = createFileRoute("/cotizaciones/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Cotización ${params.id.slice(0, 6)} · ${useSettings.getState().settings.branding.siteName}` }],
  }),
  component: () => (
    <PageGuard permission="page:cotizaciones">
      <QuoteDetail />
    </PageGuard>
  ),
  notFoundComponent: () => (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Cotización no encontrada.</p>
      <Link to="/cotizaciones">
        <Button variant="outline" className="mt-3">
          Volver
        </Button>
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-center py-16">
      <p className="text-destructive">Error: {error.message}</p>
    </div>
  ),
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const quote = useQuotes((s) => s.quotes.find((q) => q.id === id));
  const canCreate = useCan("cotizaciones:create");
  const removeLine = useQuotes((s) => s.removeLine);
  const cloneQuote = useQuotes((s) => s.clone);
  const updateLineQty = useQuotes((s) => s.updateLineQty);
  const updateLineDiscount = useQuotes((s) => s.updateLineDiscount);
  const updateLinePrice = useQuotes((s) => s.updateLinePrice);
  const updateLineFields = useQuotes((s) => s.updateLineFields);
  const setGlobalDiscount = useQuotes((s) => s.setGlobalDiscount);
  const setValidUntil = useQuotes((s) => s.setValidUntil);
  const applyTemplate = useQuotes((s) => s.applyTemplate);
  const updateQuote = useQuotes((s) => s.update);

  const clients = useClients((s) => s.clients);
  const settings = useSettings((s) => s.settings);
  const consumeFolio = useSettings((s) => s.consumeFolio);
  const products = useInventory((s) => s.products);
  const active = useActiveTask((s) => s.active);
  
  const templates = useQuoteTemplates((s) => s.templates);
  const addTemplate = useQuoteTemplates((s) => s.add);
  const removeTemplate = useQuoteTemplates((s) => s.remove);

  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [commentary, setCommentary] = useState(quote?.commentary ?? "");
  const [globalDisc, setGlobalDisc] = useState<string>(
    String(quote?.globalDiscountPercent ?? 0),
  );
  const [validUntilStr, setValidUntilStr] = useState<string>(
    quote?.validUntil ? quote.validUntil.slice(0, 10) : "",
  );
  const [tplOpen, setTplOpen] = useState(false);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<string>("");
  const [targetCurrency, setTargetCurrency] = useState<"MXN" | "USD">("USD");
  const [fetchingRate, setFetchingRate] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplValidity, setTplValidity] = useState("15");
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (quote) {
      setNotes(quote.notes);
      setCommentary(quote.commentary ?? "");
      setGlobalDisc(String(quote.globalDiscountPercent ?? 0));
      setValidUntilStr(quote.validUntil ? quote.validUntil.slice(0, 10) : "");
    }
  }, [quote?.id]);

  useEffect(() => {
    if (!quote) return;
    let cancelled = false;
    generateQrDataUrl(quoteVerifyUrl(quote.id)).then((u) => {
      if (!cancelled) setQrUrl(u);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quote?.id]);

  if (!quote) throw notFound();

  const client = clients.find((c) => c.id === quote.clientId) ?? null;
  const isActive = active?.kind === "quote" && active.id === quote.id;
  const lock = useResourceLock(`quote:${quote.id}`);
  const lockedByOther = !!lock.holder && !lock.isMine;
  const currentUser = useAuth((s) => s.user);

  const totals = useMemo(
    () => computeTotals(quote, settings.issuer.ivaPercent),
    [quote, settings.issuer.ivaPercent],
  );
  const currency = quote.lines[0]?.currency ?? "MXN";
  const expired = isExpired(quote.validUntil);
  const remainingDays = daysUntil(quote.validUntil);
  const currentCurrency = quote.lines[0]?.currency ?? "MXN";

  const publicUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/cotizaciones/${quote.id}/publica`
        : "",
    [quote.id],
  );

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link público copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const sendWhatsApp = () => {
    const msg = `Hola ${client?.receiver ?? ""}, te comparto tu cotización ${quote.folio} por un total de ${formatMoney(totals.total, currency)}.\n\nPuedes revisarla y descargarla aquí:\n${publicUrl}`;
    const phone = client?.phone ? client.phone.replace(/\D/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendEmail = () => {
    const subject = `Cotización ${quote.folio}`;
    const body = `Hola ${client?.receiver ?? ""},\n\nTe comparto la cotización ${quote.folio} por un total de ${formatMoney(totals.total, currency)}.\n\nPuedes verla y descargarla en el siguiente enlace:\n${publicUrl}`;
    window.open(`mailto:${client?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim()) {
      toast.error("Pon un nombre");
      return;
    }
    addTemplate({
      name: tplName.trim(),
      lines: quote.lines.map((l) => ({ ...l })),
      notes: quote.notes,
      commentary: quote.commentary,
      globalDiscountPercent: quote.globalDiscountPercent,
      validityDays: parseInt(tplValidity, 10) || undefined,
    });
    setSaveTplOpen(false);
    setTplName("");
    toast.success("Plantilla guardada");
  };


  const downloadPdf = async (hidePrices: boolean) => {
    try {
      const imageLookup: Record<string, string | null> = {};
      const partLookup: Record<string, string> = {};
      for (const p of products) {
        partLookup[p.id] = p.partNumber || "";
        imageLookup[p.id] = p.imageDataUrl || null;
      }

      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <QuotePdfDocument
          quote={quote}
          client={client}
          settings={settings}
          hidePrices={hidePrices}
          qrDataUrl={qrUrl}
          partLookup={partLookup}
          imageLookup={imageLookup}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.folio}${hidePrices ? "-logistica" : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    }
  };

  const printPdf = async () => {
    try {
      const imageLookup: Record<string, string | null> = {};
      const partLookup: Record<string, string> = {};
      for (const p of products) {
        partLookup[p.id] = p.partNumber || "";
        imageLookup[p.id] = p.imageDataUrl || null;
      }

      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <QuotePdfDocument 
          quote={quote} 
          client={client} 
          settings={settings} 
          qrDataUrl={qrUrl}
          partLookup={partLookup}
          imageLookup={imageLookup}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) w.onload = () => w.print();
    } catch {
      toast.error("No se pudo imprimir");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result),
        createdAt: new Date().toISOString(),
      };
      updateQuote(quote.id, { attachments: [...(quote.attachments || []), newAttachment] });
      toast.success("Archivo adjuntado correctamente");
      logAction("quote:attachment-added", `Archivo '${file.name}' adjuntado a la cotización ${quote.folio}`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {lockedByOther && lock.holder && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div>
            <strong>Solo lectura.</strong> En edición por{" "}
            <span className="font-medium">
              {lock.holder.userName ?? lock.holder.userEmail}
            </span>
            .
          </div>
          {currentUser?.isAdmin && (
            <Button variant="outline" size="sm" onClick={() => lock.forceRelease()}>
              Forzar desbloqueo
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/cotizaciones">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{quote.folio}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Select
                disabled={lockedByOther}
                value={quote.clientId}
                onValueChange={(v) => {
                  if (v && v !== quote.clientId) {
                    updateQuote(quote.id, { clientId: v });
                    toast.success("Cliente actualizado");
                  }
                }}
              >
                <SelectTrigger className="h-7 w-auto min-w-[200px] gap-2 border-dashed text-sm">
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.receiver} {c.company && `· ${c.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>·</span>
              <span>{formatDate(quote.createdAt)}</span>
              {quote.validUntil ? (
                <>
                  <span>·</span>
                  {expired ? (
                    <Badge variant="destructive">VENCIDA</Badge>
                  ) : remainingDays !== null && remainingDays <= 7 ? (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">
                      Vence en {remainingDays}d
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Vence {formatDate(quote.validUntil)}</Badge>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <Button variant="outline" onClick={() => clearActiveTask()}>
              Cerrar modo edición
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={lockedByOther}
              onClick={() => requestActivateQuote(quote.id)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Editar líneas
            </Button>
          )}
          <Button variant="outline" disabled={lockedByOther} onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Modificar
          </Button>
          <Button variant="outline" onClick={() => setTplOpen(true)}>
            <LayoutTemplate className="mr-2 h-4 w-4" /> Plantillas
          </Button>
          {canCreate && (
            <Button variant="outline" onClick={() => {
              const folio = consumeFolio();
              const newQ = cloneQuote(quote.id, folio);
              toast.success(`Cotización duplicada como ${folio}`);
              logAction("quote:clone", `Cotización '${quote.folio}' duplicada como '${folio}'.`);
              window.location.assign(`/cotizaciones/${newQ.id}`);
            }}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" /> Compartir
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyPublicLink}>
                <Copy className="mr-2 h-4 w-4" /> Copiar enlace web
              </DropdownMenuItem>
              <DropdownMenuItem onClick={sendWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" /> Enviar por WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={sendEmail}>
                <Mail className="mr-2 h-4 w-4 text-blue-600" /> Enviar por Correo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setTargetCurrency(currentCurrency === "MXN" ? "USD" : "MXN");
                setExchangeRate("");
                setConvertOpen(true);
              }}>
                <RefreshCcw className="mr-2 h-4 w-4 text-amber-600" /> Convertir moneda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={printPdf}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={() => downloadPdf(true)}>
            <FileDown className="mr-2 h-4 w-4" /> PDF logística
          </Button>
          <Button
            variant="outline"
            onClick={() => setPurchaseOpen(true)}
            disabled={quote.lines.length === 0}
            title="Generar PDFs de compras separados por proveedor"
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Compras por proveedor
          </Button>
          <Button onClick={() => downloadPdf(false)}>
            <Download className="mr-2 h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Productos</CardTitle>
            <Badge variant="secondary">{quote.lines.length} líneas</Badge>
          </CardHeader>
          <CardContent>
            {quote.lines.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                Activa esta cotización y agrega productos desde el inventario o inyecta un kit.
                {!isActive && (
                  <div className="mt-3">
                    <Button size="sm" onClick={() => requestActivateQuote(quote.id)}>
                      Activar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24">Cant.</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.lines.map((l) => (
                      <TableRow key={l.productId}>
                        <TableCell className="font-mono text-xs">{l.sku}</TableCell>
                        <TableCell>
                          <Input
                            value={l.name}
                            disabled={lockedByOther}
                            onChange={(e) =>
                              updateLineFields(quote.id, l.productId, { name: e.target.value })
                            }
                            className="h-8 font-medium"
                          />
                          <Input
                            value={l.description ?? ""}
                            disabled={lockedByOther}
                            onChange={(e) =>
                              updateLineFields(quote.id, l.productId, { description: e.target.value })
                            }
                            placeholder="Descripción"
                            className="mt-1 h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            disabled={lockedByOther}
                            value={l.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              updateLineQty(quote.id, l.productId, newQty);
                              const prod = products.find(p => p.id === l.productId);
                              if (prod?.volumePrices && prod.volumePrices.length > 0) {
                                const applicable = [...prod.volumePrices].sort((a,b) => b.minQty - a.minQty).find(v => newQty >= v.minQty);
                                const newPrice = applicable ? applicable.price : prod.price;
                                if (newPrice !== l.unitPrice) {
                                  updateLinePrice(quote.id, l.productId, newPrice);
                                }
                              }
                            }}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={lockedByOther}
                            value={l.unitPrice}
                            onChange={(e) =>
                              updateLinePrice(quote.id, l.productId, parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-28 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(l.unitPrice * l.quantity, l.currency)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={lockedByOther}
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeLine(quote.id, l.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {totals.lineDiscounts > 0 ? (
              <div className="flex justify-between text-rose-600">
                <span>Desc. por línea</span>
                <span>− {formatMoney(totals.lineDiscounts, currency)}</span>
              </div>
            ) : null}
            <div>
              <Label className="mb-1.5 flex items-center justify-between text-xs">
                <span>Descuento global %</span>
                {(quote.globalDiscountPercent ?? 0) > 0 ? (
                  <span className="text-rose-600">
                    − {formatMoney(totals.globalDiscount, currency)}
                  </span>
                ) : null}
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={globalDisc}
                onChange={(e) => setGlobalDisc(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(globalDisc) || 0;
                  if (v !== (quote.globalDiscountPercent ?? 0)) {
                    setGlobalDiscount(quote.id, v);
                    toast.success("Descuento global actualizado");
                  }
                }}
                className="h-8"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA ({settings.issuer.ivaPercent}%)</span>
              <span>{formatMoney(totals.iva, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(totals.total, currency)}</span>
            </div>

            <div className="border-t pt-3">
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" /> Vigencia
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={validUntilStr}
                  onChange={(e) => setValidUntilStr(e.target.value)}
                  onBlur={() => {
                    const iso = validUntilStr
                      ? new Date(validUntilStr + "T23:59:59").toISOString()
                      : null;
                    if (iso !== (quote.validUntil ?? null)) {
                      setValidUntil(quote.id, iso);
                      toast.success(iso ? "Vigencia guardada" : "Vigencia eliminada");
                    }
                  }}
                  className="h-8"
                />
                {quote.validUntil ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setValidUntilStr("");
                      setValidUntil(quote.id, null);
                      toast.success("Vigencia eliminada");
                    }}
                  >
                    Quitar
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="pt-3">
              <Label className="mb-1.5 block">Descripción / Comentarios</Label>
              <Textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                onBlur={() => {
                  if (commentary !== (quote.commentary ?? "")) {
                    updateQuote(quote.id, { commentary });
                    toast.success("Comentarios guardados");
                  }
                }}
                rows={3}
                placeholder="Aparece en el PDF junto al total"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (notes !== quote.notes) {
                    updateQuote(quote.id, { notes });
                    toast.success("Notas guardadas");
                  }
                }}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Expediente y Archivos
          </CardTitle>
          <div>
            <input type="file" id="quote-file" className="hidden" onChange={handleFileUpload} />
            <Button asChild variant="outline" size="sm">
              <label htmlFor="quote-file" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Subir archivo
              </label>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!quote.attachments || quote.attachments.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">No hay archivos adjuntos en esta cotización.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {quote.attachments.map(att => (
                <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <File className="h-6 w-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={att.name}>{att.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(att.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button asChild variant="ghost" size="icon" className="h-6 w-6"><a href={att.dataUrl} download={att.name}><Download className="h-3 w-3" /></a></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateQuote(quote.id, { attachments: quote.attachments!.filter(a => a.id !== att.id) })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de plantillas */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Plantillas de cotización</DialogTitle>
            <DialogDescription>
              Aplica una plantilla guardada o guarda esta cotización como plantilla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setTplOpen(false);
                setSaveTplOpen(true);
              }}
            >
              <Save className="mr-2 h-4 w-4" /> Guardar esta cotización como plantilla
            </Button>
            <div className="max-h-[320px] space-y-2 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Sin plantillas guardadas.
                </p>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.lines.length} líneas · {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          applyTemplate(quote.id, t);
                          setTplOpen(false);
                          toast.success(`Plantilla "${t.name}" aplicada`);
                        }}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Aplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          removeTemplate(t.id);
                          toast.success("Plantilla eliminada");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convertir a {targetCurrency}</DialogTitle>
            <DialogDescription>
              Ajusta todos los precios y la moneda de la cotización usando el tipo de cambio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de cambio ({currentCurrency} a {targetCurrency})</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.0001" min="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="Ej. 20.50" />
                <Button variant="outline" disabled={fetchingRate} onClick={async () => {
                  setFetchingRate(true);
                  try {
                    const res = await fetch("https://open.er-api.com/v6/latest/USD");
                    const data = await res.json();
                    if (data?.rates?.MXN) {
                      const mxnRate = data.rates.MXN;
                      setExchangeRate(targetCurrency === "MXN" ? mxnRate.toFixed(4) : (1 / mxnRate).toFixed(4));
                      toast.success("Tipo de cambio en vivo");
                    }
                  } catch {
                    toast.error("Error al obtener tipo de cambio");
                  } finally {
                    setFetchingRate(false);
                  }
                }}>
                  {fetchingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Auto"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const rate = parseFloat(exchangeRate);
              if (isNaN(rate) || rate <= 0) return toast.error("Tipo de cambio inválido");
              quote.lines.forEach(l => { updateLinePrice(quote.id, l.productId, l.unitPrice * rate); updateLineFields(quote.id, l.productId, { currency: targetCurrency }); });
              setConvertOpen(false);
              toast.success(`Convertida a ${targetCurrency}`);
            }}>Convertir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guardar plantilla */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar como plantilla</DialogTitle>
            <DialogDescription>
              Se guardarán {quote.lines.length} líneas, notas, comentarios y descuento global.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Kit básico de instalación"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vigencia por defecto (días)</Label>
              <Input
                type="number"
                min="0"
                value={tplValidity}
                onChange={(e) => setTplValidity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Al aplicar, calcula la fecha de vigencia desde hoy. Usa 0 para no aplicar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTplOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuoteEditDialog quote={quote} open={editOpen} onOpenChange={setEditOpen} />
      <PurchaseListsDialog
        quote={quote}
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
      />
    </div>
  );
}
