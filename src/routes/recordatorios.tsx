import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Check, ArrowLeft, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReminders } from "@/stores/reminders";
import { useClients } from "@/stores/clients";
import { formatDate } from "@/lib/utils";
import { notify } from "@/stores/notifications";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";
import { useSettings } from "@/stores/settings";

export const Route = createFileRoute("/recordatorios")({
  head: () => ({ meta: [{ title: `Recordatorios · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:recordatorios">
      <RecordatoriosPage />
    </PageGuard>
  ),
});

function RecordatoriosPage() {
  const reminders = useReminders((s) => s.reminders);
  const addReminder = useReminders((s) => s.add);
  const toggleReminder = useReminders((s) => s.toggle);
  const removeReminder = useReminders((s) => s.remove);
  const clients = useClients((s) => s.clients);

  const canCreate = useCan("recordatorios:create");
  const canEdit = useCan("recordatorios:edit");
  const canDelete = useCan("recordatorios:delete");

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !date || !note.trim()) {
      toast.error("Completa todos los campos");
      return;
    }
    const iso = new Date(date + "T09:00:00").toISOString();
    addReminder(clientId, iso, note.trim());
    const client = clients.find((c) => c.id === clientId);
    notify("info", `Recordatorio para ${client?.receiver ?? "cliente"}: ${note.trim()}`);
    setNote("");
    setDate("");
    toast.success("Recordatorio creado");
  };

  const addToCalendar = (r: any, clientName: string) => {
    const start = new Date(r.dueDate);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // Agendado por 1 hora
    const title = encodeURIComponent(`Seguimiento: ${clientName}`);
    const details = encodeURIComponent(r.note);
    const formatTime = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${formatTime(start)}/${formatTime(end)}`;
    window.open(url, "_blank");
  };

  const sorted = [...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recordatorios</h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento manual de clientes.
          </p>
        </div>
      </div>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo recordatorio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.receiver} {c.company ? `· ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-4">
                <Label>Nota</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Llamar para confirmar pedido..."
                />
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" /> Agregar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lista{" "}
            <Badge variant="secondary" className="ml-2">
              {reminders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Sin recordatorios. Crea uno arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((r) => {
                    const client = clients.find((c) => c.id === r.clientId);
                    const due = new Date(r.dueDate).getTime();
                    const overdue = !r.done && due < now;
                    const soon = !r.done && !overdue && due - now < 86400000 * 3;
                    return (
                      <TableRow key={r.id} className={r.done ? "opacity-60" : ""}>
                        <TableCell>
                          <Button
                            variant={r.done ? "default" : "outline"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleReminder(r.id)}
                            title={r.done ? "Marcar pendiente" : "Marcar hecho"}
                            disabled={!canEdit}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={r.done ? "line-through" : ""}>
                              {formatDate(r.dueDate)}
                            </span>
                            {overdue && (
                              <Badge variant="destructive" className="mt-1 w-fit">
                                Vencido
                              </Badge>
                            )}
                            {soon && (
                              <Badge className="mt-1 w-fit bg-amber-500 text-white hover:bg-amber-500/90">
                                Próximo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {client?.receiver ?? "—"}
                        </TableCell>
                        <TableCell className={r.done ? "line-through" : ""}>
                          {r.note}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600"
                              onClick={() => addToCalendar(r, client?.receiver ?? "Cliente sin nombre")}
                              title="Añadir a Google Calendar"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeReminder(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
