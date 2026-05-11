import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { PageGuard } from "@/components/page-guard";
import { useProjects, type ProjectType, type Project, type ProjectAttachment } from "@/stores/projects";
import { useClients } from "@/stores/clients";
import { useQuotes } from "@/stores/quotes";
import { useSettings } from "@/stores/settings";
import { useActiveTask, requestActivateProject, clearActiveTask } from "@/stores/active-task";
import { useInventory } from "@/stores/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HardHat, Plus, Search, FileText, Wrench, MapPin, UploadCloud, X, Building, User, Mail, Phone, Copy, Download, Trash2, File, Paperclip, EyeOff, Eye, Save, Loader2, Link as LinkIcon, Unlink, DollarSign, Play, Square, Kanban, CalendarDays, Pencil, Package, BarChartHorizontal, MoreHorizontal, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";

function RadialMenuOverlay({
  open,
  coords,
  onClose,
  actions,
}: {
  open: boolean;
  coords: { x: number; y: number };
  onClose: () => void;
  actions: { label: string; icon: React.ReactNode; onClick: () => void; color?: string; disabled?: boolean; isPrimary?: boolean; }[];
}) {
  if (!open || typeof document === "undefined") return null;
  const validActions = actions.filter((a) => !a.disabled);
  const sortedActions = [...validActions].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/20 backdrop-blur-[1px] animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); onClose(); }} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      {sortedActions.map((a, i) => {
        const angle = (i / sortedActions.length) * 360 - 90;
        const radius = 75;
        const x = coords.x + Math.cos((angle * Math.PI) / 180) * radius;
        const y = coords.y + Math.sin((angle * Math.PI) / 180) * radius;
        const sizeClass = a.isPrimary ? "h-14 w-14" : "h-11 w-11";
        const iconWrapperClass = a.isPrimary ? "[&>svg]:h-6 [&>svg]:w-6" : "";
        return (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center animate-in zoom-in duration-300 hover:z-50" style={{ left: x, top: y, animationFillMode: "both", animationDelay: `${i * 15}ms` }}>
            <button type="button" aria-label={a.label} onClick={(e) => { e.stopPropagation(); a.onClick(); onClose(); }} className={`peer flex ${sizeClass} items-center justify-center rounded-full bg-background border shadow-xl transition-all hover:scale-110 ${a.color || "text-foreground hover:text-primary"}`}>
              <div className={iconWrapperClass}>{a.icon}</div>
            </button>
            <span className="pointer-events-none absolute top-[calc(100%+8px)] opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-popover/95 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md border">
              {a.label}
            </span>
          </div>
        );
      })}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform animate-in zoom-in duration-200" style={{ left: coords.x, top: coords.y }} onClick={(e) => { e.stopPropagation(); onClose(); }} title="Cerrar menú">
        <X className="h-5 w-5" />
      </div>
    </div>,
    document.body
  );
}

export const Route = createFileRoute("/proyectos")({
  component: () => (
    <PageGuard>
      <ProyectosPage />
    </PageGuard>
  ),
});

