import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, ExternalLink, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/data-table";
import { QuotePreviewSheet } from "@/components/quote-preview-sheet";
import { useClients } from "@/stores/clients";
import { useQuotes } from "@/stores/quotes";
import { useSettings } from "@/stores/settings";
import { useReminders } from "@/stores/reminders";
import { formatDate, formatMoney } from "@/lib/utils";
import { generateQrDataUrl, quoteVerifyUrl } from "@/lib/qr";
import { notify } from "@/stores/notifications";
import type { Client, Quote } from "@/lib/types";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes · MIDAS ERP" }] }),
  component: () => (
    <PageGuard permission="page:clientes">
      <ClientsPage />
    </PageGuard>
  ),
});

function ClientForm({
  initial,
  onSubmit,
  label,
}: {
  initial?: Partial<Client>;
  onSubmit: (data: Omit<Client, "id" | "createdAt">) => void;
  label: string;
}) {
  const [receiver, setReceiver] = useState(initial?.receiver ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!receiver.trim()) return;
        onSubmit({
          receiver: receiver.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5">
        <Label>
          Receptor <span className="text-destructive">*</span>
        </Label>
        <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Empresa</Label>
        <Input value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Correo</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Teléfono</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label>Dirección</Label>
        <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit">{label}</Button>
      </div>
    </form>
  );
}

function ClientsPage() {
  const clients = useClients((s) => s.clients);
  const addClient = useClients((s) => s.add);
  const updateClient = useClients((s) => s.update);
  const removeClient = useClients((s) => s.remove);
  const removeManyClients = useClients((s) => s.removeMany);
  const quotes = useQuotes((s) => s.quotes);
  const settings = useSettings((s) => s.settings);

  const reminders = useReminders((s) => s.reminders);
  const addReminder = useReminders((s) => s.add);
  const toggleReminder = useReminders((s) => s.toggle);
  const removeReminder = useReminders((s) => s.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [previewQ, setPreviewQ] = useState<Quote | null>(null);
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderNote, setReminderNote] = useState("");

  const canCreate = useCan("clientes:create");
  const canEdit = useCan("clientes:edit");
  const canDelete = useCan("clientes:delete");
  const canRemCreate = useCan("recordatorios:create");
  const canRemEdit = useCan("recordatorios:edit");
  const canRemDelete = useCan("recordatorios:delete");

  const linkedQuotes = (id: string) => quotes.filter((q) => q.clientId === id);
  const linkedQuotesCount = (id: string) => linkedQuotes(id).length;

  const clientStats = (id: string) => {
    const qs = linkedQuotes(id);
    const iva = settings.issuer.ivaPercent / 100;
    const totals = qs.map(
      (q) => q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) * (1 + iva),
    );
    const accepted = qs.filter((q) => q.status === "Aceptada" || q.status === "Cerrada");
    const acceptedTotal = accepted
      .map((q) => q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) * (1 + iva))
      .reduce((a, b) => a + b, 0);
    const sum = totals.reduce((a, b) => a + b, 0);
    const productMap: Record<string, { name: string; qty: number }> = {};
    for (const q of qs) {
      for (const l of q.lines) {
        const k = l.productId;
        if (!productMap[k]) productMap[k] = { name: l.name, qty: 0 };
        productMap[k].qty += l.quantity;
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
    const lastQuote = qs
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      total: qs.length,
      sum,
      avg: qs.length ? sum / qs.length : 0,
      accepted: accepted.length,
      acceptedTotal,
      closeRate: qs.length ? (accepted.length / qs.length) * 100 : 0,
      currency: qs[0]?.lines[0]?.currency ?? "MXN",
      topProducts,
      lastDate: lastQuote?.createdAt,
    };
  };

  useEffect(() => {
    if (!previewQ) {
      setQrUrl(undefined);
      return;
    }
    let cancelled = false;
    generateQrDataUrl(quoteVerifyUrl(previewQ.id)).then((u) => {
      if (!cancelled) setQrUrl(u);
    });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Directorio de clientes (receptores).</p>
      </div>

      <DataTable
        rows={clients}
        rowKey={(c) => c.id}
        searchPlaceholder="Buscar por receptor o empresa..."
        searchAccessor={(c) => `${c.receiver} ${c.company} ${c.email}`}
        toolbar={
          <div className="flex gap-2">
            {canDelete && selected.size > 0 && (
              <Button variant="destructive" onClick={() => setBulkOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selected.size})
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
              </Button>
            )}
          </div>
        }
        emptyState={<span className="text-sm text-muted-foreground">Sin clientes aún.</span>}
        columns={[
          {
            key: "select",
            header: "",
            className: "w-8",
            cell: (c) => (
              <Checkbox
                checked={selected.has(c.id)}
                onCheckedChange={() => toggle(c.id)}
                aria-label="Seleccionar"
              />
            ),
          },
          {
            key: "receiver",
            header: "Receptor",
            sortable: true,
            accessor: (c) => c.receiver,
            cell: (c) => <span className="font-medium">{c.receiver}</span>,
          },
          {
            key: "company",
            header: "Empresa",
            sortable: true,
            accessor: (c) => c.company,
            cell: (c) => c.company || <span className="text-muted-foreground">—</span>,
          },
          {
            key: "email",
            header: "Correo",
            sortable: true,
            accessor: (c) => c.email,
            cell: (c) => c.email || <span className="text-muted-foreground">—</span>,
          },
          {
            key: "phone",
            header: "Teléfono",
            cell: (c) => c.phone || <span className="text-muted-foreground">—</span>,
          },
          {
            key: "quotes",
            header: "Cotizaciones",
            sortable: true,
            accessor: (c) => linkedQuotesCount(c.id),
            cell: (c) => <Badge variant="secondary">{linkedQuotesCount(c.id)}</Badge>,
          },
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (c) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewClient(c)}
                  title="Ver"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditClient(c)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteClient(c)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Ver cliente */}
      <Dialog open={!!viewClient} onOpenChange={(o) => !o && setViewClient(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewClient?.receiver}</DialogTitle>
            <DialogDescription>{viewClient?.company || "—"}</DialogDescription>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Correo</dt>
                  <dd>{viewClient.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Teléfono</dt>
                  <dd>{viewClient.phone || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase text-muted-foreground">Dirección</dt>
                  <dd className="flex items-start gap-2">
                    <span className="flex-1">{viewClient.address || "—"}</span>
                    {viewClient.address && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewClient.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin className="mr-1 h-4 w-4" /> Maps
                        </a>
                      </Button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Cliente desde</dt>
                  <dd>{formatDate(viewClient.createdAt)}</dd>
                </div>
              </dl>

              {(() => {
                const stats = clientStats(viewClient.id);
                if (stats.total === 0) return null;
                return (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Ficha 360°</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Total histórico</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatMoney(stats.sum, stats.currency)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Aceptadas</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatMoney(stats.acceptedTotal, stats.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {stats.accepted} de {stats.total}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Ticket promedio</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatMoney(stats.avg, stats.currency)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Tasa de cierre</p>
                        <p className="mt-1 text-lg font-bold">
                          {stats.closeRate.toFixed(0)}%
                        </p>
                        {stats.lastDate && (
                          <p className="text-[11px] text-muted-foreground">
                            Última: {formatDate(stats.lastDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    {stats.topProducts.length > 0 && (
                      <div className="rounded-lg border bg-card p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                          Productos más cotizados
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {stats.topProducts.map((p) => (
                            <Badge key={p.name} variant="secondary">
                              {p.name} · {p.qty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Cotizaciones ({linkedQuotesCount(viewClient.id)})
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/cotizaciones">
                      <ExternalLink className="mr-2 h-4 w-4" /> Ir a cotizaciones
                    </Link>
                  </Button>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedQuotes(viewClient.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                            Sin cotizaciones para este cliente.
                          </TableCell>
                        </TableRow>
                      ) : (
                        linkedQuotes(viewClient.id).map((q) => {
                          const sub = q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
                          const total = sub * (1 + settings.issuer.ivaPercent / 100);
                          return (
                            <TableRow
                              key={q.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setPreviewQ(q)}
                            >
                              <TableCell className="font-mono">{q.folio}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{q.status}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(q.createdAt)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatMoney(total, q.lines[0]?.currency ?? "MXN")}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Recordatorios */}
              <div>
                <p className="mb-2 text-sm font-semibold">Recordatorios</p>
                <div className="space-y-2 rounded-lg border p-3">
                  {(() => {
                    const list = reminders
                      .filter((r) => r.clientId === viewClient.id)
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                    if (list.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground">
                          Sin recordatorios para este cliente.
                        </p>
                      );
                    }
                    return list.map((r) => {
                      const overdue = !r.done && new Date(r.dueDate).getTime() < Date.now();
                      return (
                        <div
                          key={r.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Checkbox
                            checked={r.done}
                            onCheckedChange={() => canRemEdit && toggleReminder(r.id)}
                            disabled={!canRemEdit}
                          />
                          <div className={`flex-1 ${r.done ? "line-through opacity-60" : ""}`}>
                            <p>{r.note}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(r.dueDate)}
                              {overdue && (
                                <Badge variant="destructive" className="ml-2">
                                  Vencido
                                </Badge>
                              )}
                            </p>
                          </div>
                          {canRemDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeReminder(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {canRemCreate && (
                    <div className="grid gap-2 border-t pt-3 sm:grid-cols-[auto_1fr_auto]">
                      <Input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className="h-8 w-auto"
                      />
                      <Input
                        placeholder="Nota (ej. Llamar para confirmar)"
                        value={reminderNote}
                        onChange={(e) => setReminderNote(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!reminderDate || !reminderNote.trim()) {
                            toast.error("Fecha y nota requeridas");
                            return;
                          }
                          const iso = new Date(reminderDate + "T09:00:00").toISOString();
                          addReminder(viewClient.id, iso, reminderNote.trim());
                          notify(
                            "info",
                            `Recordatorio para ${viewClient.receiver}: ${reminderNote.trim()}`,
                          );
                          setReminderDate("");
                          setReminderNote("");
                          toast.success("Recordatorio creado");
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
                    </Button>
                  </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview cotización (desde clientes) */}
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
                <QuotePreviewSheet
                  quote={previewQ}
                  client={clients.find((c) => c.id === previewQ.clientId) ?? null}
                  settings={settings}
                  qrDataUrl={qrUrl}
                />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>Datos del receptor para cotizaciones.</DialogDescription>
          </DialogHeader>
          <ClientForm
            label="Crear cliente"
            onSubmit={(data) => {
              addClient(data);
              setCreateOpen(false);
              toast.success("Cliente creado");
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editClient && (
            <ClientForm
              initial={editClient}
              label="Guardar cambios"
              onSubmit={(data) => {
                updateClient(editClient.id, data);
                setEditClient(null);
                toast.success("Cliente actualizado");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteClient} onOpenChange={(o) => !o && setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteClient && linkedQuotesCount(deleteClient.id) > 0
                ? `Este cliente tiene ${linkedQuotesCount(deleteClient.id)} cotización(es) vinculada(s). Elimina o reasigna esas cotizaciones primero.`
                : `Se eliminará "${deleteClient?.receiver}". Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deleteClient && linkedQuotesCount(deleteClient.id) > 0}
              onClick={() => {
                if (deleteClient && linkedQuotesCount(deleteClient.id) === 0) {
                  removeClient(deleteClient.id);
                  toast.success("Cliente eliminado");
                  setDeleteClient(null);
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
            <AlertDialogTitle>Eliminar {selected.size} cliente(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se eliminarán los que no tengan cotizaciones vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const safe = [...selected].filter((id) => linkedQuotesCount(id) === 0);
                const skipped = selected.size - safe.length;
                removeManyClients(safe);
                setSelected(new Set());
                setBulkOpen(false);
                toast.success(
                  `${safe.length} eliminado(s)${skipped > 0 ? `, ${skipped} omitido(s)` : ""}`
                );
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
