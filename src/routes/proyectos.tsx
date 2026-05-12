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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, Plus, Search, FileText, Wrench, MapPin, Paperclip, DollarSign, Play, Square, Kanban, CalendarDays, Pencil, Package, BarChartHorizontal, MoreHorizontal } from "lucide-react";
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
import { toast } from "sonner";
import { logAction } from "@/stores/audit-log";

import { RadialMenuOverlay } from "@/routes/radial-menu-overlay";
import { ProjectGanttView } from "@/routes/project-gantt-view";
import { ProjectMaterialsModal } from "@/routes/project-materials-modal";
import { ProjectQuotesModal } from "@/routes/project-quotes-modal";
import { ProjectFilesModal } from "@/routes/project-files-modal";
import { ProjectFormModal } from "@/routes/project-form-modal";
import { ProjectTasksModal } from "@/routes/project-tasks-modal";
import { v4 as uuid } from "uuid";

const toLocalISOString = (date?: Date) => {
  const d = date || new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const Route = createFileRoute("/proyectos")({
  component: () => (
    <PageGuard>
      <ProyectosPage />
    </PageGuard>
  ),
});

function ProyectosPage() {
  const projects = useProjects((s) => s.projects);
  const updateProject = useProjects((s) => s.updateProject);
  const quotes = useQuotes((s) => s.quotes);
  const products = useInventory((s) => s.products);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeModal, setActiveModal] = useState<{ type: 'edit' | 'tasks' | 'gantt' | 'quotes' | 'files' | 'materials', project: Project } | null>(null);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; project: Project | null }>({ open: false, x: 0, y: 0, project: null });
  
  const activeTask = useActiveTask((s: any) => s.active);
  
  // Interceptamos el proyecto activo y lo mantenemos "en vivo" desde Zustand
  const liveActiveProject = activeModal ? projects.find(p => p.id === activeModal.project.id) || activeModal.project : null;

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Levantamiento": return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400";
      case "Presupuesto": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400";
      case "Planeación": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400";
      case "Ejecución": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400";
      case "Completado": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "Cancelado": return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleStatusChange = (project: Project, val: string) => {
    let updatedTasks = [...(project.tasks || [])];
    const groupName = "Compras y encargos de material";

    if (val === "Planeación" && (project.status as string) !== "Planeación") {
      const hasGroup = updatedTasks.some((t: any) => t.group === groupName);

      if (!hasGroup && project.quoteIds.length > 0) {
        const linkedQuotes = quotes.filter(q => project.quoteIds.includes(q.id));
        const supplierMap = new Map<string, any[]>();

        linkedQuotes.forEach(q => {
          q.lines.forEach(l => {
            const p = products.find(x => x.id === l.productId);
            const supplier = (p?.supplier || "Sin proveedor").trim() || "Sin proveedor";
            if (!supplierMap.has(supplier)) supplierMap.set(supplier, []);
            supplierMap.get(supplier)!.push({ line: l, folio: q.folio });
          });
        });

        const now = new Date();
        const startDateStr = toLocalISOString(now);
        const due = new Date(now);
        due.setDate(due.getDate() + 3); // Damos 3 días para hacer el pedido
        due.setHours(12, 0, 0, 0); // Vence a medio día
        const dueDateStr = toLocalISOString(due);

        supplierMap.forEach((items, supplier) => {
          const itemList = items.map(i => `- ${i.line.quantity}x ${i.line.name} (${i.folio})`).join('\n');
          updatedTasks.push({
            id: uuid(),
            title: `Orden de Compra: ${supplier}`,
            description: `Revisa el módulo de "Órdenes de Compra (JIT)" o imprime el PDF para verificar precios actuales.\n\nMateriales detectados:\n${itemList}`,
            assignee: "",
            startDate: startDateStr,
            dueDate: dueDateStr,
            dependencies: [],
            status: "Pendiente",
            group: groupName,
            createdAt: new Date().toISOString(),
            history: [{ date: new Date().toISOString(), action: "Tarea autogenerada al entrar a Planeación" }]
          } as any);
        });
        setTimeout(() => toast.success(`Se auto-generaron ${supplierMap.size} tareas de compras en el Gantt`), 300);
      }
    } else if (val === "Levantamiento" || val === "Presupuesto") {
      const initialLength = updatedTasks.length;
      updatedTasks = updatedTasks.filter((t: any) => t.group !== groupName);
      if (initialLength > updatedTasks.length) {
        setTimeout(() => toast.info("Se eliminaron las tareas de compras autogeneradas al retroceder de fase"), 300);
      }
    }

    updateProject(project.id, { status: val as any, tasks: updatedTasks as any });
    toast.success(`Fase del proyecto actualizada a ${val}`);
    logAction("project:status", `Proyecto '${project.name}' movido a fase '${val}'.`);
  };

  if (activeModal?.type === 'gantt' && liveActiveProject) {
    return <ProjectGanttView project={liveActiveProject} onClose={() => setActiveModal(null)} />;
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
                <div className="flex items-start" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={project.status}
                    onValueChange={(val) => handleStatusChange(project, val)}
                  >
                    <SelectTrigger className={`h-6 text-[10px] uppercase font-bold tracking-wider w-fit border focus:ring-0 px-2 py-0 shadow-none ${getStatusColorClass(project.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Levantamiento">Levantamiento</SelectItem>
                      <SelectItem value="Presupuesto">Presupuesto</SelectItem>
                      <SelectItem value="Planeación">Planeación</SelectItem>
                      <SelectItem value="Ejecución">Ejecución</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
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
      <ProjectFormModal project={activeModal?.type === 'edit' ? liveActiveProject || undefined : undefined} open={activeModal?.type === 'edit'} onOpenChange={(o) => !o && setActiveModal(null)} />
      {activeModal?.type === 'tasks' && liveActiveProject && <ProjectTasksModal project={liveActiveProject} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}
      {activeModal?.type === 'quotes' && liveActiveProject && <ProjectQuotesModal project={liveActiveProject} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}
      {activeModal?.type === 'files' && liveActiveProject && <ProjectFilesModal project={liveActiveProject} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}
      {activeModal?.type === 'materials' && liveActiveProject && <ProjectMaterialsModal project={liveActiveProject} open={true} onOpenChange={(o) => !o && setActiveModal(null)} />}

    </div>
  );
}