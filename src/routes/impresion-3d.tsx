import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useFarm3D, type Printer3D, type PrinterState, type FilamentSpool } from "@/stores/3d-farm";
import { useSettings } from "@/stores/settings";
import { useCadVault } from "@/stores/cad-vault";
import { PageGuard } from "@/components/page-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, Plus, Trash2, Play, Pause, AlertTriangle, PowerOff, Edit, ListChecks, RefreshCw, Cylinder, CheckCircle2, ChevronDown, Filter, LayoutGrid, Box, Thermometer, Droplets, CloudRain, Flame, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { IsometricFarmView } from "@/components/isometric-farm-view";
import { CreatePrinterModal, EditPrinterModal, ChangeFilamentModal, CreateSpoolModal, EditSpoolModal, DryingCalcModal } from "@/components/farm-modals";
import { getSpoolColorHex, generateShortId } from "@/lib/farm-utils";


export const Route = createFileRoute("/impresion-3d")({
  component: () => (
    <PageGuard>
      <PrintersDashboard />
    </PageGuard>
  ),
});

const getDryingInfo = (material: string, humidity: number | null) => {
  const mat = material.toUpperCase();
  const isHygro = ['PETG', 'TPU', 'NYLON', 'PA', 'ABS', 'PC', 'PVA', 'PETG CF', 'TPU HS', 'PA-CF', 'PETG HS'].includes(mat);
  if (!isHygro) return null;
  
  let temp = 50, baseTime = 4;
  if (mat.includes('PETG')) { temp = 65; baseTime = 6; }
  else if (mat.includes('TPU')) { temp = 55; baseTime = 8; }
  else if (mat.includes('NYLON') || mat.includes('PA')) { temp = 90; baseTime = 12; }
  else if (mat.includes('ABS') || mat.includes('PC')) { temp = 80; baseTime = 8; }
  else if (mat.includes('PVA')) { temp = 50; baseTime = 10; }
  
  let extraTime = 0;
  if (humidity && humidity > 50) extraTime = Math.ceil((humidity - 50) / 10); // +1hr extra cada 10% arriba de 50%
  return { temp, time: baseTime + extraTime };
};

