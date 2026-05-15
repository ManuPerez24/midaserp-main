import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, CloudRain, Droplets, Flame, Loader2, Thermometer, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useFarm3D, type Printer3D, type FilamentSpool } from "@/stores/3d-farm";
import { MATERIAL_CATEGORIES, generateShortId } from "@/lib/farm-utils";

export function CreatePrinterModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { addPrinter } = useFarm3D();
  const [name, setName] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setModel("");
    }
  }, [open]);

  const handleCreate = () => {
    if (!name || !model) return toast.error("Nombre y modelo son requeridos");
    addPrinter({
      id: uuid(),
      name,
      model,
      material: "Ninguno",
      color: "N/A",
      state: "Inactiva",
      createdAt: new Date().toISOString(),
    });
    toast.success("Impresora agregada a la granja");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Registrar Impresora</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Nombre identificador</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Máquina 01" /></div>
          <div className="space-y-2"><Label>Modelo</Label><Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ej. Bambu Lab P1S" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleCreate} className="bg-orange-500 hover:bg-orange-600 text-white">Registrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditPrinterModal({ printer, open, onOpenChange }: { printer: Printer3D | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { updatePrinter, removePrinter } = useFarm3D();
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (open && printer) {
      setName(printer.name);
      setModel(printer.model || "");
    }
  }, [open, printer]);

  const handleEdit = () => {
    if (!name || !model) return toast.error("Nombre y modelo son requeridos");
    setConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Editar Impresora</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nombre identificador</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input value={model} onChange={e => setModel(e.target.value)} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleEdit} className="bg-orange-500 hover:bg-orange-600 text-white">Guardar Cambios</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Guardar Cambios</AlertDialogTitle>
            <AlertDialogDescription>¿Confirmas la modificación de la impresora {printer?.name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (printer) {
                updatePrinter(printer.id, { name, model });
                toast.success("Datos de impresora actualizados");
                onOpenChange(false);
              }
              setConfirmOpen(false);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Impresora</AlertDialogTitle>
            <AlertDialogDescription>¿Estás completamente seguro de eliminar la máquina {printer?.name} de la granja?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (printer) {
                removePrinter(printer.id);
                toast.success("Impresora eliminada");
                onOpenChange(false);
              }
              setConfirmDeleteOpen(false);
            }}>Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ChangeFilamentModal({ printer, open, onOpenChange }: { printer: Printer3D | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { spools, orders, printers, updatePrinter } = useFarm3D();
  const [spoolSearchCode, setSpoolSearchCode] = useState("");
  const [newSpoolId, setNewSpoolId] = useState("none");
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const activeOrder = printer?.currentOrderId ? orders.find(o => o.id === printer.currentOrderId) : null;
  const requiredMaterial = activeOrder?.material && activeOrder.material !== "Cualquiera" ? activeOrder.material : null;

  useEffect(() => {
    if (open) {
      setSpoolSearchCode("");
      setNewSpoolId(printer?.currentSpoolId || "none");
    }
  }, [open, printer]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar Filamento</DialogTitle>
            <DialogDescription>Actualiza el material y color cargado en la impresora {printer?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-dashed">
              <Label className="text-xs text-muted-foreground">Escanear / Ingresar Código (Opcional)</Label>
              <Input placeholder="Ej. A1B2C" maxLength={5} className="uppercase font-mono text-sm h-8 bg-background" value={spoolSearchCode} onChange={e => {
                const code = e.target.value.toUpperCase();
                setSpoolSearchCode(code);
                if (code.length === 5) {
                  const found = spools.find(s => s.shortId === code);
                  if (found) {
                     const inOtherPrinter = printers.find(p => p.id !== printer?.id && p.currentSpoolId === found.id);
                     const isMaterialIncompatible = requiredMaterial && found.material !== requiredMaterial;
                     if (inOtherPrinter) toast.error(`Bobina en uso por ${inOtherPrinter.name}`);
                     else if (isMaterialIncompatible) toast.error(`Incompatible: Se requiere ${requiredMaterial}`);
                     else { setNewSpoolId(found.id); toast.success("Bobina encontrada"); }
                  } else toast.error("Código de bobina no encontrado");
                }
              }} />
            </div>
            <div className="space-y-2">
              <Label>Seleccionar Bobina de Inventario</Label>
              <Select value={newSpoolId} onValueChange={setNewSpoolId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ninguno">Ninguno / Vacío</SelectItem>
                  {spools.filter(s => s.weightRemaining > 0).map(s => {
                    const inOtherPrinter = printers.find(p => p.id !== printer?.id && p.currentSpoolId === s.id);
                    const isMaterialIncompatible = requiredMaterial && s.material !== requiredMaterial;
                    const disabled = !!inOtherPrinter || !!isMaterialIncompatible;
                    return (
                      <SelectItem key={s.id} value={s.id} disabled={disabled}>{s.shortId ? `[${s.shortId}] ` : ""}{s.name} ({s.weightRemaining}g){inOtherPrinter ? ` (En ${inOtherPrinter.name})` : ""}{isMaterialIncompatible ? ` (Req. ${requiredMaterial})` : ""}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => setConfirmOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
              Cargar Filamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambio de Filamento</AlertDialogTitle>
            <AlertDialogDescription>Al confirmar, la máquina se registrará con la nueva bobina y comenzará a descontar gramos de ella.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              let mat = "Ninguno", col = "N/A", spoolId = undefined;
              if (newSpoolId !== "Ninguno") { const s = spools.find(x => x.id === newSpoolId); if (s) { mat = s.material; col = s.color; spoolId = s.id; } }
              
              if (printer?.currentOrderId) {
                const activeOrder = orders.find(o => o.id === printer.currentOrderId);
                if (activeOrder && activeOrder.material && activeOrder.material !== "Cualquiera" && mat !== "Ninguno" && mat !== activeOrder.material) {
                  toast.error(`Incompatible: La orden asignada (${activeOrder.name}) exige material ${activeOrder.material}.`);
                  setConfirmOpen(false);
                  return;
                }
              }

              if (printer) updatePrinter(printer.id, { material: mat, color: col, currentSpoolId: spoolId });
              toast.success("Filamento actualizado");
              onOpenChange(false);
              setConfirmOpen(false);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CreateSpoolModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { addSpool, addRecentSpoolPreset, recentSpoolPresets } = useFarm3D();
  const [spoolName, setSpoolName] = useState("");
  const [spoolMaterial, setSpoolMaterial] = useState("PLA");
  const [spoolColor, setSpoolColor] = useState("");
  const [spoolWeight, setSpoolWeight] = useState("1000");
  const [spoolEmptyWeight, setSpoolEmptyWeight] = useState("200");
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [matPopoverOpen, setMatPopoverOpen] = useState(false);

  const handleCreateSpool = () => {
    if (!spoolName || !spoolColor || !spoolWeight) return toast.error("Completa todos los campos");
    const code = generateShortId();
    addSpool({
      id: uuid(),
      shortId: code,
      name: spoolName,
      material: spoolMaterial,
      color: spoolColor,
      weightTotal: Number(spoolWeight),
      weightRemaining: Number(spoolWeight),
      emptySpoolWeight: Number(spoolEmptyWeight),
      createdAt: new Date().toISOString(),
    });
    addRecentSpoolPreset({
      label: `${spoolName} ${spoolMaterial} ${spoolColor}`.trim(),
      brand: spoolName,
      material: spoolMaterial,
      color: spoolColor,
      weight: spoolWeight,
      emptyWeight: spoolEmptyWeight
    });
    toast.success("Bobina agregada al inventario");
    onOpenChange(false);
    setSpoolName(""); setSpoolColor(""); setSpoolWeight("1000"); setSpoolEmptyWeight("200");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Registrar Bobina (Filamento)</DialogTitle>
          <DialogDescription>Llena los datos manualmente o usa una carga rápida.</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Carga Rápida (Presets Comerciales)</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "eSun PLA+ Negro", brand: "eSun PLA+ Negro 01", mat: "PLA+", col: "Negro", w: "1000", empty: "200" },
              { label: "eSun PLA+ Blanco", brand: "eSun PLA+ Blanco 01", mat: "PLA+", col: "Blanco", w: "1000", empty: "200" },
              { label: "Bambu PLA Matte Gris", brand: "Bambu PLA Matte Gris 01", mat: "PLA Matte", col: "Gris", w: "1000", empty: "250" },
              { label: "Sunlu PETG Negro", brand: "Sunlu PETG Negro 01", mat: "PETG", col: "Negro", w: "1000", empty: "150" },
              { label: "Overture TPU Negro", brand: "Overture TPU Negro 01", mat: "TPU", col: "Negro", w: "1000", empty: "200" },
              { label: "Creality ABS+ Rojo", brand: "Creality ABS+ Rojo 01", mat: "ABS+", col: "Rojo", w: "1000", empty: "200" },
            ].map(p => (
              <Badge 
                key={p.label} 
                variant="secondary" 
                className="cursor-pointer hover:bg-orange-500 hover:text-white transition-colors text-[10px]"
                onClick={() => { setSpoolName(p.brand); setSpoolMaterial(p.mat); setSpoolColor(p.col); setSpoolWeight(p.w); setSpoolEmptyWeight(p.empty); toast.info(`Preset cargado: ${p.label}`); }}
              >
                {p.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="h-px bg-border/50 my-1" />
        
        {(recentSpoolPresets && recentSpoolPresets.length > 0) && (
          <>
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Historial Reciente (Auto-Guardado)</span>
              <div className="flex flex-wrap gap-1.5">
                {(showAllRecent ? recentSpoolPresets : recentSpoolPresets.slice(0, 6)).map(p => (
                  <Badge 
                    key={p.id} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] bg-muted/20"
                    onClick={() => { setSpoolName(p.brand); setSpoolMaterial(p.material); setSpoolColor(p.color); setSpoolWeight(p.weight); setSpoolEmptyWeight(p.emptyWeight); toast.info(`Preset reciente cargado: ${p.label}`); }}
                  >
                    {p.label}
                  </Badge>
                ))}
                {!showAllRecent && recentSpoolPresets.length > 6 && (
                  <Badge variant="secondary" className="cursor-pointer text-[10px]" onClick={() => setShowAllRecent(true)}>+ {recentSpoolPresets.length - 6} anteriores...</Badge>
                )}
                {showAllRecent && recentSpoolPresets.length > 6 && (
                  <Badge variant="secondary" className="cursor-pointer text-[10px]" onClick={() => setShowAllRecent(false)}>Ocultar anteriores</Badge>
                )}
              </div>
            </div>
            <div className="h-px bg-border/50 my-1" />
          </>
        )}
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Identificador / Marca</Label><Input value={spoolName} onChange={e => setSpoolName(e.target.value)} placeholder="Ej. Esun PLA+ Negro 01" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Material</Label>
              <Popover open={matPopoverOpen} onOpenChange={setMatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-background">
                    {spoolMaterial || "Selecciona un material..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] sm:w-[450px] p-0" align="start">
                  <ScrollArea className="h-[350px]">
                    <div className="p-4 grid gap-5">
                      {MATERIAL_CATEGORIES.map(cat => (
                        <div key={cat.name} className="space-y-2.5">
                          <div className="flex items-center gap-2 border-b pb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${cat.color} shadow-sm`} />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {cat.items.map(item => (
                              <div 
                                key={item.id}
                                onClick={() => { setSpoolMaterial(item.id); setMatPopoverOpen(false); }}
                                className={`text-xs p-2.5 rounded-md border cursor-pointer transition-colors shadow-sm ${spoolMaterial === item.id ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted/30 hover:bg-muted/60 hover:border-primary/50'}`}
                              >
                                {item.id}
                                <div className={`text-[10px] mt-0.5 ${spoolMaterial === item.id ? 'text-primary/70 font-medium' : 'text-muted-foreground font-normal'}`}>{item.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2"><Label>Color</Label><Input value={spoolColor} onChange={e => setSpoolColor(e.target.value)} placeholder="Ej. Negro" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Filamento Neto (g)</Label><Input type="number" value={spoolWeight} onChange={e => setSpoolWeight(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tara Carrete (g)</Label><Input type="number" value={spoolEmptyWeight} onChange={e => setSpoolEmptyWeight(e.target.value)} placeholder="Ej. 200" title="Peso del plástico vacío" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleCreateSpool}>Registrar Bobina</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditSpoolModal({ spool, open, onOpenChange }: { spool: FilamentSpool | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { updateSpool } = useFarm3D();
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [weightTotal, setWeightTotal] = useState(0);
  const [weightRemaining, setWeightRemaining] = useState(0);
  const [emptySpoolWeight, setEmptySpoolWeight] = useState(200);
  const [editMatPopoverOpen, setEditMatPopoverOpen] = useState(false);

  useEffect(() => {
    if (open && spool) {
      setName(spool.name);
      setMaterial(spool.material);
      setColor(spool.color);
      setWeightTotal(spool.weightTotal);
      setWeightRemaining(spool.weightRemaining);
      setEmptySpoolWeight(spool.emptySpoolWeight || 200);
    }
  }, [open, spool]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader><DialogTitle>Editar Bobina</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Identificador / Marca</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Esun PLA+ Negro 01" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Material</Label>
              <Popover open={editMatPopoverOpen} onOpenChange={setEditMatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-background">
                    {material || "Selecciona un material..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] sm:w-[450px] p-0" align="start">
                  <ScrollArea className="h-[350px]">
                    <div className="p-4 grid gap-5">
                      {MATERIAL_CATEGORIES.map(cat => (
                        <div key={cat.name} className="space-y-2.5">
                          <div className="flex items-center gap-2 border-b pb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${cat.color} shadow-sm`} />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {cat.items.map(item => (
                              <div 
                                key={item.id}
                                onClick={() => { setMaterial(item.id); setEditMatPopoverOpen(false); }}
                                className={`text-xs p-2.5 rounded-md border cursor-pointer transition-colors shadow-sm ${material === item.id ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted/30 hover:bg-muted/60 hover:border-primary/50'}`}
                              >
                                {item.id}
                                <div className={`text-[10px] mt-0.5 ${material === item.id ? 'text-primary/70 font-medium' : 'text-muted-foreground font-normal'}`}>{item.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2"><Label>Color</Label><Input value={color} onChange={e => setColor(e.target.value)} placeholder="Ej. Negro" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Total Original (g)</Label><Input type="number" value={weightTotal} onChange={e => setWeightTotal(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Restante (g)</Label><Input type="number" value={weightRemaining} onChange={e => setWeightRemaining(Number(e.target.value))} /></div>
            <div className="space-y-2 col-span-2"><Label>Tara Carrete (g)</Label><Input type="number" value={emptySpoolWeight} onChange={e => setEmptySpoolWeight(Number(e.target.value))} placeholder="Ej. 200" title="Peso del plástico vacío" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (spool) {
              if (!name || !color || weightRemaining === undefined) return toast.error("Revisa los campos requeridos");
              updateSpool(spool.id, { name, material, color, weightTotal, weightRemaining, emptySpoolWeight });
              toast.success("Bobina actualizada");
              onOpenChange(false);
            }
          }}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DryingCalcModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [dryMaterial, setDryMaterial] = useState("PETG");
  const [envTemp, setEnvTemp] = useState(25);
  const [envHumidity, setEnvHumidity] = useState(50);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  const fetchLocalWeather = async () => {
    setIsFetchingWeather(true);

    const getWeatherFromCoords = async (lat: number, lon: number, source: string) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
        const data = await res.json();
        if (data && data.current) {
           setEnvTemp(Math.round(data.current.temperature_2m));
           setEnvHumidity(Math.round(data.current.relative_humidity_2m));
           toast.success(`Humedad ambiental actualizada vía ${source}`);
        } else throw new Error("Formato inválido");
      } catch(e) {
        toast.error("Error al conectar con el servicio meteorológico");
      } finally {
        setIsFetchingWeather(false);
      }
    };

    const tryIpFallback = async () => {
      try {
        toast.info("Buscando ubicación por red (IP)...");
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
           await getWeatherFromCoords(data.latitude, data.longitude, "red");
       } else {
           throw new Error("Sin coordenadas por IP");
       }
      } catch (e) {
        toast.error("No se pudo obtener ubicación automática. Usa el modo manual.");
        setIsFetchingWeather(false);
      }
    };

    if (!navigator.geolocation) {
       await tryIpFallback();
       return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getWeatherFromCoords(pos.coords.latitude, pos.coords.longitude, "satélite");
      },
      (error) => {
        console.warn("GPS no disponible:", error);
        tryIpFallback();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const getDryingSpecs = () => {
    let t = 50; let h = 4;
    if (dryMaterial === "PLA") { t = 45; h = 4; }
    else if (dryMaterial === "PETG") { t = 65; h = 6; }
    else if (dryMaterial === "ABS") { t = 80; h = 4; }
    else if (dryMaterial === "TPU") { t = 55; h = 8; }
    else if (dryMaterial === "Nylon") { t = 85; h = 12; }
    else if (dryMaterial === "PC") { t = 90; h = 8; }
    else if (dryMaterial === "PVA") { t = 45; h = 10; }
    
    let extra = 0;
    if (envHumidity > 50) extra += 1;
    if (envHumidity > 65) extra += 2;
    if (envHumidity > 80) extra += 2; // Acumulable en caso extremo
    
    return { temp: t, hours: h + extra };
  };

  const {temp, hours} = getDryingSpecs();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /> Secado Inteligente</DialogTitle>
          <DialogDescription>Calcula el tiempo óptimo de deshidratación del material ajustado a la humedad de tu taller.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
           <div className="bg-sky-50 dark:bg-sky-950/20 p-3 rounded-lg border border-sky-100 dark:border-sky-900 flex flex-col gap-3">
             <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase">Clima Local</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-600" onClick={fetchLocalWeather} disabled={isFetchingWeather}>
                  {isFetchingWeather ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CloudRain className="h-3 w-3 mr-1" />} Auto-detectar
                </Button>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3"/> Temp (°C)</Label>
                   <Input type="number" value={envTemp} onChange={e => setEnvTemp(Number(e.target.value))} className="h-8 bg-background border-sky-200" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-xs text-muted-foreground flex items-center gap-1"><Droplets className="h-3 w-3"/> Humedad (%)</Label>
                   <Input type="number" value={envHumidity} onChange={e => setEnvHumidity(Number(e.target.value))} className="h-8 bg-background border-sky-200" />
                </div>
             </div>
           </div>
           
           <div className="space-y-2">
             <Label>Material a Secar</Label>
             <Select value={dryMaterial} onValueChange={setDryMaterial}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLA">PLA / PLA+</SelectItem>
                  <SelectItem value="PETG">PETG</SelectItem>
                  <SelectItem value="ABS">ABS / ASA</SelectItem>
                  <SelectItem value="TPU">TPU (Flexible)</SelectItem>
                  <SelectItem value="Nylon">Nylon / PA-CF</SelectItem>
                  <SelectItem value="PC">Policarbonato (PC)</SelectItem>
                  <SelectItem value="PVA">PVA (Soluble)</SelectItem>
                </SelectContent>
             </Select>
           </div>

           <div className="bg-muted/30 p-4 rounded-lg border flex items-center justify-around mt-2">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Temperatura</p>
                <p className="text-3xl font-black text-orange-600">{temp}°C</p>
              </div>
              <div className="w-px h-12 bg-border"></div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Tiempo Est.</p>
                <p className="text-3xl font-black text-blue-600">{hours} <span className="text-lg font-medium text-muted-foreground">hrs</span></p>
              </div>
           </div>
           
           {envHumidity > 65 && (
             <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 flex items-start gap-2 shadow-sm">
               <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
               Alta humedad detectada. Se han inyectado horas adicionales al algoritmo para garantizar una deshidratación profunda del núcleo.
             </p>
           )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}