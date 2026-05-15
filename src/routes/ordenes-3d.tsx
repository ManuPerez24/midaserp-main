import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useFarm3D, type ProductionOrder, type ProductionOrderStatus } from "@/stores/3d-farm";
import { useCadVault } from "@/stores/cad-vault";
import { PageGuard } from "@/components/page-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, Plus, Trash2, Edit, CheckCircle2, Play, Pause, XCircle, AlertTriangle, Eye, Camera, User, Settings2, ChevronDown, Calculator, Printer, Wrench, Paintbrush, Filter, Moon, Box, Search, Check, Download, File as FileIcon, FileCode, FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";
import { sendPushNotification } from "@/util/notifications.functions";
import { useSettings } from "@/stores/settings";
import { v4 as uuid } from "uuid";

const MATERIAL_DENSITIES: Record<string, number> = {
  "PLA": 1.24,
  "PLA+": 1.24,
  "PLA Matte": 1.24,
  "PLA Silk": 1.24,
  "PLA HS": 1.24,
  "PLA CF": 1.24,
  "PLA Wood": 1.15,
  "PETG": 1.27,
  "PETG HS": 1.27,
  "PETG CF": 1.27,
  "ABS": 1.04,
  "ABS+": 1.04,
  "ASA": 1.07,
  "TPU": 1.21,
  "TPU HS": 1.21,
  "PC": 1.20,
  "Nylon": 1.14,
  "PA-CF": 1.14,
  "HIPS": 1.04,
  "PVA": 1.19,
};

function StlViewer({ url, className }: { url: string, className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | false>(false);

  React.useEffect(() => {
    let mount = containerRef.current;
    if (!mount) return;
    let renderer: any, scene: any, camera: any, controls: any, animationId: number;
    const actualUrl = typeof url === 'string' ? url : (url as any)?.url || (url as any)?.dataUrl;
    
    if (!actualUrl) { setError("URL inválida."); setLoading(false); return; }
    let finalUrl = actualUrl.replace('public/', '/').replace('./public/', '/').replace(/\\/g, '/');
    if (!finalUrl.startsWith('data:')) finalUrl = finalUrl.split('/').map((p: string) => p.includes(' ') ? encodeURIComponent(p) : p).join('/');

    const initViewer = () => {
      const THREE = (window as any).THREE;
      if (!THREE || !THREE.STLLoader) { setError("Error de motor 3D."); setLoading(false); return; }
      try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, mount!.clientWidth / mount!.clientHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount!.clientWidth || 1, mount!.clientHeight || 1);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount!.appendChild(renderer.domElement);
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(100, 100, 100); scene.add(dl);
        const dl2 = new THREE.DirectionalLight(0xffffff, 0.5); dl2.position.set(-100, -100, 50); scene.add(dl2);

        fetch(finalUrl).then(async (res) => {
          if (!res.ok) throw new Error("No encontrado");
          const buffer = await res.arrayBuffer();
          const geometry = new THREE.STLLoader().parse(buffer);
          const material = new THREE.MeshPhongMaterial({ color: 0xf59e0b, specular: 0x111111, shininess: 100 });
          const mesh = new THREE.Mesh(geometry, material);
          geometry.computeBoundingBox();
          const center = new THREE.Vector3(); geometry.boundingBox.getCenter(center);
          mesh.position.sub(center);
          const size = new THREE.Vector3(); geometry.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(camera.fov * (Math.PI / 180) / 2)) * 1.5;
          camera.position.set(0, cameraZ * 0.5, cameraZ);
          camera.far = Math.max(1000, cameraZ * 10); camera.updateProjectionMatrix(); camera.lookAt(0,0,0);
          const group = new THREE.Group(); group.add(mesh); group.rotation.x = -Math.PI / 2; scene.add(group);
          setLoading(false);
        }).catch(() => { setError("Error al leer modelo."); setLoading(false); });

        const animate = () => { animationId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
        animate();
      } catch (e: any) { setError("Fallo de renderizado."); setLoading(false); }
    };

    const loadScripts = async () => {
      const loadScript = (src: string) => new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
        const s = document.createElement("script"); s.src = src; s.onload = () => resolve(true);
        document.head.appendChild(s);
      });
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
      await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js");
      await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
      setTimeout(initViewer, 50);
    };
    loadScripts();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer && mount) mount.removeChild(renderer.domElement);
      if (scene) scene.clear();
    };
  }, [url]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>}
      {error && <div className="absolute inset-0 flex items-center justify-center text-rose-500 text-sm font-bold bg-background/80">{error}</div>}
    </div>
  );
}

export const Route = createFileRoute("/ordenes-3d")({
  component: () => (
    <PageGuard>
      <OrdersDashboard />
    </PageGuard>
  ),
});