function PrintersDashboard() {
  const { printers, orders, spools, activeOperator, updatePrinter, removeSpool, updateOrder, updateSpool } = useFarm3D();
  const settings = useSettings(s => s.settings);
  const cadVaultStore = useCadVault() as any;
  const cadProjects = cadVaultStore.projects || [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Printer3D | null>(null);
  const [changeFilamentOpen, setChangeFilamentOpen] = useState<Printer3D | null>(null);
  const [createSpoolOpen, setCreateSpoolOpen] = useState(false);
  const [editSpoolOpen, setEditSpoolOpen] = useState<FilamentSpool | null>(null);
  const [spoolToDelete, setSpoolToDelete] = useState<FilamentSpool | null>(null);
  const [dryingCalcOpen, setDryingCalcOpen] = useState(false);
  
  const [printerStateFilter, setPrinterStateFilter] = useState<string>("Todas");
  const [printerMaterialFilter, setPrinterMaterialFilter] = useState<string>("Todas");
  const [spoolMaterialFilter, setSpoolMaterialFilter] = useState<string>("Todas");
  const [spoolStatusFilter, setSpoolStatusFilter] = useState<string>("Todas");
  const [viewMode, setViewMode] = useState<"grid" | "iso">("grid");
  const [isoSelected, setIsoSelected] = useState<Printer3D | null>(null);
  
  const activeIsoPrinter = isoSelected ? printers.find(p => p.id === isoSelected.id) : null;

  // Estado del Switch (Busca en el store global, si no lo encuentra usa un estado local seguro)
  const [localWorkWeekMode, setLocalWorkWeekMode] = useState<"working-week" | "full-week">("working-week");
  const workWeekMode = useFarm3D((s: any) => s.workWeekMode) || localWorkWeekMode;
  const setWorkWeekMode = useFarm3D((s: any) => s.setWorkWeekMode) || setLocalWorkWeekMode;

  useEffect(() => {
    const spoolsWithoutId = spools.filter(s => !s.shortId);
    if (spoolsWithoutId.length > 0) {
      spoolsWithoutId.forEach(s => {
        updateSpool(s.id, { shortId: generateShortId() });
      });
    }
  }, [spools, updateSpool]);

  const getStateColor = (state: PrinterState) => {
    switch (state) {
      case "Imprimiendo": return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-sm";
      case "Pausada": return "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm";
      case "Mantenimiento": return "bg-rose-500 hover:bg-rose-600 text-white border-rose-500 shadow-sm";
      default: return "bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-sm";
    }
  };

  const getStateIcon = (state: PrinterState) => {
    switch (state) {
      case "Imprimiendo": return <Play className="h-3 w-3 mr-1.5" />;
      case "Pausada": return <Pause className="h-3 w-3 mr-1.5" />;
      case "Mantenimiento": return <AlertTriangle className="h-3 w-3 mr-1.5" />;
      default: return <PowerOff className="h-3 w-3 mr-1.5" />;
    }
  };

  const cycleState = (p: Printer3D) => {
    const states: PrinterState[] = ["Inactiva", "Imprimiendo", "Pausada", "Mantenimiento"];
    const next = states[(states.indexOf(p.state) + 1) % states.length];
    updatePrinter(p.id, { state: next });
  };

  const handleMarkEmpty = (s: FilamentSpool) => {
    updateSpool(s.id, { weightRemaining: 0 });
    printers.forEach(p => {
      if (p.currentSpoolId === s.id) {
        updatePrinter(p.id, { currentSpoolId: undefined, material: "Ninguno", color: "Ninguno" } as any);
      }
    });
    toast.success(`Bobina ${s.name} marcada como agotada`);
  };

  const handleQuickAddPiece = (p: Printer3D) => {
    const order = orders.find(o => o.id === p.currentOrderId);
    if (!order) return;
    
    const platter = (order as any).piecesPerPlatter || 1;
    // Sumar pieza a la orden
    const newQty = order.printedPieces + platter;
    const log = { id: uuid(), date: new Date().toISOString(), amount: platter, operator: activeOperator };
    const updates: any = { printedPieces: newQty, productionLogs: [...(order.productionLogs || []), log] };
    if (newQty >= order.targetPieces && order.status !== "Completada") {
      updates.status = "Completada";
      toast.success(`¡Meta alcanzada para ${order.name}!`);
    }
    updateOrder(order.id, updates);
    
    // Descontar material de la bobina
    if (p.currentSpoolId && order.weightPerPiece) {
      const spool = spools.find(s => s.id === p.currentSpoolId);
      if (spool) {
        const totalWeightUsed = order.weightPerPiece * platter;
        const newWeight = Math.max(0, spool.weightRemaining - totalWeightUsed);
        updateSpool(spool.id, { weightRemaining: newWeight });
        if (newWeight <= (spool.weightTotal * 0.1)) {
           toast.warning(`¡Atención! La bobina ${spool.name} se está agotando (${newWeight}g restantes)`);
        } else {
           toast.success(`+${platter} Pieza(s) registradas (-${totalWeightUsed}g)`);
        }
      } else {
        toast.success(`+${platter} Pieza(s) registradas (Bobina no encontrada)`);
      }
    } else {
      toast.success(`+${platter} Pieza(s) registradas`);
    }
  };

  const handleQuickAddAccessory = (p: Printer3D) => {
    const order = orders.find(o => o.id === p.currentOrderId);
    if (!order) return;
    
    const hasCad = !!order?.cadProjectId;
    const cadProject = hasCad ? cadProjects.find((cp: any) => cp.id === order.cadProjectId) : null;
    const selectedFile = p.currentFileId ? cadProject?.versions?.find((f: any) => f.id === p.currentFileId) : null;
    
    // Lee el peso directamente del archivo CAD. Si aún no existe, usa el de la orden como fallback.
    const weightToDeduct = selectedFile?.weight || (order as any).weightPerPiece || 0;

    if (p.currentSpoolId && weightToDeduct > 0) {
      const spool = spools.find(s => s.id === p.currentSpoolId);
      if (spool) {
        const newWeight = Math.max(0, spool.weightRemaining - weightToDeduct);
        updateSpool(spool.id, { weightRemaining: newWeight });
        if (newWeight <= (spool.weightTotal * 0.1)) {
           toast.warning(`¡Atención! La bobina ${spool.name} se está agotando (${newWeight}g restantes)`);
        } else {
           toast.success(`Accesorio registrado (-${weightToDeduct}g de la bobina).`);
        }
      }
    } else if (p.currentSpoolId && weightToDeduct === 0) {
       toast.info("Accesorio impreso. (No se descontó material: Peso no definido)");
    } else {
       toast.success("Accesorio registrado (Sin bobina vinculada).");
    }
  };

  const filteredPrinters = printers.filter(p => {
    if (printerStateFilter !== "Todas" && p.state !== printerStateFilter) return false;
    if (printerMaterialFilter === "Con Material" && (!p.material || p.material === "Ninguno")) return false;
    if (printerMaterialFilter === "Sin Material" && p.material && p.material !== "Ninguno") return false;
    return true;
  });

  const filteredSpools = spools.filter(s => {
    if (spoolMaterialFilter !== "Todas" && s.material !== spoolMaterialFilter) return false;
    const pct = (s.weightRemaining / s.weightTotal) * 100;
    if (spoolStatusFilter === "Con material" && s.weightRemaining <= 0) return false;
    if (spoolStatusFilter === "Bajo" && pct > 15) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-orange-500">
            <Printer className="h-6 w-6" /> Granja de Impresoras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra tus máquinas, monitorea su estado y filamentos actuales.
          </p>
          <div className="flex items-center gap-3 mt-4 bg-muted/40 border px-3 py-2 rounded-lg w-fit">
            <Switch 
              id="work-week-mode" 
              checked={workWeekMode === 'working-week'} 
              onCheckedChange={(c) => setWorkWeekMode(c ? 'working-week' : 'full-week')} 
            />
            <Label htmlFor="work-week-mode" className="text-xs cursor-pointer text-muted-foreground font-medium">
              Analíticas en semana laboral (L-V)
            </Label>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={printerStateFilter} onValueChange={setPrinterStateFilter}>
              <SelectTrigger className="h-7 w-[130px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todos los estados</SelectItem>
                <SelectItem value="Imprimiendo">Imprimiendo</SelectItem>
                <SelectItem value="Inactiva">Inactiva (Disponible)</SelectItem>
                <SelectItem value="Pausada">Pausada</SelectItem>
                <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-border mx-1" />
            <Select value={printerMaterialFilter} onValueChange={setPrinterMaterialFilter}>
              <SelectTrigger className="h-7 w-[140px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Cualquier material</SelectItem>
                <SelectItem value="Con Material">Con Material</SelectItem>
                <SelectItem value="Sin Material">Sin Material</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-border mx-1" />
            <div className="flex bg-muted/50 rounded-md p-0.5 shrink-0 h-7">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-6 px-2 shadow-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background" data-state={viewMode === "grid" ? "active" : "inactive"}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === "iso" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("iso")} className="h-6 px-2 shadow-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background" data-state={viewMode === "iso" ? "active" : "inactive"} title="Vista Isométrica de Planta">
                <Box className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Agregar Máquina
          </Button>
        </div>
      </div>

      {printers.length === 0 && printerStateFilter === "Todas" && printerMaterialFilter === "Todas" ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-muted/20">
          <Printer className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Tu granja está vacía</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">No has registrado ninguna impresora 3D todavía. Comienza agregando tus máquinas para monitorear la producción.</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950">
            <Plus className="h-4 w-4 mr-2" /> Agregar mi primera impresora
          </Button>
        </Card>
      ) : filteredPrinters.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-10 text-center border-dashed border-2 bg-muted/20">
          <Printer className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-bold mb-2">Sin coincidencias</h2>
          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">No hay impresoras que coincidan con los filtros aplicados.</p>
          <Button onClick={() => { setPrinterStateFilter("Todas"); setPrinterMaterialFilter("Todas"); }} variant="outline" className="border-orange-500 text-orange-500">
            Limpiar filtros
          </Button>
        </Card>
      ) : viewMode === "iso" ? (
        <IsometricFarmView 
          printers={filteredPrinters} 
          onPrinterClick={(p) => setIsoSelected(p)} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrinters.map((p) => (
            <Card key={p.id} className={`overflow-hidden transition-all hover:shadow-md flex flex-col ${p.state === 'Imprimiendo' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''}`}>
              <CardHeader className="p-4 border-b bg-muted/10 pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <CardTitle className="text-base truncate" title={p.name}>{p.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                     <p className="text-[11px] text-muted-foreground font-mono">{p.model}</p>
                     {p.roomLocation && <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 shadow-none font-normal shrink-0 truncate max-w-[120px] bg-background"><MapPin className="h-2.5 w-2.5 mr-1" />{p.roomLocation}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => setIsoSelected(p)} title="Ajustes de ubicación 3D">
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => setEditOpen(p)} title="Editar impresora">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-1">
                <div className="flex items-center justify-between bg-background border rounded-md p-2 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">Estado</span>
                  <Badge className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 ${getStateColor(p.state)}`} onClick={() => cycleState(p)} title="Click para cambiar estado">
                    {getStateIcon(p.state)}
                    {p.state}
                  </Badge>
                </div>
                
                <div className="flex flex-col gap-1.5 mt-1">
                  <Label className="text-[9px] text-muted-foreground uppercase font-bold">Orden Asignada</Label>
                  <Select 
                    value={p.currentOrderId || "none"} 
                    onValueChange={(val) => {
                      updatePrinter(p.id, { currentOrderId: val === "none" ? undefined : val, currentFileId: undefined });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-muted/20">
                      <SelectValue placeholder="Libre (Sin asignar)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Libre (Sin asignar)</SelectItem>
                      {orders.filter(o => o.status === "Pendiente" || o.status === "En Progreso").map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {p.currentOrderId && (() => {
                   const activeOrder = orders.find(o => o.id === p.currentOrderId);
                   const hasCad = !!activeOrder?.cadProjectId;
                   const cadProject = hasCad ? cadProjects.find((cp: any) => cp.id === activeOrder.cadProjectId) : null;
                   const files = cadProject?.versions || [];
                   return (
                     <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                       <div className="flex flex-col gap-1.5">
                         <Label className="text-[9px] text-muted-foreground uppercase font-bold">Archivo / Modelo</Label>
                         <Select 
                           value={p.currentFileId || "none"} 
                           onValueChange={(val) => updatePrinter(p.id, { currentFileId: val === "none" ? undefined : val } as any)}
                           disabled={!hasCad || files.length === 0}
                         >
                           <SelectTrigger className={`h-8 text-xs ${(!hasCad || files.length === 0) ? 'bg-muted/20 opacity-60' : 'bg-muted/20'}`}>
                             <SelectValue placeholder={!hasCad ? "Orden no vinculada a CAD" : files.length === 0 ? "Sin archivos en la Bóveda" : "Seleccionar archivo..."} />
                           </SelectTrigger>
                           <SelectContent>
                             {files.length > 0 && <SelectItem value="none">Seleccionar archivo...</SelectItem>}
                             {files.map((f: any) => (
                               <SelectItem key={f.id} value={f.id}>{f.fileName} (v{f.version})</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <Label className="text-[9px] text-muted-foreground uppercase font-bold">Cargar Bobina (Para Archivo)</Label>
                         <Select 
                           value={p.currentSpoolId || "none"} 
                           onValueChange={(val) => {
                             if (val === "none") {
                               updatePrinter(p.id, { currentSpoolId: undefined, material: "Ninguno", color: "Ninguno" } as any);
                             } else {
                               const spool = spools.find(s => s.id === val);
                               if (spool) {
                                 updatePrinter(p.id, { currentSpoolId: val, material: spool.material, color: spool.color } as any);
                               }
                             }
                           }}
                         >
                           <SelectTrigger className="h-8 text-xs bg-muted/20">
                             <SelectValue placeholder="Seleccionar bobina..." />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="none">Ninguna / Libre</SelectItem>
                             {(() => {
                               let requiredMaterial = null;
                               
                               if (p.currentFileId && files) {
                                 const selectedFile = files.find((f: any) => f.id === p.currentFileId);
                                 if (selectedFile && selectedFile.material && selectedFile.material !== "Cualquiera") {
                                   requiredMaterial = selectedFile.material;
                                 }
                               }
                               
                               const assignedSpoolIds = new Set(printers.map(pr => pr.currentSpoolId).filter(Boolean));
                               const availableSpools = spools.filter(s => s.weightRemaining > 0);
                               const materials = Array.from(new Set(availableSpools.map(s => s.material))).sort();
                               
                               return materials.map(mat => {
                                 if (requiredMaterial && requiredMaterial !== mat) return null;
                                 const matSpools = availableSpools.filter(s => s.material === mat);
                                 if (matSpools.length === 0) return null;
                                 return (
                                   <SelectGroup key={mat}>
                                     <SelectLabel className="text-xs text-primary">{mat}</SelectLabel>
                                     {matSpools.map(s => {
                                       const isBlocked = assignedSpoolIds.has(s.id) && p.currentSpoolId !== s.id;
                                       return (
                                         <SelectItem key={s.id} value={s.id} disabled={isBlocked}>
                                           {s.name} {s.shortId ? `[${s.shortId}]` : ""} - {s.weightRemaining}g {isBlocked ? "(En uso)" : ""}
                                         </SelectItem>
                                       );
                                     })}
                                   </SelectGroup>
                                 );
                               });
                             })()}
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                   );
                })()}
                <div className="bg-muted/30 p-3 rounded-md border text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Filamento Cargado</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 hover:bg-orange-500/10 hover:text-orange-600" 
                      onClick={() => setChangeFilamentOpen(p)}
                      title="Cambiar filamento"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Material / Código</span>
                      <span className="font-semibold text-xs truncate">{p.material}</span>
                      {p.currentSpoolId && spools.find(s => s.id === p.currentSpoolId)?.shortId && <span className="text-[10px] font-mono text-muted-foreground mt-0.5">[{spools.find(s => s.id === p.currentSpoolId)?.shortId}]</span>}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Color</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.material !== "Ninguno" && (
                          <div className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shadow-sm shrink-0" style={{ background: getSpoolColorHex(p.color) }} />
                        )}
                        <span className="font-semibold text-xs truncate">{p.color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              {p.currentOrderId && (
                (() => {
                  const activeOrder = orders.find(o => o.id === p.currentOrderId);
                  const platter = activeOrder ? ((activeOrder as any).piecesPerPlatter || 1) : 1;
                  
                  const hasCad = !!activeOrder?.cadProjectId;
                  const cadProject = hasCad ? cadProjects.find((cp: any) => cp.id === activeOrder.cadProjectId) : null;
                  const selectedFile = p.currentFileId ? cadProject?.versions?.find((f: any) => f.id === p.currentFileId) : null;
                  const isAccessory = selectedFile && (selectedFile.originalProjectId || selectedFile.description?.toLowerCase().includes("vínculo") || selectedFile.description?.match(/\(Desde (.*?)\)/));

                  if (isAccessory) {
                    return (
                      <div className="p-3 bg-muted/50 border-t mt-auto text-center">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="w-full text-muted-foreground hover:text-foreground shadow-sm"
                          onClick={() => handleQuickAddAccessory(p)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Registrar Accesorio (Descontar)
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-t mt-auto">
                      <Button 
                        size="sm" 
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                        onClick={() => handleQuickAddPiece(p)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Registrar +{platter} {platter > 1 ? "Piezas (Cama)" : "Pieza"}
                      </Button>
                    </div>
                  );
                })()
              )}
            </Card>
          ))}
        </div>
      )}

      {/* SECCIÓN DE BOBINAS */}
      <div className="pt-8 pb-4 border-t mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Cylinder className="h-5 w-5 text-muted-foreground" /> Inventario de Bobinas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Control de material y peso restante.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={spoolMaterialFilter} onValueChange={setSpoolMaterialFilter}>
                <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todos</SelectItem>
                  {Array.from(new Set(spools.map(s => s.material))).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-4 bg-border mx-1" />
              <Select value={spoolStatusFilter} onValueChange={setSpoolStatusFilter}>
                <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Cualquier estado</SelectItem>
                  <SelectItem value="Con material">Con material</SelectItem>
                  <SelectItem value="Bajo">Por agotarse (≤15%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setDryingCalcOpen(true)} variant="outline" className="border-sky-200 text-sky-600 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800 shadow-sm">
                <Droplets className="h-4 w-4 mr-2" /> Secado
              </Button>
              <Button onClick={() => setCreateSpoolOpen(true)} variant="outline" className="border-dashed shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Agregar Bobina
              </Button>
            </div>
          </div>
        </div>
        
        {spools.length === 0 && spoolMaterialFilter === "Todas" && spoolStatusFilter === "Todas" ? (
          <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm">
            No hay bobinas registradas.
          </div>
        ) : filteredSpools.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm flex flex-col items-center">
            <p>No se encontraron bobinas con esos filtros.</p>
            <Button variant="link" onClick={() => { setSpoolMaterialFilter("Todas"); setSpoolStatusFilter("Todas"); }}>Limpiar filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSpools.map(s => {
              const pct = (s.weightRemaining / s.weightTotal) * 100;
              const isLow = pct <= 15;
              const isEmpty = s.weightRemaining <= 0;
              return (
                <div key={s.id} className={`border rounded-lg p-4 bg-card shadow-sm flex flex-col gap-3 relative group hover:z-50 transition-all ${isEmpty ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {!isEmpty && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-600/10" onClick={(e) => { e.stopPropagation(); handleMarkEmpty(s); }} title="Marcar como agotada">
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:bg-amber-600/10" onClick={(e) => { e.stopPropagation(); setEditSpoolOpen(s); }}>
                       <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => { 
                      e.stopPropagation();
                      setSpoolToDelete(s);
                    }}>
                       <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pr-16">
                    <div className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 shadow-sm shrink-0" style={{ background: getSpoolColorHex(s.color) }} />
                    <span className={`font-semibold text-sm truncate ${isEmpty ? 'line-through text-muted-foreground' : ''}`}>{s.name}</span>
                    {s.shortId && <Badge variant="secondary" className="font-mono text-[10px] ml-auto shrink-0">{s.shortId}</Badge>}
                    {isEmpty && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 shadow-none shrink-0">Agotada</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono">{s.material}</span>
                      {(() => {
                        const drying = getDryingInfo(s.material, (settings as any).weather?.humidity);
                        if (!drying) return null;
                        return (
                          <div className="relative group/tooltip flex items-center">
                            <Droplets className="h-3.5 w-3.5 text-blue-500 animate-pulse cursor-help" />
                            <div className="absolute bottom-full left-0 mb-2 w-52 p-3 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                              <p className="font-bold text-blue-500 flex items-center gap-1.5 mb-1.5"><Droplets className="h-3.5 w-3.5"/> Secado Recomendado</p>
                              <div className="grid grid-cols-2 gap-1 text-[11px]">
                                <span className="text-muted-foreground">Humedad Local:</span>
                                <span className="font-medium text-right text-blue-400">{(settings as any).weather?.humidity ?? '--'}%</span>
                                <span className="text-muted-foreground">Temp. Óptima:</span>
                                <span className="font-medium text-right">{drying.temp}°C</span>
                                <span className="text-muted-foreground">Tiempo Est.:</span>
                                <span className="font-medium text-right">{drying.time} hrs</span>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <span>{s.color}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded border border-dashed flex justify-between">
                    <span>Tara: {s.emptySpoolWeight || 200}g</span>
                    <span className="font-medium text-foreground">Báscula: {s.weightRemaining + (s.emptySpoolWeight || 200)}g</span>
                  </div>
                  <div className="mt-auto space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isLow ? "text-rose-500" : "text-muted-foreground"}>{s.weightRemaining}g restantes</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${isLow ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALES EXTERNOS AUTOCONTENIDOS */}
      <CreatePrinterModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditPrinterModal printer={editOpen} open={!!editOpen} onOpenChange={(o) => !o && setEditOpen(null)} />
      <ChangeFilamentModal printer={changeFilamentOpen} open={!!changeFilamentOpen} onOpenChange={(o) => !o && setChangeFilamentOpen(null)} />
      <CreateSpoolModal open={createSpoolOpen} onOpenChange={setCreateSpoolOpen} />
      <EditSpoolModal spool={editSpoolOpen} open={!!editSpoolOpen} onOpenChange={(o) => !o && setEditSpoolOpen(null)} />
      <DryingCalcModal open={dryingCalcOpen} onOpenChange={setDryingCalcOpen} />

      {/* MODAL DE IMPRESORA EN VISTA ISOMÉTRICA */}
      <Dialog open={!!isoSelected} onOpenChange={(o) => !o && setIsoSelected(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-orange-500" /> {activeIsoPrinter?.name}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{activeIsoPrinter?.model}</DialogDescription>
          </DialogHeader>
          {activeIsoPrinter && (
            <div className="space-y-4 py-2">
                <div className="flex items-center justify-between bg-background border rounded-md p-2 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">Estado</span>
                  <Badge className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 ${getStateColor(activeIsoPrinter.state)}`} onClick={() => cycleState(activeIsoPrinter)} title="Click para cambiar estado">
                    {getStateIcon(activeIsoPrinter.state)}
                    {activeIsoPrinter.state}
                  </Badge>
                </div>
                
                <div className="flex flex-col gap-1.5 mt-1">
                  <Label className="text-[9px] text-muted-foreground uppercase font-bold">Orden Asignada</Label>
                  <Select 
                    value={activeIsoPrinter.currentOrderId || "none"} 
                    onValueChange={(val) => {
                      updatePrinter(activeIsoPrinter.id, { currentOrderId: val === "none" ? undefined : val, currentFileId: undefined } as any);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-muted/20">
                      <SelectValue placeholder="Libre (Sin asignar)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Libre (Sin asignar)</SelectItem>
                      {orders.filter(o => o.status === "Pendiente" || o.status === "En Progreso").map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeIsoPrinter.currentOrderId && (() => {
                   const activeOrder = orders.find(o => o.id === activeIsoPrinter.currentOrderId);
                   const hasCad = !!activeOrder?.cadProjectId;
                   const cadProject = hasCad ? cadProjects.find((cp: any) => cp.id === activeOrder.cadProjectId) : null;
                   const files = cadProject?.versions || [];
                   return (
                     <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                       <div className="flex flex-col gap-1.5">
                         <Label className="text-[9px] text-muted-foreground uppercase font-bold">Archivo / Modelo</Label>
                         <Select 
                           value={activeIsoPrinter.currentFileId || "none"} 
                           onValueChange={(val) => updatePrinter(activeIsoPrinter.id, { currentFileId: val === "none" ? undefined : val } as any)}
                           disabled={!hasCad || files.length === 0}
                         >
                           <SelectTrigger className={`h-8 text-xs ${(!hasCad || files.length === 0) ? 'bg-muted/20 opacity-60' : 'bg-muted/20'}`}>
                             <SelectValue placeholder={!hasCad ? "Orden no vinculada a CAD" : files.length === 0 ? "Sin archivos en la Bóveda" : "Seleccionar archivo..."} />
                           </SelectTrigger>
                           <SelectContent>
                             {files.length > 0 && <SelectItem value="none">Seleccionar archivo...</SelectItem>}
                             {files.map((f: any) => (
                               <SelectItem key={f.id} value={f.id}>{f.fileName} (v{f.version})</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <Label className="text-[9px] text-muted-foreground uppercase font-bold">Cargar Bobina (Para Archivo)</Label>
                         <Select 
                           value={activeIsoPrinter.currentSpoolId || "none"} 
                           onValueChange={(val) => {
                             if (val === "none") {
                               updatePrinter(activeIsoPrinter.id, { currentSpoolId: undefined, material: "Ninguno", color: "Ninguno" } as any);
                             } else {
                               const spool = spools.find(s => s.id === val);
                               if (spool) {
                                 updatePrinter(activeIsoPrinter.id, { currentSpoolId: val, material: spool.material, color: spool.color } as any);
                               }
                             }
                           }}
                         >
                           <SelectTrigger className="h-8 text-xs bg-muted/20">
                             <SelectValue placeholder="Seleccionar bobina..." />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="none">Ninguna / Libre</SelectItem>
                             {(() => {
                               let requiredMaterial = null;
                               
                               if (activeIsoPrinter.currentFileId && files) {
                                 const selectedFile = files.find((f: any) => f.id === activeIsoPrinter.currentFileId);
                                 if (selectedFile && selectedFile.material && selectedFile.material !== "Cualquiera") {
                                   requiredMaterial = selectedFile.material;
                                 }
                               }
                               
                               const assignedSpoolIds = new Set(printers.map(pr => pr.currentSpoolId).filter(Boolean));
                               const availableSpools = spools.filter(s => s.weightRemaining > 0);
                               const materials = Array.from(new Set(availableSpools.map(s => s.material))).sort();
                               
                               return materials.map(mat => {
                                 if (requiredMaterial && requiredMaterial !== mat) return null;
                                 const matSpools = availableSpools.filter(s => s.material === mat);
                                 if (matSpools.length === 0) return null;
                                 return (
                                   <SelectGroup key={mat}>
                                     <SelectLabel className="text-xs text-primary">{mat}</SelectLabel>
                                     {matSpools.map(s => {
                                       const isBlocked = assignedSpoolIds.has(s.id) && activeIsoPrinter.currentSpoolId !== s.id;
                                       return (
                                         <SelectItem key={s.id} value={s.id} disabled={isBlocked}>
                                           {s.name} {s.shortId ? `[${s.shortId}]` : ""} - {s.weightRemaining}g {isBlocked ? "(En uso)" : ""}
                                         </SelectItem>
                                       );
                                     })}
                                   </SelectGroup>
                                 );
                               });
                             })()}
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                   );
                })()}
                <div className="bg-muted/30 p-3 rounded-md border text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Filamento Cargado</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 hover:bg-orange-500/10 hover:text-orange-600" 
                      onClick={() => { setIsoSelected(null); setChangeFilamentOpen(activeIsoPrinter); }}
                      title="Cambiar filamento"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Material / Código</span>
                      <span className="font-semibold text-xs truncate">{activeIsoPrinter.material}</span>
                      {activeIsoPrinter.currentSpoolId && spools.find(s => s.id === activeIsoPrinter.currentSpoolId)?.shortId && <span className="text-[10px] font-mono text-muted-foreground mt-0.5">[{spools.find(s => s.id === activeIsoPrinter.currentSpoolId)?.shortId}]</span>}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Color</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {activeIsoPrinter.material !== "Ninguno" && (
                          <div className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shadow-sm shrink-0" style={{ background: getSpoolColorHex(activeIsoPrinter.color) }} />
                        )}
                        <span className="font-semibold text-xs truncate">{activeIsoPrinter.color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {activeIsoPrinter.currentOrderId && (
                  (() => {
                    const activeOrder = orders.find(o => o.id === activeIsoPrinter.currentOrderId);
                    const platter = activeOrder ? ((activeOrder as any).piecesPerPlatter || 1) : 1;
                    
                    const hasCad = !!activeOrder?.cadProjectId;
                    const cadProject = hasCad ? cadProjects.find((cp: any) => cp.id === activeOrder.cadProjectId) : null;
                    const selectedFile = activeIsoPrinter.currentFileId ? cadProject?.versions?.find((f: any) => f.id === activeIsoPrinter.currentFileId) : null;
                    const isAccessory = selectedFile && (selectedFile.originalProjectId || selectedFile.description?.toLowerCase().includes("vínculo") || selectedFile.description?.match(/\(Desde (.*?)\)/));

                    if (isAccessory) {
                      return (
                        <div className="pt-2 mt-2 border-t">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="w-full text-xs text-muted-foreground hover:text-foreground shadow-sm"
                            onClick={() => { handleQuickAddAccessory(activeIsoPrinter); setIsoSelected(null); }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-2" />
                            Registrar Accesorio (-Mat)
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div className="pt-2">
                        <Button 
                          size="sm" 
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                          onClick={() => { handleQuickAddPiece(activeIsoPrinter); setIsoSelected(null); }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Registrar +{platter} {platter > 1 ? "Piezas (Cama)" : "Pieza"}
                        </Button>
                      </div>
                    );
                  })()
                )}

                <div className="pt-2 border-t mt-2 grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold truncate">Nivel Z</Label>
                    <Select value={String(activeIsoPrinter.posZ || 0)} onValueChange={(v) => updatePrinter(activeIsoPrinter.id, { posZ: Number(v) })}>
                      <SelectTrigger className="h-8 text-xs bg-muted/20 px-1.5"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Piso (Nivel 0)</SelectItem>
                        <SelectItem value="110">Estante 1 (Nivel 1)</SelectItem>
                        <SelectItem value="220">Estante 2 (Nivel 2)</SelectItem>
                        <SelectItem value="330">Estante 3 (Nivel 3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold truncate">Tamaño</Label>
                    <Select value={activeIsoPrinter.isTall || activeIsoPrinter.model?.toLowerCase().includes("plus") ? "tall" : "normal"} onValueChange={(v) => updatePrinter(activeIsoPrinter.id, { isTall: v === "tall" })}>
                      <SelectTrigger className="h-8 text-xs bg-muted/20 px-1.5"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal (Ej. Pro3)</SelectItem>
                        <SelectItem value="tall">Doble Alto (Ej. Plus)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold truncate">Rotación</Label>
                    <Select value={String(activeIsoPrinter.rotation || 0)} onValueChange={(v) => updatePrinter(activeIsoPrinter.id, { rotation: Number(v) })}>
                      <SelectTrigger className="h-8 text-xs bg-muted/20 px-1.5"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0° (Y)</SelectItem>
                        <SelectItem value="90">90° (X)</SelectItem>
                        <SelectItem value="180">180° (-Y)</SelectItem>
                        <SelectItem value="270">270° (-X)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-3 mt-1">
                    <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold truncate">Ubicación física</Label>
                    <Input 
                      placeholder="Ej. Estante A, Repisa 2..."
                      value={activeIsoPrinter.roomLocation || ""} 
                      onChange={(e) => updatePrinter(activeIsoPrinter.id, { roomLocation: e.target.value })}
                      className="h-8 text-xs bg-muted/20"
                    />
                  </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ELIMINAR BOBINA (Alert Autocontenido) */}
      <AlertDialog open={!!spoolToDelete} onOpenChange={(o) => !o && setSpoolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Bobina</AlertDialogTitle>
            <AlertDialogDescription>¿Seguro que deseas eliminar la bobina {spoolToDelete?.name}? Se perderá de tu inventario físico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if(spoolToDelete) { removeSpool(spoolToDelete.id); toast.success("Bobina eliminada"); setSpoolToDelete(null); } }}>
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}