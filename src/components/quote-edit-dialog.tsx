import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import type { Quote, QuoteStatus } from "@/lib/types";

const STATUSES: QuoteStatus[] = [
  "Pendiente",
  "En Proceso",
  "Aceptada",
  "Rechazada",
  "Cerrada",
];

export function QuoteEditDialog({
  quote,
  open,
  onOpenChange,
}: {
  quote: Quote;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const clients = useClients((s) => s.clients);
  const update = useQuotes((s) => s.update);
  const setStatus = useQuotes((s) => s.setStatus);
  const setGlobalDiscount = useQuotes((s) => s.setGlobalDiscount);
  const setValidUntil = useQuotes((s) => s.setValidUntil);

  const [clientId, setClientId] = useState(quote.clientId);
  const [status, setStatusLocal] = useState<QuoteStatus>(quote.status);
  const [validUntilStr, setValidUntilStr] = useState(
    quote.validUntil ? quote.validUntil.slice(0, 10) : "",
  );
  const [globalDisc, setGlobalDisc] = useState(
    String(quote.globalDiscountPercent ?? 0),
  );
  const [commentary, setCommentary] = useState(quote.commentary ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");

  useEffect(() => {
    if (open) {
      setClientId(quote.clientId);
      setStatusLocal(quote.status);
      setValidUntilStr(quote.validUntil ? quote.validUntil.slice(0, 10) : "");
      setGlobalDisc(String(quote.globalDiscountPercent ?? 0));
      setCommentary(quote.commentary ?? "");
      setNotes(quote.notes ?? "");
    }
  }, [open, quote.id]);

  const presets = [7, 15, 30];
  const applyPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setValidUntilStr(d.toISOString().slice(0, 10));
  };

  const save = () => {
    update(quote.id, { clientId, commentary, notes });
    if (status !== quote.status) setStatus(quote.id, status);
    const iso = validUntilStr
      ? new Date(validUntilStr + "T23:59:59").toISOString()
      : null;
    if (iso !== (quote.validUntil ?? null)) setValidUntil(quote.id, iso);
    const gd = parseFloat(globalDisc) || 0;
    if (gd !== (quote.globalDiscountPercent ?? 0))
      setGlobalDiscount(quote.id, gd);
    toast.success("Cotización actualizada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modificar cotización {quote.folio}</DialogTitle>
          <DialogDescription>
            Modifica cliente, estado, vigencia, descuento y notas. Para cambiar
            productos usa el botón "Editar líneas" de la cabecera.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cliente" />
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
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatusLocal(v as QuoteStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descuento global %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={globalDisc}
              onChange={(e) => setGlobalDisc(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Vigencia</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={validUntilStr}
                onChange={(e) => setValidUntilStr(e.target.value)}
                className="w-auto"
              />
              {presets.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(d)}
                >
                  +{d}d
                </Button>
              ))}
              {validUntilStr && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValidUntilStr("")}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descripción / Comentarios</Label>
            <Textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              rows={3}
              placeholder="Aparece en el PDF junto al total"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notas internas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
