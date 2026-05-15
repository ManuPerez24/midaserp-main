import { useState, useEffect } from "react";
import { useProjects, type Project } from "@/stores/projects";
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Kanban, Plus, User, CalendarDays, Trash2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { ProjectTaskCreateModal, ProjectTaskEditModal } from "@/routes/gantt-task-modals";

export function ProjectTasksModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = open !== undefined ? onOpenChange! : setInternalOpen;
  const updateProject = useProjects((s) => s.updateProject);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const [editTask, setEditTask] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const tasks = project.tasks || [];
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      const updated = tasks.map((t: any) => {
        if (t.id === draggedId && t.status !== status) {
          const historyLog = [...(t.history || [])];
          historyLog.push({ date: new Date().toISOString(), action: `Movida a "${status}" en Kanban` });
          return { ...t, status, history: historyLog };
        }
        return t;
      });
      updateProject(project.id, { tasks: updated as any });
      setDraggedId(null);
    }
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
                            onClick={() => setEditTask(t)}
                            className="bg-card rounded-lg border p-4 shadow-sm cursor-grab active:cursor-grabbing group relative hover:border-primary/40 transition-colors"
                          >
                            <div className="font-semibold text-sm pr-6 leading-tight">{t.title}</div>
                            {t.description && <div className="text-xs text-muted-foreground mt-2 line-clamp-3">{t.description}</div>}
                            
                            {t.subtasks && t.subtasks.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 font-medium bg-muted/40 p-1.5 rounded-md border">
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>{t.subtasks.filter((s:any)=>s.done).length}/{t.subtasks.length}</span>
                                <div className="flex-1 h-1 bg-muted rounded-full ml-1 overflow-hidden">
                                   <div className={`h-full transition-all duration-500 ${t.subtasks.filter((s:any)=>s.done).length === t.subtasks.length ? 'bg-emerald-500' : 'bg-primary'}`} style={{width: `${Math.round((t.subtasks.filter((s:any)=>s.done).length / Math.max(1, t.subtasks.length)) * 100)}%`}} />
                                </div>
                                <span className="text-[10px] ml-1">{Math.round((t.subtasks.filter((s:any)=>s.done).length / Math.max(1, t.subtasks.length)) * 100)}%</span>
                              </div>
                            )}

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
                            
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity" onClick={(e) => { e.stopPropagation(); removeTask(t.id); }}>
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

      <ProjectTaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} project={project} />
      <ProjectTaskEditModal open={!!editTask} task={editTask} onClose={() => setEditTask(null)} project={project} />
    </>
  );
}