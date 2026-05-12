import { useState } from "react";
import { useProjects, type Project } from "@/stores/projects";
import { useClients } from "@/stores/clients";
import { useQuotes } from "@/stores/quotes";
import { useSettings } from "@/stores/settings";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Search, Link as LinkIcon, Unlink, DollarSign } from "lucide-react";
import { toast } from "sonner";

export function ProjectQuotesModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = open !== undefined ? onOpenChange! : setInternalOpen;
  const [search, setSearch] = useState("");
  const updateProject = useProjects((s) => s.updateProject);
  const clients = useClients((s) => s.clients);
  const settings = useSettings((s) => s.settings);
  
  // Leemos las cotizaciones existentes en memoria
  const quotes = useQuotes((s: any) => s.quotes || []);
  
  const linkedQuotes = quotes.filter((q: any) => project.quoteIds.includes(q.id));
  const availableQuotes = quotes.filter((q: any) => {
    if (project.quoteIds.includes(q.id)) return false;
    if (!search) return false;
    const term = search.toLowerCase();
    const clientName = clients.find(c => c.id === q.clientId)?.receiver || "";
    return q.folio?.toLowerCase().includes(term) || clientName.toLowerCase().includes(term);
  });

  // Calculador matemático de Subtotal - Descuento + IVA
  const calculateTotal = (quote: any) => {
    const lines = quote.lines || [];
    const subtotal = lines.reduce((acc: number, l: any) => acc + ((l.quantity || 0) * (l.unitPrice || 0)), 0);
    const discountPercent = quote.globalDiscountPercent || 0;
    const taxPercent = settings.issuer.ivaPercent ?? 16;
    
    const discountAmt = subtotal * (discountPercent / 100);
    const subtotalAfterDiscount = subtotal - discountAmt;
    const taxAmt = subtotalAfterDiscount * (taxPercent / 100);
    
    return subtotalAfterDiscount + taxAmt;
  };

  const totalBudget = linkedQuotes.reduce((acc: number, q: any) => acc + calculateTotal(q), 0);

  const linkQuote = (quoteId: string) => {
    updateProject(project.id, { quoteIds: [...project.quoteIds, quoteId] });
    toast.success("Cotización vinculada al proyecto");
    setSearch("");
  };

  const unlinkQuote = (quoteId: string) => {
    updateProject(project.id, { quoteIds: project.quoteIds.filter(id => id !== quoteId) });
    toast.success("Cotización desvinculada");
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b bg-background shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Cotizaciones: {project.name}
          </DialogTitle>
          <DialogDescription>
            Busca y vincula presupuestos para calcular el valor total de este proyecto.
          </DialogDescription>
        </DialogHeader>

        {/* Panel Financiero */}
        <div className="bg-emerald-500/10 border-b p-4 sm:px-6 shrink-0 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-0.5">Presupuesto Aprobado</p>
            <p className="text-3xl font-black text-emerald-800 tracking-tight">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalBudget)}
            </p>
          </div>
          <div className="h-12 w-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
             <DollarSign className="h-6 w-6 text-emerald-700" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Buscador inteligente */}
          <div className="space-y-3">
            <Label>Buscar Cotización a Vincular</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Ej. Folio 0012, Nombre del cliente..." 
                className="pl-8 bg-muted/30"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            {search && availableQuotes.length > 0 && (
              <div className="border rounded-lg bg-background divide-y shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                {availableQuotes.map((q: any) => (
                  <div key={q.id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-semibold text-sm truncate">{q.folio} <span className="font-normal text-muted-foreground ml-1">{clients.find(c => c.id === q.clientId)?.receiver || 'Cliente'}</span></p>
                      <p className="text-xs text-emerald-600 font-medium truncate mt-0.5">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(calculateTotal(q))}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => linkQuote(q.id)} className="shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                      <LinkIcon className="h-3.5 w-3.5 mr-2" /> Vincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {search && availableQuotes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg bg-muted/10 animate-in fade-in">No se encontraron cotizaciones para "{search}"</p>
            )}
          </div>

          {/* Lista de Vinculadas */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">Cotizaciones del Proyecto <Badge variant="secondary" className="rounded-full px-2">{linkedQuotes.length}</Badge></Label>
            {linkedQuotes.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/10">
                <LinkIcon className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No hay cotizaciones vinculadas</p>
                <p className="text-xs mt-1 max-w-[200px]">Usa el buscador de arriba para añadir presupuestos al proyecto.</p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y bg-card overflow-hidden shadow-sm">
                {linkedQuotes.map((q: any) => (
                  <div key={q.id} className="p-3.5 flex items-center justify-between group">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-semibold text-sm truncate flex items-center gap-2">
                        {q.folio}
                        <Badge variant="outline" className="font-mono text-[10px] bg-primary/5">{q.status || 'Activa'}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {clients.find(c => c.id === q.clientId)?.receiver || 'Cliente'} • {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(calculateTotal(q))}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10" onClick={() => unlinkQuote(q.id)}>
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}