function OrdersDashboard() {
  const { orders, printers, operators, activeOperator, setActiveOperator, addOperator, updateOperator, removeOperator, addOrder, updateOrder, removeOrder, updatePrinter } = useFarm3D();
  const cadVaultStore = useCadVault() as any;
  const cadProjects = cadVaultStore.projects || [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<ProductionOrder | null>(null);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [manageOperatorsOpen, setManageOperatorsOpen] = useState(false);
  const [operatorPopoverOpen, setOperatorPopoverOpen] = useState(false);

  const uploadFilesFn = useServerFn(uploadProjectFiles);
  const sendNotificationFn = useServerFn(sendPushNotification);
  const settings = useSettings(s => s.settings);
  const [reportFailure, setReportFailure] = useState<ProductionOrder | null>(null);
  const [viewFailures, setViewFailures] = useState<ProductionOrder | null>(null);
  const [failReason, setFailReason] = useState("");
  const [failAmount, setFailAmount] = useState(1);
  const [failPhoto, setFailPhoto] = useState<File | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("Cualquiera");
  const [weightPerPiece, setWeightPerPiece] = useState<number | "">("");
  const [printTimeDays, setPrintTimeDays] = useState("");
  const [printTimeHrs, setPrintTimeHrs] = useState("");
  const [printTimeMins, setPrintTimeMins] = useState("");
  const [targetPieces, setTargetPieces] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [piecesPerPlatter, setPiecesPerPlatter] = useState<number | "">(1);
  const [assemblyGroup, setAssemblyGroup] = useState("");
  const [cadProjectId, setCadProjectId] = useState<string>("");
  const [openCadCombo, setOpenCadCombo] = useState(false);
  
  const [viewFilesProject, setViewFilesProject] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<any | null>(null);

  const [autoFillCad, setAutoFillCad] = useState(true);
  const [multiplyByPlatter, setMultiplyByPlatter] = useState(false);
  const [editAutoFillCad, setEditAutoFillCad] = useState(true);
  const [editMultiplyByPlatter, setEditMultiplyByPlatter] = useState(false);

  const applyCadData = (projId: string, multiply: boolean, platter: number) => {
    const p = cadProjects.find((x: any) => x.id === projId);
    if (p && p.versions && p.versions.length > 0) {
      const parts = p.versions.filter((v: any) => !v.description?.startsWith("Vínculo de accesorio:"));
      const versionsToUse = parts.length > 0 ? parts : p.versions;
      const latestVer = versionsToUse.reduce((prev: any, current: any) => (prev.version > current.version) ? prev : current);
      
      let w = latestVer.weight;
      let t = latestVer.printTimeMinutes;
      
      if (multiply) {
         const plat = Number(platter) || 1;
         if (w) w = w * plat;
         if (t) t = t * plat;
      }

      if (w !== undefined) setWeightPerPiece(w);
      if (t !== undefined) {
         setPrintTimeDays(Math.floor(t / 1440) > 0 ? String(Math.floor(t / 1440)) : "");
         setPrintTimeHrs(String(Math.floor((t % 1440) / 60)));
         setPrintTimeMins(String(t % 60));
      }
    }
  };

  const applyCadDataEdit = (projId: string, multiply: boolean, platter: number) => {
    const p = cadProjects.find((x: any) => x.id === projId);
    if (p && p.versions && p.versions.length > 0) {
      const parts = p.versions.filter((v: any) => !v.description?.startsWith("Vínculo de accesorio:"));
      const versionsToUse = parts.length > 0 ? parts : p.versions;
      const latestVer = versionsToUse.reduce((prev: any, current: any) => (prev.version > current.version) ? prev : current);
      
      let w = latestVer.weight;
      let t = latestVer.printTimeMinutes;
      
      if (multiply) {
         const plat = Number(platter) || 1;
         if (w) w = w * plat;
         if (t) t = t * plat;
      }

      setEditOpen((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          weightPerPiece: w !== undefined ? w : prev.weightPerPiece,
          printTimeMinutes: t !== undefined ? t : prev.printTimeMinutes
        };
      });
    }
  };

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("Activas");
  const [orderTimeFilter, setOrderTimeFilter] = useState<string>("30d");
  const [nightMode, setNightMode] = useState(false);
  const [calcLength, setCalcLength] = useState("");
  const [calcMaterial, setCalcMaterial] = useState("PLA");
  const [calcDiameter, setCalcDiameter] = useState("1.75");

  const handleCreate = () => {
    if (!name || !targetPieces || targetPieces <= 0 || !deadline) return toast.error("Completa todos los campos");
    addOrder({
      id: uuid(),
      name,
      material: material === "Cualquiera" ? undefined : material,
      description,
      weightPerPiece: weightPerPiece ? Number(weightPerPiece) : undefined,
      printTimeMinutes: (printTimeDays || printTimeHrs || printTimeMins) ? (Number(printTimeDays) * 1440) + (Number(printTimeHrs) * 60) + Number(printTimeMins) : undefined,
      targetPieces: Number(targetPieces),
      printedPieces: 0,
      failedPieces: 0,
      deadline: new Date(deadline + "T23:59:59").toISOString(),
      status: "Pendiente",
      assignedPrinters: [],
      piecesPerPlatter: Number(piecesPerPlatter) || 1,
      assemblyGroup: assemblyGroup.trim() || undefined,
      cadProjectId: cadProjectId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
    toast.success("Orden de producción creada");
    setCreateOpen(false);
    setName("");
    setDescription("");
    setMaterial("Cualquiera");
    setWeightPerPiece("");
    setPrintTimeDays("");
    setPrintTimeHrs("");
    setPrintTimeMins("");
    setTargetPieces("");
    setDeadline("");
    setPiecesPerPlatter(1);
    setAssemblyGroup("");
    setCadProjectId("");
    setMultiplyByPlatter(false);
    setAutoFillCad(true);
  };

  const handleEdit = () => {
    if (!editOpen) return;
    if (!editOpen.name || editOpen.targetPieces <= 0) return toast.error("Datos inválidos");
    updateOrder(editOpen.id, {
      name: editOpen.name,
      material: editOpen.material,
      description: editOpen.description,
      weightPerPiece: editOpen.weightPerPiece,
      printTimeMinutes: editOpen.printTimeMinutes,
      targetPieces: editOpen.targetPieces,
      deadline: editOpen.deadline,
      status: editOpen.status,
      piecesPerPlatter: (editOpen as any).piecesPerPlatter || 1,
      assemblyGroup: (editOpen as any).assemblyGroup,
      cadProjectId: (editOpen as any).cadProjectId,
    } as any);
    toast.success("Orden actualizada");
    setEditOpen(null);
  };

  const getStatusColor = (status: ProductionOrderStatus) => {
    switch (status) {
      case "En Progreso": return "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-sm";
      case "Pausada": return "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm";
      case "Impreso (A Post-Proceso)": return "bg-violet-500 hover:bg-violet-600 text-white border-violet-500 shadow-sm";
      case "Quitando Soportes": return "bg-fuchsia-500 hover:bg-fuchsia-600 text-white border-fuchsia-500 shadow-sm";
      case "Acabado (Lijado/Pintura)": return "bg-pink-500 hover:bg-pink-600 text-white border-pink-500 shadow-sm";
      case "Completada": return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-sm";
      case "Cancelada": return "bg-rose-500 hover:bg-rose-600 text-white border-rose-500 shadow-sm";
      default: return "bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-sm";
    }
  };

  const getStatusIcon = (status: ProductionOrderStatus) => {
    switch (status) {
      case "En Progreso": return <Play className="h-3 w-3 mr-1.5" />;
      case "Pausada": return <Pause className="h-3 w-3 mr-1.5" />;
      case "Impreso (A Post-Proceso)": return <Printer className="h-3 w-3 mr-1.5" />;
      case "Quitando Soportes": return <Wrench className="h-3 w-3 mr-1.5" />;
      case "Acabado (Lijado/Pintura)": return <Paintbrush className="h-3 w-3 mr-1.5" />;
      case "Completada": return <CheckCircle2 className="h-3 w-3 mr-1.5" />;
      case "Cancelada": return <XCircle className="h-3 w-3 mr-1.5" />;
      default: return <AlertTriangle className="h-3 w-3 mr-1.5" />;
    }
  };

  const addGoodPieces = (o: ProductionOrder, amount: number) => {
    const newQty = o.printedPieces + amount;
    const log = { id: uuid(), date: new Date().toISOString(), amount, operator: activeOperator };
    const updates: Partial<ProductionOrder> = { printedPieces: newQty, productionLogs: [...(o.productionLogs || []), log] };
    if (newQty >= o.targetPieces && o.status !== "Completada" && o.status !== "Impreso (A Post-Proceso)" && o.status !== "Quitando Soportes" && o.status !== "Acabado (Lijado/Pintura)") {
      updates.status = "Impreso (A Post-Proceso)";
      if ((settings as any).notifications?.enabled) {
        sendNotificationFn({
          data: {
            message: `✅ *Impresión Completada*\nLa orden "${o.name}" ha finalizado su impresión (${newQty}/${o.targetPieces} piezas) y está lista para post-proceso.`,
            telegramToken: (settings as any).notifications?.telegramToken,
            telegramChatId: (settings as any).notifications?.telegramChatId,
            whatsappToken: (settings as any).notifications?.whatsappToken,
            whatsappPhone: (settings as any).notifications?.whatsappPhone,
          }
        }).catch(console.error);
      }
      toast.success(`¡Impresión terminada para ${o.name}! Lista para post-procesado.`);
    } else if (newQty > 0 && o.status === "Pendiente") {
      updates.status = "En Progreso";
    }
    updateOrder(o.id, updates);
  };

  const submitFailure = async () => {
    if (!reportFailure || !failReason || failAmount <= 0) return toast.error("Completa la cantidad y razón");
    setIsReporting(true);
    
    let photoUrl = undefined;
    if (failPhoto) {
      const toastId = toast.loading("Subiendo foto de la merma al servidor...");
      try {
        const b64 = await new Promise<string>((resolve) => {
          const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(failPhoto);
        });
        const res = await uploadFilesFn({ data: { files: [{ name: failPhoto.name, type: failPhoto.type, base64: b64, size: failPhoto.size }] } });
        if (res.ok && res.data.length > 0) { 
          const uploadedFile = res.data[0] as any;
          photoUrl = typeof uploadedFile === 'string' ? uploadedFile : uploadedFile.url; 
          toast.success("Fotografía archivada", { id: toastId }); 
        } else toast.error("Error al subir", { id: toastId });
      } catch(e) { toast.error("Error de red", { id: toastId }); }
    }
    
    const newFailure = { id: uuid(), reason: failReason, amount: failAmount, date: new Date().toISOString(), photoUrl, operator: activeOperator };
    updateOrder(reportFailure.id, { 
      failedPieces: reportFailure.failedPieces + failAmount,
      failures: [...(reportFailure.failures || []), newFailure]
    });
    
    if ((settings as any).notifications?.enabled) {
      sendNotificationFn({
        data: {
          message: `⚠️ *Alerta de Merma*\nOrden: "${reportFailure.name}"\nPiezas perdidas: ${failAmount}\nRazón: ${failReason}\nTurno: ${activeOperator}`,
          telegramToken: (settings as any).notifications?.telegramToken,
          telegramChatId: (settings as any).notifications?.telegramChatId,
          whatsappToken: (settings as any).notifications?.whatsappToken,
          whatsappPhone: (settings as any).notifications?.whatsappPhone,
        }
      }).catch(console.error);
    }

    toast.success(`Merma reportada en ${reportFailure.name}`);
    setIsReporting(false);
    setReportFailure(null);
    setFailReason("");
    setFailPhoto(null);
  };

  const handleDelete = (id: string) => {
    // Liberar impresoras asignadas a esta orden
    printers.forEach(p => {
      if (p.currentOrderId === id) updatePrinter(p.id, { currentOrderId: undefined });
    });
    removeOrder(id);
    toast.success("Orden eliminada");
    setEditOpen(null);
  };

  const calculateWeight = () => {
    const d = parseFloat(calcDiameter);
    const l = parseFloat(calcLength);
    const density = MATERIAL_DENSITIES[calcMaterial] || 1.24;
    if (d > 0 && l > 0) {
      const radiusCm = d / 20; 
      const areaCm2 = Math.PI * radiusCm * radiusCm;
      const lengthCm = l * 100;
      const volumeCm3 = areaCm2 * lengthCm;
      return Math.round(volumeCm3 * density);
    }
    return 0;
  };

  const renderCalculatorPopover = (onApply: (w: number) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="link" type="button" className="h-auto p-0 text-[10px] text-muted-foreground hover:text-amber-600">
          <Calculator className="h-3 w-3 mr-1" /> De metros a gramos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 sm:w-80" side="top" align="end">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2"><Calculator className="h-4 w-4 text-amber-500" /> Calculadora Slicer</h4>
          <p className="text-xs text-muted-foreground">Convierte los metros del slicer a gramos usando la densidad del material.</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Material</Label>
              <Select value={calcMaterial} onValueChange={setCalcMaterial}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(MATERIAL_DENSITIES).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Diámetro (mm)</Label>
              <Select value={calcDiameter} onValueChange={setCalcDiameter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1.75">1.75 mm</SelectItem><SelectItem value="2.85">2.85 mm</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Longitud en Metros (m)</Label>
            <Input type="number" min="0" step="0.1" value={calcLength} onChange={e => setCalcLength(e.target.value)} className="h-8 text-xs" placeholder="Ej. 12.5" />
          </div>
          <div className="pt-3 flex items-center justify-between border-t mt-3">
             <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Resultado Aproximado</p>
                <p className="font-bold text-amber-600 text-lg">{calculateWeight()} g</p>
             </div>
             <Button type="button" size="sm" onClick={() => { const w = calculateWeight(); if(w > 0) { onApply(w); toast.success(`Peso aplicado: ${w}g`); } }}>Usar peso</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const filteredOrders = orders.filter(o => {
    const isActive = ["Pendiente", "En Progreso", "Pausada", "Impreso (A Post-Proceso)", "Quitando Soportes", "Acabado (Lijado/Pintura)"].includes(o.status);
    if (nightMode && (!o.printTimeMinutes || o.printTimeMinutes < 480)) return false;
    if (orderStatusFilter === "Activas" && !isActive) return false;
    if (orderStatusFilter === "Completadas" && o.status !== "Completada") return false;
    if (orderStatusFilter === "Canceladas" && o.status !== "Cancelada") return false;

    if (orderTimeFilter !== "todo") {
      const d = new Date(o.createdAt);
      const now = new Date();
      const diffTime = now.getTime() - d.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      if (orderTimeFilter === "7d" && diffDays > 7) return false;
      if (orderTimeFilter === "30d" && diffDays > 30) return false;
      if (orderTimeFilter === "3m" && diffDays > 90) return false;
      if (orderTimeFilter === "mes" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      if (orderTimeFilter === "ano" && d.getFullYear() !== now.getFullYear()) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-amber-500">
            <ListChecks className="h-6 w-6" /> Órdenes de Producción
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra las metas de fabricación, registra piezas y mermas.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={orderTimeFilter} onValueChange={setOrderTimeFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="ano">Este año</SelectItem>
                <SelectItem value="todo">Histórico</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-border mx-1" />
            <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                <SelectItem value="Activas">Activas</SelectItem>
                <SelectItem value="Completadas">Completadas</SelectItem>
                <SelectItem value="Canceladas">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={nightMode ? "default" : "outline"}
              size="sm"
              onClick={() => setNightMode(!nightMode)}
              className={`h-7 px-3 border text-xs shadow-none ${nightMode ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600" : "bg-card text-muted-foreground hover:text-indigo-500"}`}
              title="Filtrar piezas que tardan más de 8 horas (Ideal para la noche)"
            >
              <Moon className={`h-3 w-3 ${nightMode ? "mr-1.5" : ""}`} /> {nightMode && "Modo Noche"}
            </Button>
          </div>
          <Popover open={operatorPopoverOpen} onOpenChange={setOperatorPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 bg-muted/30 hover:bg-muted/50 shadow-sm px-3 flex items-center gap-2 border">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Turno:</span>
                <span className="text-sm font-bold truncate max-w-[120px]">{activeOperator}</span>
                <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 pb-1">
                <div className="mb-2 mt-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Seleccionar Turno
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="flex flex-col gap-1 pr-3">
                    {operators.map(op => (
                      <Button
                        key={op}
                        variant={activeOperator === op ? "secondary" : "ghost"}
                        className={`justify-start text-sm h-8 px-2 ${activeOperator === op ? 'font-bold bg-primary/10 text-primary hover:bg-primary/20' : 'text-foreground'}`}
                        onClick={() => { setActiveOperator(op); setOperatorPopoverOpen(false); }}
                      >
                        {activeOperator === op && <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />}
                        <span className={activeOperator === op ? "" : "pl-6"}>{op}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="p-2 border-t bg-muted/20">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Añadir operario..." 
                    className="h-8 text-xs bg-background" 
                    value={newOperatorName} 
                    onChange={e => setNewOperatorName(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && newOperatorName.trim()) { addOperator(newOperatorName.trim()); setNewOperatorName(""); } }} 
                  />
                  <Button size="sm" className="h-8 px-3" onClick={() => { if (newOperatorName.trim()) { addOperator(newOperatorName.trim()); setNewOperatorName(""); } }}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="p-1 border-t bg-muted/10">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground h-8 hover:text-foreground" onClick={() => { setManageOperatorsOpen(true); setOperatorPopoverOpen(false); }}>
                  <Settings2 className="mr-2 h-3.5 w-3.5" /> Administrar turnos
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex gap-2">
            <Link to="/boveda-3d">
              <Button variant="outline" className="border-indigo-500 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 shadow-sm hidden md:flex">
                <Box className="h-4 w-4 mr-2" /> Bóveda CAD
              </Button>
            </Link>
            <Button onClick={() => setCreateOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
              <Plus className="h-4 w-4 mr-2" /> Nueva Orden
            </Button>
          </div>
        </div>
      </div>

      {orders.length === 0 && orderStatusFilter === "Activas" && orderTimeFilter === "30d" && !nightMode ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-muted/20">
          <ListChecks className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Sin órdenes activas</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">No has asignado ninguna cuota de producción. Crea una orden para empezar a fabricar.</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950">
            <Plus className="h-4 w-4 mr-2" /> Crear mi primera orden
          </Button>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-10 text-center border-dashed border-2 bg-muted/20">
          <ListChecks className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-bold mb-2">Sin coincidencias</h2>
          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{nightMode ? "No tienes órdenes activas configuradas con piezas de larga duración (>8 hrs) para el turno nocturno." : "No se encontraron órdenes con los filtros actuales."}</p>
          <Button onClick={() => { setOrderTimeFilter("30d"); setOrderStatusFilter("Activas"); setNightMode(false); }} variant="outline" className="border-amber-500 text-amber-500">
            Restaurar filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((o) => {
            const progress = Math.min(100, Math.max(0, (o.printedPieces / o.targetPieces) * 100));
            const assignedCount = printers.filter(p => p.currentOrderId === o.id).length;
            const isCompleted = o.status === "Completada";
            const platter = (o as any).piecesPerPlatter || 1;

            return (
            <Card key={o.id} className={`overflow-hidden transition-all hover:shadow-md flex flex-col ${isCompleted ? 'opacity-80' : o.status === 'En Progreso' ? 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''}`}>
              <CardHeader className="p-4 border-b bg-muted/10 pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate" title={o.name}>{o.name}</CardTitle>
                    {(o.printTimeMinutes && o.printTimeMinutes >= 480) ? <span title="Impresión larga (>8 hrs)"><Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" /></span> : null}
                  </div>
                  {o.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-1" title={o.description}>{o.description}</p>}
                  {(o as any).assemblyGroup && (
                    <Badge variant="outline" className="w-fit text-[10px] bg-sky-50 text-sky-700 border-sky-200 mt-1 mb-1 shadow-sm">Ensamble: {(o as any).assemblyGroup}</Badge>
                  )}
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    Entrega: {new Date(o.deadline).toLocaleDateString()}
                    {o.weightPerPiece ? ` • ${o.weightPerPiece}g/pz` : ""}
                    {platter > 1 ? ` • 🖨️ ${platter} pzs/cama` : ""}
                    {o.material && o.material !== "Cualquiera" ? ` • Req: ${o.material}` : ""}
                    {o.printTimeMinutes ? ` • ⏱️ ${Math.floor(o.printTimeMinutes/1440) > 0 ? `${Math.floor(o.printTimeMinutes/1440)}d ` : ''}${Math.floor((o.printTimeMinutes%1440)/60)}h ${o.printTimeMinutes%60}m` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => setEditOpen(o)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <Badge className={`cursor-pointer ${getStatusColor(o.status)}`} title="Estado actual">
                    {getStatusIcon(o.status)}
                    {o.status}
                  </Badge>
                  {assignedCount > 0 && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400">
                      {assignedCount} impresoras
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className={isCompleted ? "text-emerald-500" : "text-primary"}>{Math.floor(progress)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border">
                    <div 
                      className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-primary'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{o.printedPieces} buenas</span>
                    <span>Meta: {o.targetPieces}</span>
                  </div>
                  {o.cadProjectId && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 shadow-sm" onClick={() => setViewFilesProject(o.cadProjectId!)}>
                      <Box className="h-3.5 w-3.5 mr-1.5" /> Archivos 3D
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-md border text-sm">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Piezas Buenas</span>
                    <span className="font-semibold text-lg text-emerald-600">{o.printedPieces}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Catálogo Mermas</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg text-rose-500">{o.failedPieces}</span>
                      {(o.failures?.length || 0) > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-500/10" onClick={() => setViewFailures(o)} title="Ver registro de fallos">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-3 bg-muted/20 border-t flex flex-col gap-2">
                {o.status === "Impreso (A Post-Proceso)" && (
                  <Button size="sm" variant="outline" className="w-full bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950 dark:hover:bg-violet-900" onClick={() => updateOrder(o.id, { status: "Quitando Soportes" })}>
                    <Wrench className="h-3.5 w-3.5 mr-2" /> Iniciar Post-Proceso (Quitar Soportes)
                  </Button>
                )}
                {o.status === "Quitando Soportes" && (
                  <Button size="sm" variant="outline" className="w-full bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100 dark:bg-fuchsia-950 dark:hover:bg-fuchsia-900" onClick={() => updateOrder(o.id, { status: "Acabado (Lijado/Pintura)" })}>
                    <Paintbrush className="h-3.5 w-3.5 mr-2" /> Soportes Listos (Pasar a Acabado)
                  </Button>
                )}
                {o.status === "Acabado (Lijado/Pintura)" && (
                  <Button size="sm" variant="outline" className="w-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900" onClick={() => updateOrder(o.id, { status: "Completada" })}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Finalizar y Completar Orden
                  </Button>
                )}
                <div className="flex flex-wrap gap-2 justify-between w-full">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900" onClick={() => addGoodPieces(o, 1)} disabled={isCompleted}>
                      +1 Buena
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900" onClick={() => addGoodPieces(o, 5)} disabled={isCompleted}>
                      +5
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 shadow-sm" onClick={() => { setFailAmount(1); setFailReason(""); setFailPhoto(null); setReportFailure(o); }}>
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Reportar Merma
                  </Button>
                </div>
              </CardFooter>
            </Card>
            )
          })}
        </div>
      )}

      {/* MODAL CREAR ORDEN */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background rounded-xl">
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0 flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Plus className="text-primary h-5 w-5 shrink-0" />
                <span className="line-clamp-1">Nueva Orden de Producción</span>
              </DialogTitle>
              <DialogDescription>Configura los parámetros para fabricar una nueva pieza.</DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
            <div className="w-full mx-auto flex flex-col gap-4">
              
              <Card>
                <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Datos Principales</CardTitle></CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                       <Label className="text-indigo-700 dark:text-indigo-400 flex items-center gap-2 font-bold">
                         <Box className="h-4 w-4" /> Importar desde Bóveda CAD
                       </Label>
                       <Popover open={openCadCombo} onOpenChange={setOpenCadCombo}>
                         <PopoverTrigger asChild>
                           <Button variant="outline" role="combobox" aria-expanded={openCadCombo} className="w-full justify-between bg-background">
                             {cadProjectId ? cadProjects.find((p: any) => p.id === cadProjectId)?.name : "Buscar pieza o proyecto..."}
                             <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-[380px] p-0" align="start">
                           <Command>
                             <CommandInput placeholder="Buscar por nombre o categoría..." />
                             <CommandList>
                               <CommandEmpty>No se encontraron proyectos CAD.</CommandEmpty>
                               <CommandGroup>
                                 {cadProjects.map((p: any) => (
                                   <CommandItem key={p.id} value={`${p.name} ${p.category}`} onSelect={() => {
                                     setCadProjectId(p.id);
                                     if (!name) setName(p.name);
                                     if (!description && p.description) setDescription(p.description);
                             if (p.material && p.material !== "Cualquiera") setMaterial(p.material);
                                     setOpenCadCombo(false);
                                     if (autoFillCad) applyCadData(p.id, multiplyByPlatter, Number(piecesPerPlatter) || 1);
                                     toast.success(`Vinculado con ${p.name}`);
                                   }}>
                                     <Box className="mr-2 h-4 w-4 text-indigo-500" />
                                     <span className="flex-1 truncate">{p.name}</span>
                                     <Badge variant="outline" className="text-[9px] ml-2 shrink-0">{p.category}</Badge>
                                     <Check className={`ml-3 h-4 w-4 text-indigo-600 ${cadProjectId === p.id ? "opacity-100" : "opacity-0"}`} />
                                   </CommandItem>
                                 ))}
                               </CommandGroup>
                             </CommandList>
                           </Command>
                         </PopoverContent>
                       </Popover>
                       <div className="flex flex-col gap-2 mt-3 p-2.5 bg-background/50 rounded-md border border-indigo-100/50 shadow-sm">
                         <div className="flex items-center gap-2">
                           <Checkbox 
                             id="autofill-cad-create" 
                             checked={autoFillCad} 
                             onCheckedChange={(c) => {
                               setAutoFillCad(!!c);
                               if (c && cadProjectId) applyCadData(cadProjectId, multiplyByPlatter, Number(piecesPerPlatter) || 1);
                             }} 
                           />
                           <Label htmlFor="autofill-cad-create" className="text-[10px] font-semibold cursor-pointer leading-tight text-foreground">Auto-completar Tiempo y Peso desde CAD</Label>
                         </div>
                         <div className="flex items-center gap-2 ml-5">
                           <Checkbox 
                             id="multiply-platter-create" 
                             checked={multiplyByPlatter} 
                             onCheckedChange={(c) => {
                               setMultiplyByPlatter(!!c);
                               if (autoFillCad && cadProjectId) applyCadData(cadProjectId, !!c, Number(piecesPerPlatter) || 1);
                             }} 
                             disabled={!autoFillCad}
                           />
                           <Label htmlFor="multiply-platter-create" className={`text-[10px] cursor-pointer leading-tight ${autoFillCad ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>Multiplicar estos valores por Pzs/Cama</Label>
                         </div>
                       </div>
                    </div>

                    <div className="space-y-2 pt-2 md:pt-0">
                      <Label>Pieza a fabricar</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Carcasa Superior V2" />
                    </div>
                    <div className="space-y-2 pt-2 md:pt-0">
                      <Label>Material Requerido</Label>
                      <Select value={material} onValueChange={setMaterial}>
                        <SelectTrigger><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cualquiera">Cualquiera / Sin restricción</SelectItem>
                          {Object.keys(MATERIAL_DENSITIES).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción / Notas (Opcional)</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Usar relleno al 20%, soportes en árbol..." rows={2} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Especificaciones y Meta</CardTitle></CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Peso p/p (g)</Label>
                        {renderCalculatorPopover((w) => setWeightPerPiece(w))}
                      </div>
                      <Input type="number" min="1" value={weightPerPiece} onChange={e => setWeightPerPiece(e.target.value ? Number(e.target.value) : "")} placeholder="Ej. 150" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pzs/Cama</Label>
                      <Input type="number" min="1" value={piecesPerPlatter} onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setPiecesPerPlatter(val);
                        if (cadProjectId && autoFillCad && multiplyByPlatter) applyCadData(cadProjectId, true, Number(val) || 1);
                      }} placeholder="Ej. 2" title="Multiplicador de impresión" />
                    </div>
                    <div className="space-y-2">
                      <Label>Días (d)</Label>
                      <Input type="number" min="0" value={printTimeDays} onChange={e => setPrintTimeDays(e.target.value)} placeholder="Ej. 1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Horas p/p</Label>
                      <Input type="number" min="0" value={printTimeHrs} onChange={e => setPrintTimeHrs(e.target.value)} placeholder="Ej. 10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Min extra</Label>
                      <Input type="number" min="0" max="59" value={printTimeMins} onChange={e => setPrintTimeMins(e.target.value)} placeholder="Ej. 30" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cuota obj.</Label>
                      <Input type="number" min="1" value={targetPieces} onChange={e => setTargetPieces(e.target.value ? Number(e.target.value) : "")} placeholder="Ej. 500" />
                    </div>
                    <div className="space-y-2">
                      <Label>Límite</Label>
                      <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ensamble</Label>
                      <Input value={assemblyGroup} onChange={e => setAssemblyGroup(e.target.value)} placeholder="Brazo" />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
          <DialogFooter className="p-4 sm:p-6 bg-background border-t shrink-0 flex-col sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">Crear Orden de Producción</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR ORDEN */}
      <Dialog open={!!editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(null); setEditMultiplyByPlatter(false); setEditAutoFillCad(true); } }}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background rounded-xl">
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0 flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Edit className="text-primary h-5 w-5 shrink-0" />
                <span className="line-clamp-1">Editar Orden: {editOpen?.name}</span>
              </DialogTitle>
              <DialogDescription>Modifica los parámetros de producción y reasigna vínculos 3D.</DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
            {editOpen && (
              <div className="w-full mx-auto flex flex-col gap-4">
                <Card>
                  <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Datos Principales</CardTitle></CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                         <Label className="text-indigo-700 dark:text-indigo-400 flex items-center gap-2 font-bold"><Box className="h-4 w-4" /> Vínculo Bóveda CAD</Label>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button variant="outline" role="combobox" className="w-full justify-between bg-background">
                               {(editOpen as any).cadProjectId ? cadProjects.find((p: any) => p.id === (editOpen as any).cadProjectId)?.name || "Proyecto Eliminado" : "Ninguno seleccionado..."}
                               <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-[380px] p-0" align="start">
                             <Command>
                               <CommandInput placeholder="Buscar proyecto..." />
                               <CommandList>
                                 <CommandEmpty>No hay resultados.</CommandEmpty>
                                 <CommandGroup>
                                   <CommandItem onSelect={() => setEditOpen({...editOpen!, cadProjectId: undefined} as any)}><XCircle className="mr-2 h-4 w-4 text-muted-foreground"/> Desvincular proyecto actual</CommandItem>
                                   {cadProjects.map((p: any) => (
                                     <CommandItem key={p.id} value={`${p.name} ${p.category}`} onSelect={() => { 
                                       setEditOpen({...editOpen!, cadProjectId: p.id, material: p.material && p.material !== "Cualquiera" ? p.material : editOpen!.material} as any); 
                                       if (editAutoFillCad) applyCadDataEdit(p.id, editMultiplyByPlatter, (editOpen as any).piecesPerPlatter || 1);
                                       toast.success("Vínculo actualizado"); 
                                     }}>
                                       <Box className="mr-2 h-4 w-4 text-indigo-500" />
                                       <span className="flex-1 truncate">{p.name}</span>
                                       <Check className={`ml-3 h-4 w-4 text-indigo-600 ${(editOpen as any).cadProjectId === p.id ? "opacity-100" : "opacity-0"}`} />
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                               </CommandList>
                             </Command>
                           </PopoverContent>
                         </Popover>
                         <div className="flex flex-col gap-2 mt-3 p-2.5 bg-background/50 rounded-md border border-indigo-100/50 shadow-sm">
                           <div className="flex items-center gap-2">
                             <Checkbox 
                               id="autofill-cad-edit" 
                               checked={editAutoFillCad} 
                               onCheckedChange={(c) => {
                                 setEditAutoFillCad(!!c);
                                 if (c && (editOpen as any).cadProjectId) applyCadDataEdit((editOpen as any).cadProjectId, editMultiplyByPlatter, (editOpen as any).piecesPerPlatter || 1);
                               }} 
                             />
                             <Label htmlFor="autofill-cad-edit" className="text-[10px] font-semibold cursor-pointer leading-tight text-foreground">Auto-completar Tiempo y Peso desde CAD</Label>
                           </div>
                           <div className="flex items-center gap-2 ml-5">
                             <Checkbox 
                               id="multiply-platter-edit" 
                               checked={editMultiplyByPlatter} 
                               onCheckedChange={(c) => {
                                 setEditMultiplyByPlatter(!!c);
                                 if (editAutoFillCad && (editOpen as any).cadProjectId) applyCadDataEdit((editOpen as any).cadProjectId, !!c, (editOpen as any).piecesPerPlatter || 1);
                               }} 
                               disabled={!editAutoFillCad}
                             />
                             <Label htmlFor="multiply-platter-edit" className={`text-[10px] cursor-pointer leading-tight ${editAutoFillCad ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>Multiplicar estos valores por Pzs/Cama</Label>
                           </div>
                         </div>
                      </div>

                      <div className="space-y-2 pt-2 md:pt-0">
                        <Label>Pieza a fabricar</Label>
                        <Input value={editOpen.name} onChange={e => setEditOpen({...editOpen!, name: e.target.value})} />
                      </div>
                      <div className="space-y-2 pt-2 md:pt-0">
                        <Label>Material Requerido</Label>
                        <Select value={editOpen.material || "Cualquiera"} onValueChange={(v) => setEditOpen({...editOpen!, material: v === "Cualquiera" ? undefined : v})}>
                          <SelectTrigger><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cualquiera">Cualquiera / Sin restricción</SelectItem>
                            {Object.keys(MATERIAL_DENSITIES).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Descripción / Notas (Opcional)</Label>
                      <Textarea value={editOpen.description || ""} onChange={e => setEditOpen({...editOpen!, description: e.target.value})} rows={2} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Especificaciones y Meta</CardTitle></CardHeader>
                  <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Peso p/p (g)</Label>
                        {renderCalculatorPopover((w) => setEditOpen({...editOpen!, weightPerPiece: w}))}
                      </div>
                      <Input type="number" min="1" value={editOpen.weightPerPiece || ""} onChange={e => setEditOpen({...editOpen!, weightPerPiece: e.target.value ? Number(e.target.value) : undefined})} placeholder="Ej. 150" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pzs/Cama</Label>
                      <Input type="number" min="1" value={(editOpen as any).piecesPerPlatter || 1} onChange={e => {
                        const val = Number(e.target.value);
                        setEditOpen({...editOpen!, piecesPerPlatter: val} as any);
                        if ((editOpen as any).cadProjectId && editAutoFillCad && editMultiplyByPlatter) applyCadDataEdit((editOpen as any).cadProjectId, true, val || 1);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Días (d)</Label>
                      <Input type="number" min="0" value={editOpen.printTimeMinutes !== undefined ? Math.floor(editOpen.printTimeMinutes / 1440) : ""} onChange={e => {
                        const days = Number(e.target.value);
                        const hrs = editOpen.printTimeMinutes ? Math.floor((editOpen.printTimeMinutes % 1440) / 60) : 0;
                        const mins = editOpen.printTimeMinutes ? editOpen.printTimeMinutes % 60 : 0;
                        setEditOpen({...editOpen!, printTimeMinutes: (days * 1440) + (hrs * 60) + mins});
                      }} placeholder="Ej. 1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Horas p/p</Label>
                      <Input type="number" min="0" value={editOpen.printTimeMinutes !== undefined ? Math.floor((editOpen.printTimeMinutes % 1440) / 60) : ""} onChange={e => {
                        const days = editOpen.printTimeMinutes ? Math.floor(editOpen.printTimeMinutes / 1440) : 0;
                        const hrs = Number(e.target.value);
                        const mins = editOpen.printTimeMinutes ? editOpen.printTimeMinutes % 60 : 0;
                        setEditOpen({...editOpen!, printTimeMinutes: (days * 1440) + (hrs * 60) + mins});
                      }} placeholder="Ej. 10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Min extra</Label>
                      <Input type="number" min="0" max="59" value={editOpen.printTimeMinutes !== undefined ? editOpen.printTimeMinutes % 60 : ""} onChange={e => {
                        const days = editOpen.printTimeMinutes ? Math.floor(editOpen.printTimeMinutes / 1440) : 0;
                        const hrs = editOpen.printTimeMinutes ? Math.floor((editOpen.printTimeMinutes % 1440) / 60) : 0;
                        const mins = Number(e.target.value);
                        setEditOpen({...editOpen!, printTimeMinutes: (days * 1440) + (hrs * 60) + mins});
                      }} placeholder="Ej. 30" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cuota</Label>
                      <Input type="number" min="1" value={editOpen.targetPieces} onChange={e => setEditOpen({...editOpen!, targetPieces: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Límite</Label>
                      <Input type="date" value={editOpen.deadline.slice(0, 10)} onChange={e => setEditOpen({...editOpen!, deadline: new Date(e.target.value + "T23:59:59").toISOString()})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ensamble</Label>
                      <Input value={(editOpen as any).assemblyGroup || ""} onChange={e => setEditOpen({...editOpen!, assemblyGroup: e.target.value} as any)} placeholder="Opcional" />
                    </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-amber-500/20 shadow-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                      <Label className="mb-2 block">Estado de la Orden</Label>
                      <Select value={editOpen.status} onValueChange={(v: any) => setEditOpen({...editOpen!, status: v})}>
                        <SelectTrigger className="w-full font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En Progreso">En Progreso</SelectItem>
                          <SelectItem value="Pausada">Pausada</SelectItem>
                          <SelectItem value="Impreso (A Post-Proceso)">Impreso (A Post-Proceso)</SelectItem>
                          <SelectItem value="Quitando Soportes">Quitando Soportes</SelectItem>
                          <SelectItem value="Acabado (Lijado/Pintura)">Acabado (Lijado/Pintura)</SelectItem>
                          <SelectItem value="Completada">Completada</SelectItem>
                          <SelectItem value="Cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 sm:p-6 bg-background border-t shrink-0 flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(editOpen!.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar Orden
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(null)}>Cancelar</Button>
              <Button onClick={handleEdit} className="bg-amber-500 hover:bg-amber-600 text-white">Guardar Cambios</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL REPORTAR MERMA */}
      <Dialog open={!!reportFailure} onOpenChange={(o) => !o && !isReporting && setReportFailure(null)}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Reportar Merma (Fallo)</DialogTitle>
             <DialogDescription>Registra el fallo fotográficamente y clasifícalo para el análisis de rendimiento.</DialogDescription>
           </DialogHeader>
           <div className="grid gap-4 py-4">
              <div className="space-y-2">
                 <Label>Razón del fallo</Label>
                 <Select value={failReason} onValueChange={setFailReason}>
                   <SelectTrigger><SelectValue placeholder="Selecciona el motivo" /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="Spaghetti (Pérdida de capa)">Spaghetti (Pérdida de capa)</SelectItem>
                      <SelectItem value="Capa Desplazada (Layer Shift)">Capa Desplazada (Layer Shift)</SelectItem>
                      <SelectItem value="Warping (Despegado de cama)">Warping (Despegado de cama)</SelectItem>
                      <SelectItem value="Fallo de Adhesión (Primera capa)">Fallo de Adhesión (Primera capa)</SelectItem>
                      <SelectItem value="Extrusor Atascado / Under-extrusion">Extrusor Atascado / Under-extrusion</SelectItem>
                      <SelectItem value="Pieza rota al extraer">Pieza rota al extraer</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2">
                 <Label>Cantidad de piezas perdidas</Label>
                 <Input type="number" min="1" value={failAmount} onChange={e => setFailAmount(Number(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                 <Label>Fotografía de la merma (Opcional)</Label>
                 <div className="flex items-center gap-3 border p-2 rounded bg-muted/20">
                   <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("fail-photo-upload")?.click()}>
                     <Camera className="h-4 w-4 mr-2" /> {failPhoto ? "Cambiar Foto" : "Subir Foto"}
                   </Button>
                   {failPhoto && <span className="text-xs text-muted-foreground truncate flex-1">{failPhoto.name}</span>}
                   <input id="fail-photo-upload" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                     if (e.target.files && e.target.files.length > 0) setFailPhoto(e.target.files[0]);
                   }} />
                 </div>
              </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setReportFailure(null)} disabled={isReporting}>Cancelar</Button>
             <Button variant="destructive" onClick={submitFailure} disabled={isReporting || !failReason}>
               {isReporting ? "Registrando..." : "Archivar Merma"}
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* MODAL VER HISTORIAL DE MERMAS */}
      <Dialog open={!!viewFailures} onOpenChange={(o) => !o && setViewFailures(null)}>
         <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Historial de Mermas y Fallos</DialogTitle>
              <DialogDescription>Catálogo visual de fallos en la orden "{viewFailures?.name}".</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
               {viewFailures?.failures && viewFailures.failures.length > 0 ? (
                  <div className="space-y-3 p-1">
                     {viewFailures.failures.map((f, i) => (
                        <div key={f.id || i} className="flex gap-3 border rounded-lg p-3 bg-muted/20">
                           {f.photoUrl ? (<a href={typeof f.photoUrl === 'string' ? f.photoUrl : (f.photoUrl as any).url} target="_blank" rel="noreferrer" className="shrink-0"><img src={typeof f.photoUrl === 'string' ? f.photoUrl : (f.photoUrl as any).url} alt="Fallo" className="h-16 w-16 object-cover rounded border shadow-sm" /></a>) : (<div className="h-16 w-16 rounded border bg-muted flex items-center justify-center shrink-0"><Camera className="h-6 w-6 text-muted-foreground opacity-30" /></div>)}
                           <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <p className="text-sm font-bold text-rose-600 truncate">{f.reason}</p>
                              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{new Date(f.date).toLocaleString()}</p>
                              <Badge variant="outline" className="mt-1.5 w-max h-5 text-[10px] bg-rose-50 text-rose-700 border-rose-200">{f.amount} pieza(s) perdida(s)</Badge>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (<p className="text-center text-sm text-muted-foreground py-8">No hay registros detallados.</p>)}
            </ScrollArea>
         </DialogContent>
      </Dialog>

      {/* MODAL ADMINISTRAR TURNOS */}
      <Dialog open={manageOperatorsOpen} onOpenChange={setManageOperatorsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Administrar Turnos / Operarios</DialogTitle>
            <DialogDescription>
              Edita el nombre de los turnos o elimínalos. Los cambios se reflejarán en el historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
             {operators.map(op => (
               <div key={op} className="flex items-center gap-2">
                 <Input 
                   defaultValue={op} 
                   onBlur={(e) => {
                     const val = e.target.value.trim();
                     if (val && val !== op && !operators.includes(val)) {
                       updateOperator(op, val);
                       toast.success("Turno actualizado");
                     } else if (val === "") {
                       e.target.value = op;
                     } else if (val !== op && operators.includes(val)) {
                       toast.error("El turno ya existe");
                       e.target.value = op;
                     }
                   }}
                 />
                 <Button variant="ghost" size="icon" className="text-destructive shrink-0 hover:bg-destructive/10" onClick={() => {
                    if (operators.length <= 1) { toast.error("Debe quedar al menos un turno"); return; }
                    removeOperator(op); toast.success("Turno eliminado");
                 }}><Trash2 className="h-4 w-4" /></Button>
               </div>
             ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL ARCHIVOS DE FABRICACION */}
      <Dialog open={!!viewFilesProject} onOpenChange={(o) => !o && setViewFilesProject(null)}>
         <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-muted/10">
            <DialogHeader className="p-4 bg-card border-b shadow-sm">
              <DialogTitle className="flex items-center gap-2 text-indigo-600"><Box className="h-5 w-5" /> Archivos de Fabricación</DialogTitle>
              <DialogDescription>Descarga los G-Codes o previsualiza los modelos 3D listos para impresión.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[500px]">
               <div className="p-4 space-y-3">
                 {(() => {
                   const p = cadProjects.find((x: any) => x.id === viewFilesProject);
                   if (!p || !p.versions || p.versions.length === 0) return <div className="text-center py-8 text-muted-foreground">Este proyecto no tiene archivos subidos.</div>;
                   const parts = p.versions.filter((v: any) => !v.description?.startsWith("Vínculo de accesorio:"));
                   const bom = p.versions.filter((v: any) => v.description?.startsWith("Vínculo de accesorio:"));
                   
                   return (
                     <>
                       {parts.length > 0 && (
                         <>
                           <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Modelos y G-Codes</h4>
                           {parts.map((file: any) => {
                             const isModel = file.fileName.match(/\.(stl|obj|3mf|step)$/i);
                             const isGcode = file.fileName.match(/\.(gcode)$/i);
                             const isImg = file.fileName.match(/\.(jpeg|jpg|png|webp)$/i);
                             return (
                               <div key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                 <div className="flex items-center gap-3 flex-1 min-w-0">
                                   {isImg ? <FileImage className="h-8 w-8 text-sky-500" /> : isGcode ? <FileCode className="h-8 w-8 text-emerald-500" /> : isModel ? <Box className="h-8 w-8 text-indigo-500" /> : <FileIcon className="h-8 w-8 text-slate-500" />}
                                   <div className="flex-1 min-w-0">
                                     <p className="text-sm font-semibold truncate" title={file.fileName}>{file.fileName}</p>
                                     <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                       v{file.version}.0 <span className="opacity-50">•</span> {new Date(file.uploadedAt).toLocaleDateString()}
                                     </p>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                   {(isModel || isImg) && <Button size="sm" variant="secondary" className="h-8 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700" onClick={() => setPreviewVersion(file)}><Eye className="h-3.5 w-3.5 mr-1.5"/> Ver 3D</Button>}
                                   <Button size="sm" className="h-8 text-xs" onClick={() => { const url = typeof file.url === 'string' ? file.url : (file.url as any)?.url; window.open(url, '_blank'); }}><Download className="h-3.5 w-3.5 mr-1.5"/> Bajar</Button>
                                 </div>
                               </div>
                             );
                           })}
                         </>
                       )}
                       
                       {bom.length > 0 && (
                         <>
                           <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Lista de Materiales (BOM) / Accesorios</h4>
                           {bom.map((file: any) => {
                             return (
                               <div key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/30 p-2.5 rounded-lg border border-dashed hover:shadow-sm transition-shadow">
                                 <div className="flex items-center gap-3 flex-1 min-w-0">
                                   <div className="h-8 w-8 rounded bg-background border flex items-center justify-center shrink-0">
                                     <Box className="h-4 w-4 text-indigo-400" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <p className="text-sm font-semibold truncate" title={file.fileName}>{file.fileName}</p>
                                     <p className="text-[10px] text-muted-foreground truncate" title={file.description}>{file.description}</p>
                                   </div>
                                 </div>
                               </div>
                             );
                           })}
                         </>
                       )}
                     </>
                   );
                 })()}
               </div>
            </ScrollArea>
         </DialogContent>
      </Dialog>

      {/* VISOR 3D FLOTANTE */}
      <Dialog open={!!previewVersion} onOpenChange={o => !o && setPreviewVersion(null)}>
        <DialogContent className="sm:max-w-4xl h-[80vh] p-0 flex flex-col overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b shrink-0 bg-card z-10"><DialogTitle className="text-indigo-500">{previewVersion?.fileName}</DialogTitle></DialogHeader>
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-900">{previewVersion && <StlViewer url={previewVersion.url} className="w-full h-full" />}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}