function ProyectosPage() {
  const projects = useProjects((s) => s.projects);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeModal, setActiveModal] = useState<{ type: 'edit' | 'tasks' | 'gantt' | 'quotes' | 'files' | 'materials', project: Project } | null>(null);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; project: Project | null }>({ open: false, x: 0, y: 0, project: null });
  
  const activeTask = useActiveTask((s: any) => s.active);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completado":
        return "default";
      case "En Progreso":
        return "default"; // Podría ser un color de acento
      case "Aprobado":
        return "secondary";
      case "Cancelado":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (activeModal?.type === 'gantt') {
    return <ProjectGanttView project={activeModal.project} onClose={() => setActiveModal(null)} />;
  }

  const getProjectActions = (p: Project) => {
      const isProjectActive = activeTask?.kind === 'project' && activeTask?.id === p.id;
      return [
        { label: isProjectActive ? "Detener Ejecución" : "Activar", icon: isProjectActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />, color: isProjectActive ? "text-amber-600" : "text-sky-600", isPrimary: true, onClick: async () => {
             if (isProjectActive) {
                await clearActiveTask();
                toast.success("Proyecto detenido");
             } else {
                const ok = await requestActivateProject(p.id);
                if (ok) toast.success("Proyecto en ejecución");
             }
          } },
        { label: "Gantt (Cronograma)", icon: <BarChartHorizontal className="h-4 w-4" />, color: "text-rose-500", onClick: () => setActiveModal({ type: 'gantt', project: p }) },
        { label: "Kanban (Tareas)", icon: <Kanban className="h-4 w-4" />, color: "text-orange-500", onClick: () => setActiveModal({ type: 'tasks', project: p }) },
        { label: "Presupuesto", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-500", onClick: () => setActiveModal({ type: 'quotes', project: p }) },
        { label: "Archivos", icon: <Paperclip className="h-4 w-4" />, color: "text-blue-500", onClick: () => setActiveModal({ type: 'files', project: p }) },
        { label: "Materiales", icon: <Package className="h-4 w-4" />, color: "text-purple-500", onClick: () => setActiveModal({ type: 'materials', project: p }) },
        { label: "Editar Proyecto", icon: <Pencil className="h-4 w-4" />, color: "text-muted-foreground", onClick: () => setActiveModal({ type: 'edit', project: p }) }
      ];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona levantamientos, tareas y ejecución de tus proyectos.
          </p>
        </div>
        <ProjectFormModal>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </ProjectFormModal>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card border-dashed">
          <HardHat className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No hay proyectos</h3>
          <p className="mb-4 text-sm text-muted-foreground max-w-sm">
            Aún no tienes proyectos registrados o ninguno coincide con tu búsqueda. Comienza creando uno nuevo para tu primer levantamiento.
          </p>
          <ProjectFormModal>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Crear Proyecto
            </Button>
          </ProjectFormModal>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30 cursor-pointer"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("button, input, a, label, [role='checkbox']")) return;
                let cx = e.clientX; let cy = e.clientY;
                const margin = 160;
                if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
                if (cx - margin < 0) cx = margin;
                if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
                if (cy - margin < 0) cy = margin;
                setMenuState({ open: true, x: cx, y: cy, project });
              }}
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50 rounded-full" title="Opciones" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setMenuState({ open: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, project }); }}>
                   <MoreHorizontal className="h-4 w-4" />
                 </Button>
              </div>

              <div className="space-y-3 pr-8">
                <div className="flex items-start">
                  <Badge variant={getStatusColor(project.status) as any}>
                    {project.status}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold leading-tight line-clamp-2">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.location || "Sin ubicación definida"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-4 border-t pt-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5" title="Cotizaciones vinculadas">
                    <FileText className="h-4 w-4" />
                    <span className="font-semibold">{project.quoteIds.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Tareas">
                    <Wrench className="h-4 w-4" />
                    <span className="font-semibold">{project.tasks?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Archivos adjuntos">
                    <Paperclip className="h-4 w-4" />
                    <span className="font-semibold">{project.attachments?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Materiales consumidos">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">{project.consumedMaterials?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RadialMenuOverlay open={menuState.open} coords={{ x: menuState.x, y: menuState.y }} onClose={() => setMenuState((prev) => ({ ...prev, open: false }))} actions={menuState.project ? getProjectActions(menuState.project) : []} />

      {/* Manejo de Modales Controlados */}
      <ProjectFormModal project={activeModal?.type === 'edit' ? activeModal.project : undefined} open={activeModal?.type === 'edit'} onOpenChange={(o) => !o && setActiveModal(null)} />
      {activeModal?.type === 'tasks' && <ProjectTasksModal project={activeModal.project} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}
      {activeModal?.type === 'quotes' && <ProjectQuotesModal project={activeModal.project} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}
      {activeModal?.type === 'files' && <ProjectFilesModal project={activeModal.project} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}
      {activeModal?.type === 'materials' && <ProjectMaterialsModal project={activeModal.project} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}

    </div>
  );
}

function ProjectGanttView({ project, onClose }: { project: Project, onClose: () => void }) {
  const updateProject = useProjects((s) => s.updateProject);
  
  const [editTask, setEditTask] = useState<any | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editDependency, setEditDependency] = useState("");
  
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createDependency, setCreateDependency] = useState("");

  const tasks = project.tasks || [];
  const sortedTasks = [...tasks].sort((a: any, b: any) => new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime());

  const timeline = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    
    if (sortedTasks.length > 0) {
      minDate = new Date((sortedTasks[0] as any).startDate || (sortedTasks[0] as any).createdAt);
      maxDate = new Date(Math.max(...sortedTasks.map((t: any) => new Date(t.dueDate || t.startDate || t.createdAt).getTime())));
    }
    
    // Damos espacio para respirar (7 días antes y 14 después)
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const days: Date[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    
    return { minDate, maxDate, totalDays, days };
  }, [sortedTasks]);

  const today = new Date();
  const todayOffsetPixels = ((today.getTime() - timeline.minDate.getTime()) / 86400000) * 48;

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById("today-line");
      if (el) {
        el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const openEdit = (t: any) => {
    setEditTask(t);
    setEditStart(t.startDate || new Date(t.createdAt).toISOString().split('T')[0]);
    setEditDue(t.dueDate || t.startDate || new Date(t.createdAt).toISOString().split('T')[0]);
    setEditDependency(t.dependencies?.[0] || "none");
  };

  const handleSaveDates = () => {
    if (editTask) {
      const updatedTasks = tasks.map((t: any) => t.id === editTask.id ? { ...t, startDate: editStart, dueDate: editDue, dependencies: editDependency && editDependency !== "none" ? [editDependency] : [] } : t);
      updateProject(project.id, { tasks: updatedTasks as any });
      toast.success("Fechas actualizadas");
      setEditTask(null);
      setEditDependency("");
    }
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const newTask: any = {
      id: uuid(),
      title,
      assignee,
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate,
      dependencies: createDependency && createDependency !== "none" ? [createDependency] : [],
      status: "Pendiente",
      createdAt: new Date().toISOString()
    };
    updateProject(project.id, { tasks: [...tasks, newTask] as any });
    setCreateOpen(false);
    setTitle("");
    setAssignee("");
    setStartDate("");
    setDueDate("");
    setCreateDependency("");
    toast.success("Tarea agregada al cronograma");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Cabecera */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-rose-600">
              <BarChartHorizontal className="h-6 w-6" /> Cronograma de Tareas
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Proyecto: {project.name}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Nueva Tarea
        </Button>
      </div>

      {/* Contenedor del Gantt */}
      <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col min-h-0">
        {sortedTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
            <BarChartHorizontal className="h-16 w-16 mb-4" />
            <p className="text-lg">No hay tareas técnicas registradas.</p>
            <p className="text-sm mt-1">Usa el botón superior para crear tareas y armar tu cronograma.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-background flex flex-col relative pb-10" id="gantt-scroll-container">
            {/* Encabezado Fijo (Sticky) */}
            <div className="flex border-b bg-muted/40 sticky top-0 z-40 shadow-sm w-max min-w-full">
                <div className="w-72 shrink-0 border-r p-3 flex flex-col justify-end bg-card sticky left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Listado de Tareas</span>
                </div>
                <div className="flex-1 flex relative">
                  {timeline.days.map((d, i) => {
                    const isToday = d.toDateString() === today.toDateString();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} className={`w-[48px] shrink-0 border-r flex flex-col items-center justify-center py-2 ${isWeekend ? 'bg-muted/50' : 'bg-card'} ${isToday ? 'bg-rose-500/10' : ''}`}>
                        <span className={`text-[10px] uppercase font-bold ${isToday ? 'text-rose-600' : 'text-muted-foreground'}`}>{d.toLocaleDateString('es', { weekday: 'narrow' })}</span>
                        <span className={`text-xs font-black ${isToday ? 'text-rose-600' : 'text-foreground'}`}>{d.getDate()}</span>
                      </div>
                    );
                  })}
                </div>
            </div>

            {/* Cuerpo de la Cuadrícula */}
            <div className="flex w-max min-w-full relative">
                {/* Panel Izquierdo Fijo */}
                <div className="w-72 shrink-0 flex flex-col border-r bg-card sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                   {sortedTasks.map((t: any, i) => {
                      const tStart = new Date(t.startDate || t.createdAt);
                      const tEnd = new Date(t.dueDate || t.startDate || t.createdAt);
                      const durationDays = Math.max(1, Math.ceil((tEnd.getTime() - tStart.getTime()) / 86400000) + 1);
                      return (
                        <div key={t.id} className="h-[56px] border-b p-3 flex flex-col justify-center">
                          <span className="font-semibold text-sm truncate" title={t.title}>{t.title}</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px] font-medium">{t.assignee || "Sin asignar"} • {durationDays}d</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 shadow-none font-mono">{t.status}</Badge>
                          </div>
                        </div>
                      );
                   })}
                </div>

                {/* Área del Grid y Barras (Derecha) */}
                <div className="flex-1 relative" style={{ width: timeline.totalDays * 48, height: sortedTasks.length * 56 }}>
                   {/* Líneas de Fondo */}
                   <div className="absolute inset-0 flex pointer-events-none z-0">
                      {timeline.days.map((d, i) => <div key={i} className="w-[48px] shrink-0 border-r border-b border-muted/20" />)}
                   </div>

                   {/* Lienzo SVG para Conectores (Flechas) */}
                   <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <defs>
                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
                        </marker>
                      </defs>
                      {sortedTasks.reduce((acc: any[], t: any, i: number) => {
                         const deps = (t.dependencies || []).map((depId: string) => {
                            const parentIdx = sortedTasks.findIndex((st: any) => st.id === depId);
                            if (parentIdx === -1) return null;
                            const parentT = sortedTasks[parentIdx] as any;

                            const pStartOffset = Math.floor((new Date(parentT.startDate || parentT.createdAt).getTime() - timeline.minDate.getTime()) / 86400000);
                            const pDuration = Math.max(1, Math.ceil((new Date(parentT.dueDate || parentT.startDate).getTime() - new Date(parentT.startDate || parentT.createdAt).getTime()) / 86400000) + 1);
                            const pColEnd = Math.max(1, pStartOffset + 1) + pDuration - 1;

                            const cStartOffset = Math.floor((new Date(t.startDate || t.createdAt).getTime() - timeline.minDate.getTime()) / 86400000);
                            const cColStart = Math.max(1, cStartOffset + 1);

                            const pX = pColEnd * 48;
                            const pY = parentIdx * 56 + 28;
                            const cX = (cColStart - 1) * 48;
                            const cY = i * 56 + 28;

                            // Dibuja conectores "Codo" de 90 grados
                            let d = "";
                            if (cX >= pX + 16) {
                               d = `M ${pX} ${pY} L ${pX + 8} ${pY} L ${pX + 8} ${cY} L ${cX - 4} ${cY}`;
                            } else {
                               d = `M ${pX} ${pY} L ${pX + 8} ${pY} L ${pX + 8} ${pY + 28} L ${cX - 12} ${pY + 28} L ${cX - 12} ${cY} L ${cX - 4} ${cY}`;
                            }

                            return <path key={`${t.id}-${depId}`} d={d} className="text-slate-400 dark:text-slate-500" stroke="currentColor" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />;
                         }).filter(Boolean);
                         return acc.concat(deps);
                      }, [])}
                   </svg>

                   {/* Contenedor CSS Grid para Barras de Tarea */}
                   <div className="absolute inset-0 grid z-20" style={{ gridTemplateColumns: `repeat(${timeline.totalDays}, 48px)`, gridTemplateRows: `repeat(${sortedTasks.length}, 56px)` }}>
                      {sortedTasks.map((t: any, i) => {
                         const startOffset = Math.floor((new Date(t.startDate || t.createdAt).getTime() - timeline.minDate.getTime()) / 86400000);
                         const duration = Math.max(1, Math.ceil((new Date(t.dueDate || t.startDate).getTime() - new Date(t.startDate || t.createdAt).getTime()) / 86400000) + 1);
                         const colStart = Math.max(1, startOffset + 1);
                         const colEnd = colStart + duration;

                         let colorClass = "bg-slate-500";
                         let lightClass = "bg-slate-300";
                         if (t.status === "En Progreso") { colorClass = "bg-blue-600"; lightClass = "bg-blue-400"; }
                         if (t.status === "Completado") { colorClass = "bg-emerald-600"; lightClass = "bg-emerald-400"; }

                         return (
                            <div 
                               key={t.id} 
                               className="relative flex items-center mt-3 h-8 cursor-pointer group"
                               style={{ gridColumn: `${colStart} / ${colEnd}`, gridRow: i + 1 }}
                               onClick={() => openEdit(t)}
                            >
                               {/* Gradiente Bitono */}
                               <div className="absolute inset-0 flex rounded-md overflow-hidden shadow-sm hover:scale-[1.02] transition-transform">
                                  <div className={`w-[70%] ${colorClass}`} />
                                  <div className={`w-[30%] ${lightClass} opacity-80`} />
                               </div>
                               <span className="relative z-10 px-2 text-[11px] font-semibold text-white truncate drop-shadow-md">
                                  {t.title}
                               </span>

                               {/* Avatar del Recurso */}
                               {t.assignee && (
                                 <div className="absolute top-1/2 -translate-y-1/2 -right-3 h-6 w-6 rounded-full bg-card border flex items-center justify-center shadow-sm z-30 translate-x-full" title={t.assignee}>
                                   <span className="text-[9px] font-bold text-muted-foreground">{t.assignee.substring(0,2).toUpperCase()}</span>
                                 </div>
                               )}
                            </div>
                         );
                      })}
                   </div>

                   {/* Línea de Hoy */}
                   {todayOffsetPixels >= 0 && (
                     <div id="today-line" className="absolute top-0 bottom-0 w-px bg-rose-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(225,29,72,0.6)]" style={{ left: `${todayOffsetPixels}px` }} />
                   )}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Rápido de Fechas */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reprogramar Tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de entrega</Label>
              <Input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Depende de (Opcional)</Label>
              <Select value={editDependency} onValueChange={setEditDependency}>
                <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {sortedTasks.filter((st: any) => st.id !== editTask?.id).map((st: any) => (
                     <SelectItem key={st.id} value={st.id}>{st.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)}>Cancelar</Button>
            <Button onClick={handleSaveDates} className="bg-rose-600 hover:bg-rose-700 text-white">Actualizar Fechas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido Nueva Tarea */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Nueva Tarea en Gantt</DialogTitle>
            <DialogDescription>Añade una tarea directamente al cronograma del proyecto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título de la tarea</Label>
              <Input placeholder="Ej. Prueba de cableado" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Responsable</Label>
                <Input placeholder="Nombre del técnico" value={assignee} onChange={e => setAssignee(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de fin</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Depende de (Opcional)</Label>
                <Select value={createDependency} onValueChange={setCreateDependency}>
                  <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {sortedTasks.map((st: any) => (
                       <SelectItem key={st.id} value={st.id}>{st.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!title.trim()} className="bg-rose-600 hover:bg-rose-700 text-white">Crear Tarea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectMaterialsModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = open !== undefined ? onOpenChange! : setInternalOpen;
  const updateProject = useProjects(s => s.updateProject);
  const products = useInventory(s => s.products);
  const updateProduct = useInventory(s => s.update);
  const settings = useSettings(s => s.settings);

  const materials = project.consumedMaterials || [];
  const totalCost = materials.reduce((acc, m: any) => acc + ((m.quantity || 0) * (m.unitCost || 0)), 0);

  const removeMaterial = (m: any) => {
    // Retornamos el stock al inventario general
    if ((settings as any).inventory?.enableStock) {
      const p = products.find(x => x.id === m.productId);
      if (p) {
        updateProduct(p.id, { stock: (p.stock || 0) + m.quantity } as any);
      }
    }
    updateProject(project.id, {
      consumedMaterials: materials.filter((x: any) => x.id !== m.id) as any
    });
    toast.success("Material devuelto al inventario general");
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b bg-background shrink-0">
          <DialogTitle className="flex items-center gap-2 text-purple-600">
            <Package className="h-5 w-5" />
            Materiales Consumidos: {project.name}
          </DialogTitle>
          <DialogDescription>
            Materiales que han sido descontados de tu almacén para este proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-purple-500/10 border-b p-4 sm:px-6 shrink-0 flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-0.5">Costo de Materiales</p>
            <p className="text-3xl font-black text-purple-800 tracking-tight">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalCost)}
            </p>
          </div>
          <div className="h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0">
             <Package className="h-6 w-6 text-purple-700" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
           {materials.length === 0 ? (
             <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/10">
               <Package className="h-8 w-8 mb-3 opacity-20" />
               <p className="text-sm font-medium">No hay materiales consumidos</p>
               <p className="text-xs mt-1 max-w-[250px] mx-auto">Activa el proyecto y ve al módulo de Inventario para empezar a descontar materiales.</p>
             </div>
           ) : (
             <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Costo U.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <p className="font-medium text-sm leading-tight">{m.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{m.sku}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(m.unitCost || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((m.unitCost || 0) * m.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeMaterial(m)} title="Devolver al inventario">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectQuotesModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
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

function ProjectFilesModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const updateProject = useProjects((s) => s.updateProject);
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = open !== undefined ? onOpenChange! : setInternalOpen;

  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ProjectAttachment[]>([]);
  const [saving, setSaving] = useState(false);

  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set());
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [activeFile, setActiveFile] = useState<{ url: string, type: string, name: string, id?: string, isNew?: boolean, index?: number } | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'existing' | 'new' | 'bulk' | null>(null);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const [showPreview, setShowPreview] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const uploadFilesFn = useServerFn(uploadProjectFiles);

  useEffect(() => {
    if (dialogOpen) {
      setPhotos([]);
      setExistingPhotos(() => {
        return (project.attachments || []).map((att: any) => {
          if (typeof att === 'string') {
            const ext = att.split('.').pop() || '';
            let t = 'application/octet-stream';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase())) t = `image/${ext}`;
            if (ext.toLowerCase() === 'pdf') t = 'application/pdf';
            return { id: uuid(), url: att, name: att.split('/').pop() || 'Archivo', type: t, createdAt: project.createdAt };
          }
          return att;
        });
      });
      setSelectedExisting(new Set());
      setSelectedNew(new Set());
      setActiveFile(null);
    }
  }, [dialogOpen, project]);

  const combinedFiles = useMemo(() => {
    const arr = [
      ...existingPhotos.map(att => ({ ...att, isNew: false, rawDate: att.createdAt ? new Date(att.createdAt).getTime() : 0 })),
      ...photos.map((f, i) => ({ 
         id: `new-${i}`, 
         url: URL.createObjectURL(f), 
         name: f.name, 
         type: f.type, 
         isNew: true, 
         index: i, 
         rawDate: Date.now() + i
      }))
    ];

    const filtered = arr.filter(f => {
       if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
       if (filterType === 'image' && !f.type.startsWith('image/')) return false;
       if (filterType === 'pdf' && f.type !== 'application/pdf') return false;
       return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'newest') return b.rawDate - a.rawDate;
      if (sortBy === 'oldest') return a.rawDate - b.rawDate;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });

    return filtered;
  }, [existingPhotos, photos, searchQuery, filterType, sortBy]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPhotos([...photos, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const toggleExisting = (id: string) => {
    setSelectedExisting(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNew = (index: number) => {
    setSelectedNew(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleBulkDownload = () => {
    selectedExisting.forEach(id => {
       const att = existingPhotos.find(x => x.id === id);
       if (att) {
         const a = document.createElement("a");
         a.href = att.url;
         a.download = att.name;
         a.click();
       }
    });
    selectedNew.forEach(idx => {
       const file = photos[idx];
       if (file) {
         const a = document.createElement("a");
         a.href = URL.createObjectURL(file);
         a.download = file.name;
         a.click();
       }
    });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget === 'bulk') {
      setExistingPhotos(prev => prev.filter(x => !selectedExisting.has(x.id)));
      setPhotos(prev => prev.filter((_, i) => !selectedNew.has(i)));
      setSelectedExisting(new Set());
      setSelectedNew(new Set());
      setActiveFile(null);
      toast.success("Archivos eliminados");
    } else if (deleteTarget === 'existing') {
      setExistingPhotos(prev => prev.filter(x => x.id !== deleteId));
      selectedExisting.delete(deleteId as string);
      setSelectedExisting(new Set(selectedExisting));
      if (activeFile?.id === deleteId) setActiveFile(null);
      toast.success("Archivo eliminado");
    } else if (deleteTarget === 'new') {
      setPhotos(prev => prev.filter((_, i) => i !== deleteId));
      selectedNew.delete(deleteId as number);
      setSelectedNew(new Set(selectedNew));
      if (activeFile?.isNew && activeFile?.index === deleteId) setActiveFile(null);
      toast.success("Archivo eliminado");
    }
    setDeleteConfirmOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    let uploadedAttachments: any[] = [...existingPhotos];

    if (photos.length > 0) {
      const toastId = toast.loading("Subiendo nuevos archivos...");
      try {
        const filesData = await Promise.all(
          photos.map((f) => {
            return new Promise<{ name: string; type: string; base64: string; size: number }>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({ name: f.name, type: f.type, base64: reader.result as string, size: f.size });
              reader.readAsDataURL(f);
            });
          })
        );
        
        const res = await uploadFilesFn({ data: { files: filesData } });
        if (res.ok) {
           uploadedAttachments = [...uploadedAttachments, ...res.data];
           toast.success("Archivos guardados con éxito", { id: toastId });
        } else {
           toast.error("Error al guardar archivos en el servidor", { id: toastId });
        }
      } catch(e) {
        toast.error("Error de conexión al subir archivos", { id: toastId });
      }
    }

    updateProject(project.id, { attachments: uploadedAttachments });
    if (photos.length === 0) toast.success("Cambios aplicados");
    setSaving(false);
    setDialogOpen(false);
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-full !max-w-full !h-[100dvh] !max-h-[100dvh] !rounded-none !border-0 flex flex-col p-0 overflow-hidden sm:!top-[50%] sm:!left-[50%] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!w-[95vw] sm:!max-w-[95vw] sm:!h-[95vh] sm:!max-h-[95vh] sm:!border sm:!rounded-xl">
          <DialogHeader className="p-3 sm:p-4 border-b shrink-0 bg-background z-10 flex flex-col sm:flex-row items-start justify-between gap-1 sm:gap-4">
            <div className="min-w-0 w-full text-left pr-8">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl min-w-0">
                <Paperclip className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Explorador: {project.name}</span>
              </DialogTitle>
              <DialogDescription className="truncate mt-0.5 sm:mt-1 text-xs sm:text-sm">
                Busca, filtra, visualiza y gestiona todos los documentos.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-3 border-b shrink-0 bg-muted/30 flex flex-col gap-2 z-10 sm:flex-row sm:items-center sm:justify-between">
             <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
               <div className="relative w-full sm:w-64 shrink-0">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Buscar archivos..."
                   className="pl-8 bg-background h-9 w-full"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               <div className="flex w-full sm:w-auto gap-2">
                 <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 flex-1 sm:w-[130px] bg-background">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="image">Imágenes</SelectItem>
                      <SelectItem value="pdf">PDFs</SelectItem>
                    </SelectContent>
                 </Select>
                 <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 flex-1 sm:w-[150px] bg-background">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Más recientes</SelectItem>
                      <SelectItem value="oldest">Más antiguos</SelectItem>
                      <SelectItem value="name_asc">Nombre (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Nombre (Z-A)</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
             </div>
             <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
               <Button variant="outline" size="sm" className="h-9 hidden sm:flex" onClick={() => setShowPreview(!showPreview)}>
                 {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                 {showPreview ? "Ocultar visor" : "Mostrar visor"}
               </Button>
               <Button onClick={handleSave} disabled={saving} className="h-9 font-semibold shadow-sm w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar cambios
               </Button>
             </div>
          </div>

          <div className="flex-1 flex overflow-hidden bg-muted/10 relative">
            {/* Panel Izquierdo: Lista y Carga */}
            <div className={`${showPreview ? "w-full sm:w-[320px] md:w-[380px] border-r" : "flex-1"} shrink-0 flex flex-col bg-background relative z-10 transition-all duration-300`}>
              <ScrollArea className="flex-1" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                <div className={showPreview ? "p-4 space-y-4" : "flex flex-col h-full"}>
                  <div
                    className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors relative bg-muted/20 ${showPreview ? '' : 'm-4 mb-2'}`}
                  >
                    <Input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                    <UploadCloud className="h-6 w-6 text-primary mb-2" />
                    <p className="text-xs font-medium">Suelta o haz clic para subir nuevos archivos</p>
                  </div>

                  <div className={`flex items-center justify-between ${showPreview ? '' : 'px-4 pt-2'}`}>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Resultados ({combinedFiles.length})</Label>
                    {(selectedExisting.size > 0 || selectedNew.size > 0) && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={handleBulkDownload}>
                          <Download className="mr-1 h-3 w-3" /> ({selectedExisting.size + selectedNew.size})
                        </Button>
                        <Button variant="destructive" size="sm" className="h-6 px-2 text-[10px]" onClick={() => { setDeleteTarget('bulk'); setDeleteConfirmOpen(true); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {combinedFiles.length > 0 ? (
                    <div className={`grid gap-2 mt-2 pb-4 ${showPreview ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 px-4"}`}>
                      {combinedFiles.map((file: any) => (
                        <FileCardCompact 
                          key={file.id} 
                          name={file.name}
                          type={file.type} 
                          url={file.url}
                          isActive={activeFile?.id === file.id || (activeFile?.isNew && activeFile?.index === file.index)}
                          selected={file.isNew ? selectedNew.has(file.index!) : selectedExisting.has(file.id as string)}
                          onSelect={() => file.isNew ? toggleNew(file.index!) : toggleExisting(file.id as string)}
                          onDelete={() => { setDeleteTarget(file.isNew ? 'new' : 'existing'); setDeleteId(file.isNew ? file.index! : file.id as string); setDeleteConfirmOpen(true); }}
                          onPreview={() => { setActiveFile({ url: file.url, type: file.type, name: file.name, id: file.id as string, isNew: file.isNew, index: file.index }); setShowPreview(true); }}
                          isNew={file.isNew}
                          date={file.isNew ? new Date().toISOString() : file.createdAt}
                          size={file.size}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-70">
                       <Search className="h-8 w-8 mb-2" />
                       <p className="text-sm">No se encontraron archivos.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Panel Derecho: Visor Pantalla Completa */}
            {showPreview && (
            <div className="hidden sm:flex flex-1 flex-col bg-muted/40 relative animate-in fade-in duration-300">
              {activeFile ? (
                <div className="flex-1 p-6 flex flex-col min-h-0">
                  <div className="flex justify-between items-center bg-card p-3 px-4 rounded-t-xl border border-b-0 shadow-sm shrink-0">
                    <span className="font-semibold truncate pr-4">{activeFile.name}</span>
                    <Button size="sm" variant="secondary" onClick={() => {
                      const a = document.createElement("a");
                      a.href = activeFile.url;
                      a.download = activeFile.name;
                      a.click();
                    }}>
                      <Download className="h-4 w-4 mr-2 text-primary"/> Descargar Original
                    </Button>
                  </div>
                  <div className="flex-1 bg-card/50 backdrop-blur-sm border rounded-b-xl overflow-hidden p-4 shadow-sm min-h-0 relative">
                    {activeFile.type.startsWith('image/') ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src={activeFile.url} alt={activeFile.name} className="max-w-full max-h-full object-contain rounded drop-shadow-md" />
                      </div>
                    ) : activeFile.type === 'application/pdf' ? (
                      <object data={activeFile.url} type="application/pdf" className="w-full h-full border-0 rounded bg-white shadow-inner">
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                          <p className="text-muted-foreground mb-4">El navegador no soporta previsualizar PDFs.</p>
                          <Button asChild><a href={activeFile.url} download={activeFile.name}>Descargar Archivo</a></Button>
                        </div>
                      </object>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          <File className="h-10 w-10 text-primary" />
                        </div>
                        <p className="text-muted-foreground mb-4 max-w-sm">
                          Este formato ({activeFile.type || "Desconocido"}) no puede previsualizarse en el navegador.
                        </p>
                        <Button onClick={() => {
                          const a = document.createElement("a");
                          a.href = activeFile.url;
                          a.download = activeFile.name;
                          a.click();
                        }}>Descargar archivo</Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground opacity-60">
                  <Paperclip className="h-20 w-20 mb-6 text-muted-foreground/30 stroke-[1px]" />
                  <p className="text-lg font-medium">Visor de Archivos</p>
                  <p className="text-sm mt-1 max-w-sm text-center">
                    Selecciona un plano, documento o imagen de la lista izquierda para visualizarlo en alta resolución.
                  </p>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Overlay de Previsualización (Solo Móviles) */}
          <div className={`sm:hidden absolute inset-0 bg-background z-50 flex flex-col transition-transform duration-300 ${activeFile ? "translate-x-0" : "translate-x-full"}`}>
             <div className="p-3 border-b flex items-center gap-2 bg-card shadow-sm shrink-0">
               <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveFile(null)}>
                  <X className="h-4 w-4" />
               </Button>
               <span className="font-semibold text-sm truncate flex-1 text-foreground">{activeFile?.name}</span>
             </div>
             <div className="flex-1 overflow-hidden bg-muted/40 p-2 flex flex-col relative">
                {activeFile?.type.startsWith('image/') ? (
                  <div className="flex-1 w-full flex items-center justify-center p-2">
                    <img src={activeFile.url} alt={activeFile.name} className="max-w-full max-h-full object-contain rounded drop-shadow-md" />
                  </div>
                ) : activeFile?.type === 'application/pdf' ? (
                  <iframe src={activeFile.url + "#toolbar=0"} className="flex-1 w-full h-full border-0 rounded bg-white shadow-inner" />
                ) : (
                  <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <File className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">Este formato no se puede previsualizar.</p>
                    <Button size="sm" onClick={() => { const a = document.createElement("a"); a.href = activeFile?.url || ''; a.download = activeFile?.name || ''; a.click(); }}><Download className="h-4 w-4 mr-2"/>Descargar</Button>
                  </div>
                )}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción removerá los archivos seleccionados de la lista. Recuerda guardar los cambios para aplicarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FileCardCompact({ name, type, url, isActive, selected, onSelect, onDelete, onPreview, isNew, date, size }: any) {
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';
  
  const formatSize = (bytes?: number) => {
    if (bytes == null) return null;
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };
  
  return (
    <div className={`relative flex items-center gap-3 p-2 rounded-lg border transition-colors group cursor-pointer ${isActive ? 'bg-primary/10 border-primary/40 shadow-sm' : selected ? 'border-primary/50 bg-card' : 'bg-card hover:bg-muted/60 hover:border-border/80'}`} onClick={onPreview}>
      <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center justify-center w-6">
        <Checkbox checked={selected} onCheckedChange={onSelect} className="data-[state=checked]:bg-primary" />
      </div>
      
      <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-background flex items-center justify-center border shadow-sm relative">
        {isImage ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : isPdf ? (
          <FileText className="h-5 w-5 text-rose-500" />
        ) : (
          <File className="h-5 w-5 text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`} title={name}>{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className={`text-[10px] uppercase font-bold tracking-wider ${isNew ? 'text-amber-500' : 'text-muted-foreground'}`}>{isNew ? "Sin Guardar" : "Guardado"}</p>
          {size && <span className="text-[10px] text-muted-foreground font-mono">{formatSize(size)}</span>}
          {date && <span className="text-[10px] text-muted-foreground font-mono">{new Date(date).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="absolute right-2 shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ProjectFormModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project?: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const addProject = useProjects((s) => s.addProject);
  const updateProject = useProjects((s) => s.updateProject);
  const clients = useClients((s) => s.clients);
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = open !== undefined ? onOpenChange! : setInternalOpen;

  const [name, setName] = useState(project?.name || "");
  const [clientId, setClientId] = useState(project?.clientId || "");
  const [type, setType] = useState<ProjectType>(project?.type || "Maquinado");
  const [location, setLocation] = useState(project?.location || "");
  const [requirements, setRequirements] = useState(project?.requirements || "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ProjectAttachment[]>(() => {
    return (project?.attachments || []).map((att: any) => {
      if (typeof att === 'string') {
        const ext = att.split('.').pop() || '';
        let t = 'application/octet-stream';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase())) t = `image/${ext}`;
        if (ext.toLowerCase() === 'pdf') t = 'application/pdf';
        return { id: uuid(), url: att, name: att.split('/').pop() || 'Archivo', type: t };
      }
      return att;
    });
  });
  const [saving, setSaving] = useState(false);

  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set());
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [previewFile, setPreviewFile] = useState<{ url: string, type: string, name: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'existing' | 'new' | 'bulk' | null>(null);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const uploadFilesFn = useServerFn(uploadProjectFiles);

  const selectedClient = clients.find((c) => c.id === clientId);

  useEffect(() => {
    if (dialogOpen) {
      setName(project?.name || "");
      setClientId(project?.clientId || "");
      setType(project?.type || "Maquinado");
      setLocation(project?.location || "");
      setRequirements(project?.requirements || "");
      setPhotos([]);
      setExistingPhotos(() => {
        return (project?.attachments || []).map((att: any) => {
          if (typeof att === 'string') {
            const ext = att.split('.').pop() || '';
            let t = 'application/octet-stream';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase())) t = `image/${ext}`;
            if (ext.toLowerCase() === 'pdf') t = 'application/pdf';
            return { id: uuid(), url: att, name: att.split('/').pop() || 'Archivo', type: t, createdAt: project?.createdAt };
          }
          return att;
        });
      });
      setSelectedExisting(new Set());
      setSelectedNew(new Set());
    }
  }, [dialogOpen, project]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPhotos([...photos, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const toggleExisting = (id: string) => {
    setSelectedExisting(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNew = (index: number) => {
    setSelectedNew(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handlePreview = (url: string, type: string, name: string) => {
    if (type.startsWith('image/') || type === 'application/pdf') {
      setPreviewFile({ url, type, name });
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
    }
  };

  const handleBulkDownload = () => {
    selectedExisting.forEach(id => {
       const att = existingPhotos.find(x => x.id === id);
       if (att) {
         const a = document.createElement("a");
         a.href = att.url;
         a.download = att.name;
         a.click();
       }
    });
    selectedNew.forEach(idx => {
       const file = photos[idx];
       if (file) {
         const a = document.createElement("a");
         a.href = URL.createObjectURL(file);
         a.download = file.name;
         a.click();
       }
    });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget === 'bulk') {
      setExistingPhotos(prev => prev.filter(x => !selectedExisting.has(x.id)));
      setPhotos(prev => prev.filter((_, i) => !selectedNew.has(i)));
      setSelectedExisting(new Set());
      setSelectedNew(new Set());
      toast.success("Archivos eliminados");
    } else if (deleteTarget === 'existing') {
      setExistingPhotos(prev => prev.filter(x => x.id !== deleteId));
      selectedExisting.delete(deleteId as string);
      setSelectedExisting(new Set(selectedExisting));
      toast.success("Archivo eliminado");
    } else if (deleteTarget === 'new') {
      setPhotos(prev => prev.filter((_, i) => i !== deleteId));
      selectedNew.delete(deleteId as number);
      setSelectedNew(new Set(selectedNew));
      toast.success("Archivo eliminado");
    }
    setDeleteConfirmOpen(false);
  };

  const handleSave = async () => {
    if (!name || !clientId) {
      toast.error("El nombre y el cliente son obligatorios");
      return;
    }

    setSaving(true);
    let uploadedAttachments: any[] = [...existingPhotos];

    // Si hay fotos seleccionadas, las subimos primero al servidor
    if (photos.length > 0) {
      const toastId = toast.loading("Subiendo archivos...");
      try {
        const filesData = await Promise.all(
          photos.map((f) => {
            return new Promise<{ name: string; type: string; base64: string; size: number }>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({ name: f.name, type: f.type, base64: reader.result as string, size: f.size });
              reader.readAsDataURL(f);
            });
          })
        );
        
        const res = await uploadFilesFn({ data: { files: filesData } });
        if (res.ok) {
           uploadedAttachments = [...uploadedAttachments, ...res.data];
           toast.success("Archivos subidos con éxito", { id: toastId });
        } else {
           toast.error("Error al guardar archivos en el servidor", { id: toastId });
        }
      } catch(e) {
        toast.error("Error de conexión al subir archivos", { id: toastId });
      }
    }

    if (project) {
      updateProject(project.id, {
        name,
        clientId,
        type,
        location,
        requirements,
        attachments: uploadedAttachments,
      });
      toast.success("Proyecto actualizado con éxito");
    } else {
      addProject({
        id: uuid(),
        name,
        clientId,
        type,
        status: "Levantamiento",
        location,
        requirements,
        attachments: uploadedAttachments, 
        quoteIds: [],
        tasks: [],
        consumedMaterials: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Proyecto creado con éxito");
    }

    setSaving(false);
    setDialogOpen(false);
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{project ? "Editar Proyecto" : "Nuevo Levantamiento"}</DialogTitle>
          <DialogDescription>
            {project ? "Modifica la información o añade nuevas fotos al levantamiento." : "Registra los requerimientos iniciales del proyecto y adjunta fotos del sitio."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Proyecto</Label>
              <Input placeholder="Ej. Automatización Nave 3" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.receiver} {c.company ? `(${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClient && (
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                 <Building className="h-4 w-4 text-primary" />
                 <span className="font-semibold text-base">{selectedClient.company || "Sin Empresa"}</span>
                 <span className="text-muted-foreground">·</span>
                 <User className="h-4 w-4 text-muted-foreground" />
                 <span className="text-muted-foreground">{selectedClient.receiver}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selectedClient.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate" title={selectedClient.email}>{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-start gap-2 text-muted-foreground col-span-2 mt-1">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="leading-tight">{selectedClient.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Proyecto</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maquinado">Maquinado</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Automatización">Automatización</SelectItem>
                  <SelectItem value="Consultoría">Consultoría</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Lugar de Instalación</span>
                {selectedClient?.address && (
                  <button
                    type="button"
                    onClick={() => setLocation(selectedClient.address)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copiar dirección
                  </button>
                )}
              </Label>
              <Input placeholder="Ej. Planta Silao" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Apuntes del Ingeniero (Requerimientos)</Label>
            <Textarea
              placeholder="Describe medidas, acciones a realizar, fallas actuales..."
              className="min-h-[100px]"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Archivos Adjuntos (Planos, fotos, documentos)</Label>
              {(selectedExisting.size > 0 || selectedNew.size > 0) && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkDownload}>
                    <Download className="mr-1.5 h-3 w-3" /> Descargar ({selectedExisting.size + selectedNew.size})
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => { setDeleteTarget('bulk'); setDeleteConfirmOpen(true); }}>
                    <Trash2 className="mr-1.5 h-3 w-3" /> Eliminar
                  </Button>
                </div>
              )}
            </div>
            
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors relative"
            >
              <Input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Haz clic o arrastra tus archivos aquí</p>
              <p className="text-xs text-muted-foreground mt-1">Soporta imágenes, PDFs y documentos variados</p>
            </div>

            {(photos.length > 0 || existingPhotos.length > 0) && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {existingPhotos.map((att) => (
                  <FileCard 
                    key={att.id} 
                    name={att.name} 
                    type={att.type} 
                    url={att.url}
                    selected={selectedExisting.has(att.id)}
                    onSelect={() => toggleExisting(att.id)}
                    onDelete={() => { setDeleteTarget('existing'); setDeleteId(att.id); setDeleteConfirmOpen(true); }}
                    onPreview={() => handlePreview(att.url, att.type, att.name)}
                  />
                ))}
                {photos.map((file, i) => (
                  <FileCard 
                    key={`new-${i}`} 
                    name={file.name} 
                    type={file.type} 
                    url={URL.createObjectURL(file)}
                    selected={selectedNew.has(i)}
                    onSelect={() => toggleNew(i)}
                    onDelete={() => { setDeleteTarget('new'); setDeleteId(i); setDeleteConfirmOpen(true); }}
                    onPreview={() => handlePreview(URL.createObjectURL(file), file.type, file.name)}
                    isNew
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Proyecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0 bg-background z-10">
          <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted relative min-h-[300px] sm:min-h-[500px] flex flex-col">
          {previewFile?.type.startsWith('image/') ? (
            <div className="flex-1 w-full flex items-center justify-center p-4">
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : previewFile?.type === 'application/pdf' ? (
            <iframe src={previewFile.url + "#toolbar=0"} className="flex-1 w-full h-full border-0 bg-white min-h-[50vh]" />
          ) : null}
        </div>
        <DialogFooter className="p-4 border-t shrink-0 bg-background z-10">
          <Button variant="outline" onClick={() => setPreviewFile(null)}>Cerrar</Button>
          <Button onClick={() => {
            const a = document.createElement("a");
            a.href = previewFile!.url;
            a.download = previewFile!.name;
            a.click();
          }}>
            <Download className="mr-2 h-4 w-4" /> Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar archivo(s)?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción removerá los archivos seleccionados del levantamiento actual.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function FileCard({ name, type, url, selected, onSelect, onDelete, onPreview, isNew }: any) {
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';
  
  return (
    <div className={`relative flex items-center gap-3 p-2.5 rounded-lg border ${selected ? 'border-primary bg-primary/5' : 'bg-card'} transition-colors group`}>
      <Checkbox checked={selected} onCheckedChange={onSelect} className="mt-1 self-start" />
      
      <div 
        className="h-10 w-10 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center cursor-pointer border hover:opacity-80 transition-opacity"
        onClick={onPreview}
      >
        {isImage ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : isPdf ? (
          <FileText className="h-5 w-5 text-rose-500" />
        ) : (
          <File className="h-5 w-5 text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPreview}>
        <p className="text-xs font-medium truncate text-foreground hover:underline" title={name}>{name}</p>
        <p className="text-[10px] text-muted-foreground uppercase">{isNew ? "Nuevo" : "Guardado"}</p>
      </div>

      <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ProjectTasksModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = open !== undefined ? onOpenChange! : setInternalOpen;
  const updateProject = useProjects((s) => s.updateProject);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const tasks = project.tasks || [];
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      const updated = tasks.map((t: any) => t.id === draggedId ? { ...t, status } : t);
      updateProject(project.id, { tasks: updated as any });
      setDraggedId(null);
    }
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const newTask = {
      id: uuid(),
      title,
      description,
      assignee,
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate,
      status: "Pendiente",
      createdAt: new Date().toISOString()
    };
    updateProject(project.id, { tasks: [...tasks, newTask] as any });
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    setAssignee("");
    setStartDate("");
    setDueDate("");
    toast.success("Tarea asignada con éxito");
  };

  const removeTask = (id: string) => {
    updateProject(project.id, { tasks: tasks.filter((t: any) => t.id !== id) as any });
    toast.success("Tarea eliminada");
  };

  const columns = ["Pendiente", "En Progreso", "Completado"];

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[1000px] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-muted/10 border-0 sm:border">
          <DialogHeader className="p-4 sm:p-6 border-b bg-background shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-orange-600 text-xl">
                <Kanban className="h-6 w-6" /> Tablero de Tareas: {project.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Kanban interactivo. Asigna técnicos y arrastra las tarjetas para cambiar su estado.
              </DialogDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto shrink-0 bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Nueva Tarea
            </Button>
          </DialogHeader>
          
          <div className="flex-1 p-4 sm:p-6 overflow-x-auto min-h-0">
            <div className="flex gap-4 sm:gap-6 h-full min-w-[850px]">
              {columns.map(col => {
                const colTasks = tasks.filter((t: any) => t.status === col || (!t.status && col === "Pendiente"));
                return (
                  <div 
                    key={col} 
                    className="flex-1 flex flex-col bg-background/50 rounded-xl border border-border/50 shadow-sm p-3 sm:p-4"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, col)}
                  >
                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        {col === "Pendiente" && <div className="h-2 w-2 rounded-full bg-slate-400" />}
                        {col === "En Progreso" && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
                        {col === "Completado" && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                        {col}
                      </h3>
                      <Badge variant="secondary" className="bg-background/80">{colTasks.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
                      <div className="space-y-3 pb-4">
                        {colTasks.map((t: any) => (
                          <div 
                            key={t.id} 
                            draggable
                            onDragStart={e => handleDragStart(e, t.id)}
                            className="bg-card rounded-lg border p-4 shadow-sm cursor-grab active:cursor-grabbing group relative hover:border-primary/40 transition-colors"
                          >
                            <div className="font-semibold text-sm pr-6 leading-tight">{t.title}</div>
                            {t.description && <div className="text-xs text-muted-foreground mt-2 line-clamp-3">{t.description}</div>}
                            
                            <div className="flex flex-wrap items-center justify-between mt-4 gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 px-2 py-1 rounded-md font-medium">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[100px]">{t.assignee || "Sin asignar"}</span>
                              </div>
                              {t.dueDate && (
                                <div className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-md ${new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && t.status !== 'Completado' ? 'bg-destructive/10 text-destructive' : 'bg-muted/60 text-muted-foreground'}`}>
                                  <CalendarDays className="h-3 w-3 shrink-0" />
                                  {new Date(t.dueDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity" onClick={() => removeTask(t.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <div className="h-24 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-xs text-muted-foreground font-medium opacity-60">
                            Arrastra tareas aquí
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Nueva Tarea Técnica</DialogTitle>
            <DialogDescription>Agrega una tarea al tablero Kanban del proyecto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título de la tarea</Label>
              <Input placeholder="Ej. Instalar cableado estructurado" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Descripción detallada</Label>
              <Textarea placeholder="Instrucciones específicas y metraje..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Responsable / Técnico</Label>
                <Input placeholder="Nombre del técnico" value={assignee} onChange={e => setAssignee(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de inicio</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha límite</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!title.trim()} className="bg-orange-600 hover:bg-orange-700 text-white">Crear Tarea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}