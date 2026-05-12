import { useState, useEffect, useMemo, useRef } from "react";
import { useProjects, type Project } from "@/stores/projects";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, BarChartHorizontal, Plus, ZoomIn, Clock, CalendarDays, Maximize, ChevronRight, ChevronDown, Filter, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { listUsers } from "@/util/auth.functions";
import { ProjectTaskCreateModal, ProjectTaskEditModal } from "@/routes/gantt-task-modals";

const toLocalISOString = (date?: Date) => {
  const d = date || new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getPhaseColor = (name: string) => {
  const colors = [
    { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-600", light: "bg-blue-200 dark:bg-blue-900/40", border: "border-blue-500/50" },
    { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-600", light: "bg-purple-200 dark:bg-purple-900/40", border: "border-purple-500/50" },
    { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-600", light: "bg-amber-200 dark:bg-amber-900/40", border: "border-amber-500/50" },
    { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-600", light: "bg-emerald-200 dark:bg-emerald-900/40", border: "border-emerald-500/50" },
    { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-600", light: "bg-rose-200 dark:bg-rose-900/40", border: "border-rose-500/50" },
    { text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-600", light: "bg-cyan-200 dark:bg-cyan-900/40", border: "border-cyan-500/50" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export function ProjectGanttView({ project, onClose }: { project: Project, onClose: () => void }) {
  const updateProject = useProjects((s) => s.updateProject);
  const uploadFilesFn = useServerFn(uploadProjectFiles);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  
  const [zoomScale, setZoomScale] = useState(1); // 1 significa 1 día = 48px
  const [use12Hour, setUse12Hour] = useState(true);
  const [initialZoomDone, setInitialZoomDone] = useState(false);
  const [scrollInfo, setScrollInfo] = useState({ left: 0, width: 0, scrollWidth: 1 });
  
  // Variable para controlar el margen de días al encuadrar las tareas a tu gusto
  const fitMarginDays = 0.5; 

  const [editTask, setEditTask] = useState<any | null>(null);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [createGroup, setCreateGroup] = useState("");

  // Advanced Bracket Features States
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [draggingPhase, setDraggingPhase] = useState<{ name: string, initialStartMs: number, currentStartMs: number, startMouseX: number } | null>(null);
  const [confirmDrag, setConfirmDrag] = useState<{ name: string, deltaMs: number, initialStartMs: number, currentStartMs: number } | null>(null);
  const [draggingTask, setDraggingTask] = useState<{ id: string, initialStartMs: number, initialDueMs: number, currentStartMs: number, currentDueMs: number, type: 'move' | 'resize-left' | 'resize-right', startMouseX: number } | null>(null);
  const [confirmTaskDrag, setConfirmTaskDrag] = useState<{ isBulk: boolean, tasks: any[], newStartMs?: number, newDueMs?: number, deltaMs: number } | null>(null);
  const dragActionOccurred = useRef(false);
  const tasksRef = useRef(project.tasks || []);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const hoveredTaskRef = useRef<string | null>(null);
  const [drawingConnection, setDrawingConnection] = useState<{
    fromId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // New Advanced Filtering & UI States
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [colorBy, setColorBy] = useState<"status" | "assignee">("status");
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const selectedTasksRef = useRef<Set<string>>(selectedTasks);
  useEffect(() => { selectedTasksRef.current = selectedTasks; }, [selectedTasks]);

  useEffect(() => {
    listUsers().then(setSystemUsers).catch(() => {});
  }, []);

  useEffect(() => {
    tasksRef.current = project.tasks || [];
  }, [project.tasks]);

  const togglePhaseCollapse = (phaseName: string) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseName)) next.delete(phaseName);
      else next.add(phaseName);
      return next;
    });
  };

  const handlePhaseDragStart = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingPhase({ name: item.name, initialStartMs: item.startMs, currentStartMs: item.startMs, startMouseX: e.clientX });
  };

  const handleStartConnection = (e: React.MouseEvent, taskId: string, endMs: number, rowIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = (endMs - timeline.minDateMs) * pixelsPerMs;
    const startY = rowIndex * 56 + 30;
    setDrawingConnection({
      fromId: taskId,
      startX,
      startY,
      currentX: startX,
      currentY: startY
    });
  };

  const isDependentOn = (checkId: string, targetId: string): boolean => {
    const t: any = tasksRef.current.find(x => x.id === checkId);
    if (!t || !t.dependencies) return false;
    if (t.dependencies.includes(targetId)) return true;
    return t.dependencies.some((dep: string) => isDependentOn(dep, targetId));
  };

  useEffect(() => {
    if (!drawingConnection) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const timelineDiv = document.getElementById("timeline-content");
      if (timelineDiv) {
        const tRect = timelineDiv.getBoundingClientRect();
        setDrawingConnection(prev => prev ? {
          ...prev,
          currentX: e.clientX - tRect.left,
          currentY: e.clientY - tRect.top
        } : null);
      }
    };

    const handleMouseUp = () => {
      const targetId = hoveredTaskRef.current;
      if (targetId && targetId !== drawingConnection.fromId) {
        if (isDependentOn(drawingConnection.fromId, targetId)) {
          toast.error("No se puede conectar: crearía una dependencia circular");
        } else {
          const toTask: any = tasksRef.current.find(t => t.id === targetId);
          if (toTask && !toTask.dependencies?.includes(drawingConnection.fromId)) {
            const newDeps = [...(toTask.dependencies || []), drawingConnection.fromId];
            const historyLog = [...(toTask.history || []), { date: new Date().toISOString(), action: "Dependencia añadida gráficamente" }];
            const updatedTasks = tasksRef.current.map((t: any) => 
              t.id === targetId ? { ...t, dependencies: newDeps, history: historyLog } : t
            );
            updateProject(project.id, { tasks: updatedTasks as any });
            toast.success("Dependencia conectada");
          } else if (toTask?.dependencies?.includes(drawingConnection.fromId)) {
            toast.info("La dependencia ya existe");
          }
        }
      }
      setDrawingConnection(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drawingConnection, project.id, updateProject]);

  const removeDependency = (taskId: string, depId: string) => {
    const task: any = tasksRef.current.find(t => t.id === taskId);
    if (!task) return;
    
    const newDeps = task.dependencies.filter((id: string) => id !== depId);
    const historyLog = [...(task.history || []), { date: new Date().toISOString(), action: "Dependencia eliminada gráficamente" }];
    
    const updatedTasks = tasksRef.current.map((t: any) => 
      t.id === taskId ? { ...t, dependencies: newDeps, history: historyLog } : t
    );
    updateProject(project.id, { tasks: updatedTasks as any });
    toast.success("Dependencia eliminada");
  };

  const tasks = project.tasks || [];
  const sortedTasks = [...tasks].sort((a: any, b: any) => new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime());
  
  // Unique Filter Options
  const filterOptions = useMemo(() => {
    const assignees = new Set<string>();
    const statuses = new Set<string>();
    const phases = new Set<string>();
    sortedTasks.forEach((t: any) => {
      assignees.add(t.assignee || "Sin asignar");
      statuses.add(t.status || "Pendiente");
      phases.add(t.group || "Sin Fase");
    });
    return {
      assignees: Array.from(assignees).sort(),
      statuses: Array.from(statuses).sort(),
      phases: Array.from(phases).sort()
    };
  }, [sortedTasks]);

  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((t: any) => {
      if (assigneeFilter !== "all" && (t.assignee || "Sin asignar") !== assigneeFilter) return false;
      if (statusFilter !== "all" && (t.status || "Pendiente") !== statusFilter) return false;
      if (phaseFilter !== "all" && (t.group || "Sin Fase") !== phaseFilter) return false;
      return true;
    });
  }, [sortedTasks, assigneeFilter, statusFilter, phaseFilter]);

  const criticalPathIds = useMemo(() => {
    if (!showCriticalPath || filteredTasks.length === 0) return new Set<string>();
    let latestTask = filteredTasks[0];
    let maxDue = 0;
    filteredTasks.forEach((t: any) => {
      const due = new Date(t.dueDate || t.startDate || t.createdAt).getTime();
      if (due > maxDue) { maxDue = due; latestTask = t; }
    });
    const path = new Set<string>();
    const traceBack = (taskId: string) => {
      if (path.has(taskId)) return;
      path.add(taskId);
      const task = filteredTasks.find((t: any) => t.id === taskId);
      if (task && task.dependencies) {
        task.dependencies.forEach((d: string) => traceBack(d));
      }
    };
    if (latestTask) traceBack(latestTask.id);
    return path;
  }, [filteredTasks, showCriticalPath]);

  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    tasks.forEach((t: any) => { if (t.group) groups.add(t.group); });
    return Array.from(groups).sort();
  }, [tasks]);

  const flattened = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredTasks.forEach((t: any) => {
      const g = t.group || "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    });
    const result: Array<any> = [];
    if (map.has("")) {
      map.get("")!.forEach(t => result.push({ type: 'task', task: t }));
      map.delete("");
    }
    const groupEntries = Array.from(map.entries()).sort((a, b) => {
      const minA = Math.min(...a[1].map(t => new Date(t.startDate || t.createdAt).getTime()));
      const minB = Math.min(...b[1].map(t => new Date(t.startDate || t.createdAt).getTime()));
      return minA - minB;
    });
    groupEntries.forEach(([g, tArr]) => {
      const startMs = Math.min(...tArr.map(t => new Date(t.startDate || t.createdAt).getTime()));
      const endMs = Math.max(...tArr.map(t => new Date(t.dueDate || t.startDate || t.createdAt).getTime()));
      const completed = tArr.filter(t => t.status === "Completado").length;
      const total = tArr.length;
      
      result.push({ type: 'group', name: g, startMs, endMs, completed, total });
      if (!collapsedPhases.has(g)) {
         tArr.forEach(t => result.push({ type: 'task', task: t }));
      }
    });
    return result;
  }, [filteredTasks, collapsedPhases]);

  const timeline = useMemo(() => {
    let minDateMs = Date.now();
    let maxDateMs = Date.now() + 86400000;
    
    if (sortedTasks.length > 0) {
      minDateMs = Math.min(...sortedTasks.map((t: any) => new Date(t.startDate || t.createdAt).getTime()));
      maxDateMs = Math.max(...sortedTasks.map((t: any) => new Date(t.dueDate || t.startDate || t.createdAt).getTime()));
    }
    
    // Damos 1 mes antes y 1 mes después de espacio
    const monthMs = 30 * 86400000;
    minDateMs -= monthMs;
    maxDateMs += monthMs;
    
    const durationMs = Math.max(86400000, maxDateMs - minDateMs);

    return { minDateMs, maxDateMs, durationMs };
  }, [sortedTasks]);

  const pixelsPerMs = (48 / 86400000) * zoomScale;
  const timelineWidth = (timeline.maxDateMs - timeline.minDateMs) * pixelsPerMs;

  useEffect(() => {
    if (!draggingPhase) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingPhase.startMouseX;
      const deltaMs = deltaX / pixelsPerMs;
      setDraggingPhase(prev => prev ? { ...prev, currentStartMs: prev.initialStartMs + deltaMs } : null);
    };
    
    const handleMouseUp = () => {
      setDraggingPhase(prev => {
        if (prev) {
          const deltaMs = prev.currentStartMs - prev.initialStartMs;
          if (Math.abs(deltaMs) > 60000) { // Al menos 1 minuto de diferencia para reprogramar
            setConfirmDrag({
              name: prev.name,
              deltaMs,
              initialStartMs: prev.initialStartMs,
              currentStartMs: prev.currentStartMs
            });
          }
        }
        return null;
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingPhase, pixelsPerMs, project.id, updateProject]);

  const executeBulkReschedule = () => {
    if (!confirmDrag) return;
    const { name, deltaMs } = confirmDrag;
    const updatedTasks = tasksRef.current.map((t: any) => {
      if (t.group === name) {
        const oldStart = new Date(t.startDate || t.createdAt).getTime();
        const oldDue = new Date(t.dueDate || t.startDate || t.createdAt).getTime();
        const historyLog = [...(t.history || []), { date: new Date().toISOString(), action: "Reprogramación en bloque (Fase completa)" }];
        return { ...t, startDate: toLocalISOString(new Date(oldStart + deltaMs)), dueDate: toLocalISOString(new Date(oldDue + deltaMs)), history: historyLog };
      }
      return t;
    });
    updateProject(project.id, { tasks: updatedTasks as any });
    toast.success(`Fase "${name}" reprogramada`);
    setConfirmDrag(null);
  };

  useEffect(() => {
    if (!draggingTask) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingTask.startMouseX;
      const deltaMs = deltaX / pixelsPerMs;
      
      setDraggingTask(prev => {
        if (!prev) return null;
        let newStartMs = prev.initialStartMs;
        let newDueMs = prev.initialDueMs;
        
        if (prev.type === 'move') {
          newStartMs += deltaMs;
          newDueMs += deltaMs;
        } else if (prev.type === 'resize-left') {
          newStartMs = Math.min(prev.initialStartMs + deltaMs, newDueMs - 60000); 
        } else if (prev.type === 'resize-right') {
          newDueMs = Math.max(prev.initialDueMs + deltaMs, newStartMs + 60000); 
        }
        return { ...prev, currentStartMs: newStartMs, currentDueMs: newDueMs };
      });
    };
    
    const handleMouseUp = () => {
      setDraggingTask(prev => {
        if (prev) {
          const isResize = prev.type !== 'move';
          const deltaMs = prev.currentStartMs - prev.initialStartMs;
          
          if (!isResize && selectedTasksRef.current.has(prev.id) && selectedTasksRef.current.size > 1) {
            if (Math.abs(deltaMs) > 60000) {
              dragActionOccurred.current = true;
              const movingTasks = tasksRef.current.filter((t: any) => selectedTasksRef.current.has(t.id));
              setConfirmTaskDrag({ isBulk: true, tasks: movingTasks, deltaMs });
            } else dragActionOccurred.current = false;
          } else {
          if (Math.abs(prev.currentStartMs - prev.initialStartMs) > 60000 || Math.abs(prev.currentDueMs - prev.initialDueMs) > 60000) {
             dragActionOccurred.current = true;
             const task = tasksRef.current.find((t: any) => t.id === prev.id);
               if (task) setConfirmTaskDrag({ isBulk: false, tasks: [task], newStartMs: prev.currentStartMs, newDueMs: prev.currentDueMs, deltaMs });
          } else dragActionOccurred.current = false;
          }
        }
        return null;
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [draggingTask, pixelsPerMs]);

  const executeTaskReschedule = () => {
    if (!confirmTaskDrag) return;
    const updatedTasks = tasksRef.current.map((t: any) => {
      if (confirmTaskDrag.isBulk) {
        if (selectedTasks.has(t.id)) {
          const oldStart = new Date(t.startDate || t.createdAt).getTime();
          const oldDue = new Date(t.dueDate || t.startDate || t.createdAt).getTime();
          const historyLog = [...(t.history || []), { date: new Date().toISOString(), action: "Reprogramación masiva (Selección Múltiple)" }];
          return { ...t, startDate: toLocalISOString(new Date(oldStart + confirmTaskDrag.deltaMs)), dueDate: toLocalISOString(new Date(oldDue + confirmTaskDrag.deltaMs)), history: historyLog };
        }
      } else if (confirmTaskDrag.tasks && confirmTaskDrag.tasks.length > 0 && t.id === confirmTaskDrag.tasks[0].id) {
         const historyLog = [...(t.history || []), { date: new Date().toISOString(), action: "Reprogramación gráfica (Drag & Resize)" }];
         return { ...t, startDate: toLocalISOString(new Date(confirmTaskDrag.newStartMs!)), dueDate: toLocalISOString(new Date(confirmTaskDrag.newDueMs!)), history: historyLog };
      }
      return t;
    });
    updateProject(project.id, { tasks: updatedTasks as any });
    toast.success(confirmTaskDrag.isBulk ? `${selectedTasks.size} tareas reprogramadas` : `Tarea reprogramada exitosamente`);
    setConfirmTaskDrag(null);
  };

  const executeBulkDelete = () => {
    const updatedTasks = tasksRef.current.filter((t: any) => !selectedTasks.has(t.id));
    updateProject(project.id, { tasks: updatedTasks as any });
    toast.success(`${selectedTasks.size} tareas eliminadas`);
    setSelectedTasks(new Set());
    setConfirmBulkDelete(false);
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    const element = exportRef.current;
    if (!element) return toast.error("No se encontró el contenedor del cronograma");

    const toastId = toast.loading(`Generando captura de alta calidad en ${format.toUpperCase()}...`);
    try {
      // Importaciones dinámicas (Lazy load) para no saturar la carga de la página
      const htmlToImage = await import('html-to-image');
      
      const dataUrl = await htmlToImage.toPng(element, {
        pixelRatio: 1.5, // Balance entre nitidez y prevención contra límites de tamaño en canvas del navegador
        backgroundColor: "#ffffff",
      });
      
      if (format === 'png') {
        const link = document.createElement("a");
        link.download = `Cronograma_${project.name.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Imagen PNG descargada exitosamente", { id: toastId });
      } else {
        // @ts-ignore
        const { jsPDF } = await import('jspdf');
        
        // Obtener dimensiones reales de la imagen capturada
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const pdf = new jsPDF({ orientation: img.width > img.height ? 'landscape' : 'portrait', unit: 'px', format: [img.width, img.height] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(`Cronograma_${project.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("Reporte PDF descargado exitosamente", { id: toastId });
      }
    } catch (err: any) {
      console.error("Error al exportar:", err);
      toast.error(`Ocurrió un error: ${err.message || "Librería no encontrada"}`, { id: toastId });
    }
  };

  const { ticks, tickMs } = useMemo(() => {
    const INTERVALS = [
      60000,           // 1m
      5 * 60000,       // 5m
      15 * 60000,      // 15m
      30 * 60000,      // 30m
      3600000,         // 1h
      2 * 3600000,     // 2h
      6 * 3600000,     // 6h
      12 * 3600000,    // 12h
      86400000,        // 1d
      2 * 86400000,    // 2d
      7 * 86400000,    // 1w
      14 * 86400000,   // 2w
      30 * 86400000    // 1mo
    ];
    const idealTickMs = 100 / pixelsPerMs; // Buscamos ~100px de separación
    const tMs = INTERVALS.reduce((prev, curr) => 
      Math.abs(curr - idealTickMs) < Math.abs(prev - idealTickMs) ? curr : prev
    );

    const tArr = [];
    let currentTickMs = Math.floor(timeline.minDateMs / tMs) * tMs;
    while (currentTickMs <= timeline.maxDateMs) {
      if (currentTickMs >= timeline.minDateMs) {
        tArr.push(currentTickMs);
      }
      currentTickMs += tMs;
    }
    return { ticks: tArr, tickMs: tMs };
  }, [timeline, pixelsPerMs]);

  const weekendShades = useMemo(() => {
    const shades = [];
    let current = new Date(timeline.minDateMs);
    current.setHours(0, 0, 0, 0);
    while (current.getTime() <= timeline.maxDateMs) {
      const day = current.getDay();
      if (day === 0 || day === 6) {
         shades.push(current.getTime());
      }
      current.setDate(current.getDate() + 1);
    }
    return shades;
  }, [timeline.minDateMs, timeline.maxDateMs]);

  const todayMs = Date.now();
  const todayOffsetPixels = (todayMs - timeline.minDateMs) * pixelsPerMs;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateScroll = () => {
      setScrollInfo({
        left: container.scrollLeft,
        width: container.clientWidth,
        scrollWidth: container.scrollWidth || 1
      });
    };
    
    container.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    const observer = new ResizeObserver(updateScroll);
    observer.observe(container);
    
    setTimeout(updateScroll, 150); // Inicializar medidas después del render
    
    return () => {
      container.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
      observer.disconnect();
    };
  }, [timelineWidth, tasks.length, zoomScale]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const container = containerRef.current;
    if (container) {
       const targetScroll = (percent * container.scrollWidth) - (container.clientWidth / 2);
       container.scrollTo({ left: targetScroll, behavior: e.type === 'mousedown' ? 'smooth' : 'auto' });
    }
  };

  const handleMinimapDrag = (e: React.MouseEvent<HTMLDivElement>) => {
     if (e.buttons !== 1) return; // Solo arrastrar si el click izquierdo está presionado
     handleMinimapClick(e);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const listWidth = window.innerWidth < 640 ? 128 : 288;
        const isOverList = mouseX < listWidth;
        const scrollX = container.scrollLeft;
        const relativeX = isOverList ? scrollX : scrollX + (mouseX - listWidth);

        setZoomScale(prev => {
          const newZoom = prev * zoomFactor;
          const newWidth = timeline.durationMs * (48 / 86400000) * newZoom;
          if (newWidth > 300000) return prev;
          const finalZoom = Math.max(newZoom, 0.01);
          
          const oldPixelsPerMs = (48 / 86400000) * prev;
          const newPixelsPerMs = (48 / 86400000) * finalZoom;
          
          const msOffset = relativeX / oldPixelsPerMs;
          const newRelativeX = msOffset * newPixelsPerMs;
          const newScrollX = isOverList ? newRelativeX : newRelativeX - (mouseX - listWidth);
          
          requestAnimationFrame(() => {
            if (containerRef.current) {
               containerRef.current.scrollLeft = newScrollX;
            }
          });
          
          return finalZoom;
        });
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [timeline.durationMs]);

  const handleFitToScreen = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const clientWidth = container.clientWidth;
    if (clientWidth <= 0) return;
    
    if (sortedTasks.length > 0) {
      const taskMinMs = Math.min(...sortedTasks.map((t: any) => new Date(t.startDate || t.createdAt).getTime()));
      const taskMaxMs = Math.max(...sortedTasks.map((t: any) => new Date(t.dueDate || t.startDate || t.createdAt).getTime()));

      const paddingMs = fitMarginDays * 86400000;
      const fitDurationMs = Math.max(86400000, (taskMaxMs - taskMinMs) + (paddingMs * 2));
      
      const listWidth = window.innerWidth < 640 ? 128 : 288;
      const visibleWidth = clientWidth - listWidth;

      const targetZoom = visibleWidth / (fitDurationMs * (48 / 86400000));
      const finalZoom = Math.max(0.05, Math.min(targetZoom, 3)); 
      
      setZoomScale(finalZoom);
      
      setTimeout(() => {
        const pxPerMs = (48 / 86400000) * finalZoom;
        const targetScrollLeft = (taskMinMs - paddingMs - timeline.minDateMs) * pxPerMs;
        container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
      }, 50);
    } else {
      setTimeout(() => {
        const el = document.getElementById("today-line");
        if (el) el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      }, 100);
    }
  };

  useEffect(() => {
    if (initialZoomDone) return;
    // Pequeño retraso para dejar que el layout del navegador se pinte primero
    const timer = setTimeout(() => {
      handleFitToScreen();
      setInitialZoomDone(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [sortedTasks, initialZoomDone, timeline.minDateMs]);

  const openEdit = (t: any) => {
    setEditTask(t);
  };

  const openCreateForGroup = (groupName: string) => {
    setCreateGroup(groupName);
    setCreateOpen(true);
  };

  const formatTickTop = (ms: number) => {
    const d = new Date(ms);
    if (tickMs < 86400000) return d.toLocaleDateString('es', { weekday: 'short', day: '2-digit' });
    return d.toLocaleDateString('es', { month: 'short', year: 'numeric' });
  };

  const formatTickBottom = (ms: number) => {
    const d = new Date(ms);
    if (tickMs < 86400000) {
       return d.toLocaleTimeString('es', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: use12Hour
       });
    }
    return d.getDate().toString();
  };

  const getDurationLabel = (startMs: number, endMs: number) => {
    const dMs = Math.max(1, endMs - startMs);
    if (dMs < 86400000) return `${Math.max(1, Math.round(dMs / 3600000))}h`;
    return `${Math.round(dMs / 86400000)}d`;
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
              <Badge variant="secondary" className="ml-2 font-normal gap-1 bg-rose-50 text-rose-600 border-rose-200 shadow-none hidden sm:flex">
                 <ZoomIn className="h-3 w-3" /> Ctrl + Scroll para Zoom
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Proyecto: {project.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-start sm:justify-end">
          <Button variant="outline" size="sm" className="h-9 shrink-0 font-medium hover:bg-primary/10 hover:text-primary border-primary/20" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="h-9 shrink-0 font-medium hover:bg-primary/10 hover:text-primary border-primary/20" onClick={() => handleExport('png')}>
            <Download className="h-4 w-4 mr-2" /> PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToScreen} className="h-9 shrink-0 font-medium text-muted-foreground hover:text-foreground">
            <Maximize className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Ajustar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setUse12Hour(!use12Hour)} className="h-9 shrink-0 font-medium">
            <Clock className="h-4 w-4 mr-2" /> {use12Hour ? "12 Horas" : "24 Horas"}
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 h-9">
            <Plus className="h-4 w-4 mr-2" /> Nueva Tarea
          </Button>
        </div>
      </div>
      
      {/* Barra de Filtros Inteligentes */}
      <div className="flex items-center gap-3 bg-muted/40 border rounded-lg p-2 px-4 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
           <SelectTrigger className="h-8 w-[140px] text-xs bg-background shrink-0"><SelectValue placeholder="Responsable" /></SelectTrigger>
           <SelectContent>{filterOptions.assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}<SelectItem value="all">Todos los asignados</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="h-8 w-[130px] text-xs bg-background shrink-0"><SelectValue placeholder="Estado" /></SelectTrigger>
           <SelectContent>{filterOptions.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}<SelectItem value="all">Cualquier estado</SelectItem></SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
           <SelectTrigger className="h-8 w-[140px] text-xs bg-background shrink-0"><SelectValue placeholder="Fase" /></SelectTrigger>
           <SelectContent>{filterOptions.phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}<SelectItem value="all">Todas las fases</SelectItem></SelectContent>
        </Select>
        <div className="flex-1" />
        {selectedTasks.size > 0 && (
           <Button variant="destructive" size="sm" className="h-8 text-xs shrink-0" onClick={() => setConfirmBulkDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Borrar ({selectedTasks.size})
           </Button>
        )}
        <Button variant="outline" size="sm" className="h-8 text-xs bg-background shrink-0" onClick={() => setColorBy(p => p === "status" ? "assignee" : "status")}>{colorBy === "status" ? "🎨 Color x Usuario" : "🎨 Color x Estado"}</Button>
        <Button variant={showCriticalPath ? "default" : "outline"} size="sm" className={`h-8 text-xs shrink-0 ${showCriticalPath ? 'bg-rose-600 hover:bg-rose-700' : 'bg-background'}`} onClick={() => setShowCriticalPath(p => !p)}>🔥 Ruta Crítica</Button>
      </div>

      <datalist id="group-suggestions">
        {existingGroups.map(g => <option key={g} value={g} />)}
      </datalist>
      <datalist id="system-users-list">
        {systemUsers.map(u => <option key={u.userId} value={u.name || u.email} />)}
      </datalist>

      {/* Contenedor del Gantt */}
      <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col min-h-0">
        {sortedTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60">
            <BarChartHorizontal className="h-16 w-16 mb-4" />
            <p className="text-lg">No hay tareas técnicas registradas.</p>
            <p className="text-sm mt-1">Usa el botón superior para crear tareas y armar tu cronograma.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto bg-background flex flex-col relative pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" id="gantt-scroll-container" ref={containerRef} onClick={() => selectedTasks.size > 0 && setSelectedTasks(new Set())}>
              <div ref={exportRef} className="flex flex-col w-max min-w-full bg-background relative">
            <div className="flex border-b bg-muted/40 sticky top-0 z-40 shadow-sm w-max min-w-full">
                <div className="w-32 sm:w-72 shrink-0 border-r p-2 sm:p-3 flex flex-col justify-end bg-card sticky left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <span className="font-bold text-[9px] sm:text-xs uppercase tracking-wider text-muted-foreground truncate">Listado de Tareas</span>
                </div>
                <div className="flex-1 relative h-12" style={{ width: timelineWidth }}>
                  {ticks.map((t) => {
                    const left = (t - timeline.minDateMs) * pixelsPerMs;
                    return (
                      <div key={t} className="absolute border-r h-full flex flex-col items-center justify-center bg-card shadow-sm" style={{ left, width: tickMs * pixelsPerMs }}>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground leading-tight">{formatTickTop(t)}</span>
                        <span className="text-xs font-black text-foreground leading-tight">{formatTickBottom(t)}</span>
                      </div>
                    );
                  })}
                </div>
            </div>

            <div className="flex w-max min-w-full relative">
                <div className="w-32 sm:w-72 shrink-0 flex flex-col border-r bg-card sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                   {flattened.map((item, i) => {
                      if (item.type === 'group') {
                         const isCollapsed = collapsedPhases.has(item.name);
                         const colorScheme = getPhaseColor(item.name);
                         return (
                           <div key={`group-${item.name}`} className={`h-[56px] border-b bg-muted/10 px-2 py-1 sm:px-3 sm:py-1.5 flex flex-col justify-center overflow-hidden border-l-4 cursor-pointer hover:bg-muted/30 transition-colors group/phase ${colorScheme.border}`} onClick={() => togglePhaseCollapse(item.name)}>
                              <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-1 min-w-0 ${colorScheme.text}`}>
                                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                                  <span className="font-bold text-xs sm:text-sm uppercase tracking-wider truncate">{item.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover/phase:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); openCreateForGroup(item.name); }}>
                                   <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                 <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-medium">{formatTickTop(item.startMs)} - {formatTickTop(item.endMs)}</span>
                                 <Badge variant="outline" className={`text-[9px] font-mono px-1 py-0 h-4 shadow-none ${colorScheme.text} ${colorScheme.light} border-transparent`}>{item.completed}/{item.total}</Badge>
                              </div>
                           </div>
                         );
                      }
                      const t = item.task;
                      const startMs = new Date(t.startDate || t.createdAt).getTime();
                      const endMs = new Date(t.dueDate || t.startDate || t.createdAt).getTime();
                      const isGroupTask = !!t.group;
                      const leftBorderClass = isGroupTask ? `border-l-[3px] ${getPhaseColor(t.group).border} pl-3 sm:pl-5` : '';
                      
                      return (
                        <div key={t.id} className={`h-[56px] border-b px-2 py-1 sm:px-3 sm:py-1.5 flex flex-col justify-center overflow-hidden ${leftBorderClass}`}>
                          <span className="font-semibold text-xs sm:text-sm line-clamp-2 leading-[1.1] sm:leading-tight" title={t.title}>{t.title}</span>
                          <div className="flex items-center justify-between mt-0.5 sm:mt-1 shrink-0 gap-1">
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-medium">{t.assignee || "Sin asignar"} • {getDurationLabel(startMs, endMs)}</span>
                            <Badge variant="outline" className={`hidden sm:inline-flex text-[9px] h-4 px-1 py-0 shadow-none font-mono shrink-0 ${criticalPathIds.has(t.id) && showCriticalPath ? 'border-rose-500 text-rose-500 bg-rose-50 dark:bg-rose-950' : ''}`}>{t.status}</Badge>
                          </div>
                        </div>
                      );
                   })}
                </div>

                <div id="timeline-content" className="flex-1 relative" style={{ width: timelineWidth, height: flattened.length * 56 }}>
                   <div className="absolute top-0 left-0 w-full h-full flex pointer-events-none z-0">
                      {ticks.map(t => (
                        <div key={t} className="absolute top-0 bottom-0 border-r border-b border-muted/20" style={{ left: (t - timeline.minDateMs) * pixelsPerMs, width: tickMs * pixelsPerMs }} />
                      ))}
                   </div>

                   <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
                      <defs>
                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
                        </marker>
                      </defs>
                      {sortedTasks.reduce((acc: any[], t: any) => {
                         const tIdx = flattened.findIndex(f => f.type === 'task' && f.task.id === t.id);
                         if (tIdx === -1) return acc;
                         const deps = (t.dependencies || []).map((depId: string) => {
                            const parentIdx = flattened.findIndex((st: any) => st.type === 'task' && st.task.id === depId);
                            if (parentIdx === -1) return null;
                            const parentT = (flattened[parentIdx] as any).task;

                            const pStart = new Date(parentT.startDate || parentT.createdAt).getTime();
                            const pDue = new Date(parentT.dueDate || parentT.startDate || parentT.createdAt).getTime();
                            
                            const pLeft = (pStart - timeline.minDateMs) * pixelsPerMs;
                            const pWidth = Math.max((pDue - pStart) * pixelsPerMs, 4);
                            const pX = pLeft + pWidth;
                            const pY = parentIdx * 56 + 30;
                            
                            const cStart = new Date(t.startDate || t.createdAt).getTime();
                            const cX = (cStart - timeline.minDateMs) * pixelsPerMs;
                            const cY = tIdx * 56 + 30;

                            let d = "";
                            let midX = 0, midY = 0;
                            if (cX >= pX + 16) {
                               d = `M ${pX} ${pY} L ${pX + 8} ${pY} L ${pX + 8} ${cY} L ${cX - 4} ${cY}`;
                               midX = pX + 8;
                               midY = pY + (cY - pY) / 2;
                            } else {
                               d = `M ${pX} ${pY} L ${pX + 8} ${pY} L ${pX + 8} ${pY + 26} L ${cX - 12} ${pY + 26} L ${cX - 12} ${cY} L ${cX - 4} ${cY}`;
                               midX = cX - 12 + (pX + 8 - (cX - 12)) / 2;
                               midY = pY + 26;
                            }

                            return (
                               <g key={`${t.id}-${depId}`} className="group/dep" style={{ pointerEvents: 'auto' }}>
                                 <path d={d} className="text-slate-400 dark:text-slate-500 group-hover/dep:text-destructive transition-colors cursor-pointer" stroke="currentColor" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                                 {/* Área invisible más gruesa (Hitbox) para que sea fácil pasar el ratón por encima sin frustraciones */}
                                 <path d={d} className="stroke-transparent cursor-pointer" strokeWidth="15" fill="none" />
                                 <g 
                                   className="opacity-0 group-hover/dep:opacity-100 transition-opacity cursor-pointer" 
                                   transform={`translate(${midX}, ${midY})`} 
                                   onClick={(e) => { e.stopPropagation(); e.preventDefault(); removeDependency(t.id, depId); }}
                                 >
                                   <circle r="9" className="fill-background stroke-destructive" strokeWidth="1.5" />
                                   <path d="M -3 -3 L 3 3 M -3 3 L 3 -3" className="stroke-destructive" strokeWidth="1.5" strokeLinecap="round" />
                                 </g>
                               </g>
                            );
                         }).filter(Boolean);
                         return acc.concat(deps);
                      }, [])}
                      {drawingConnection && (
                        <path
                          d={`M ${drawingConnection.startX} ${drawingConnection.startY} L ${drawingConnection.currentX} ${drawingConnection.currentY}`}
                          className="text-primary animate-pulse"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="5 5"
                          fill="none"
                          markerEnd="url(#arrow)"
                        />
                      )}
                   </svg>

                   <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                      {flattened.map((item, i) => {
                         if (item.type === 'group') {
                            const isDragging = draggingPhase?.name === item.name;
                            const visualStartMs = isDragging && draggingPhase ? draggingPhase.currentStartMs : item.startMs;
                            const visualEndMs = isDragging && draggingPhase ? draggingPhase.currentStartMs + (item.endMs - item.startMs) : item.endMs;
                            const left = (visualStartMs - timeline.minDateMs) * pixelsPerMs;
                            const width = Math.max((visualEndMs - visualStartMs) * pixelsPerMs, 4);
                            const progress = item.total > 0 ? (item.completed / item.total) * 100 : 0;
                            const colorScheme = getPhaseColor(item.name);
                            
                            return (
                               <div key={`g-${item.name}`} className={`absolute flex items-center h-[56px] cursor-grab active:cursor-grabbing group/bracket pointer-events-auto`} style={{ top: i * 56, left, width }} onMouseDown={(e) => handlePhaseDragStart(e, item)}>
                                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2.5 sm:h-3 rounded-full bg-background border shadow-sm overflow-hidden flex">
                                     <div className={`h-full ${colorScheme.bg} transition-all duration-300`} style={{ width: `${progress}%` }} />
                                     <div className={`h-full ${colorScheme.light} flex-1`} />
                                  </div>
                                  <div className={`absolute top-1/2 -translate-y-1/2 left-0 w-1.5 sm:w-2 h-4 sm:h-5 rounded-full ${colorScheme.bg} shadow-md`} />
                                  <div className={`absolute top-1/2 -translate-y-1/2 right-0 w-1.5 sm:w-2 h-4 sm:h-5 rounded-full ${colorScheme.bg} shadow-md`} />
                                  
                                  <Button variant="secondary" size="icon" className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full opacity-0 group-hover/bracket:opacity-100 transition-opacity shadow-md z-30 scale-[0.8]" onClick={(e) => { e.stopPropagation(); openCreateForGroup(item.name); }}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <span className="absolute -top-0 left-3 text-[9px] font-bold text-muted-foreground opacity-0 group-hover/bracket:opacity-100 transition-opacity pointer-events-none drop-shadow-sm bg-background/80 px-1 rounded">
                                     {item.name} ({Math.round(progress)}%)
                                  </span>
                               </div>
                            )
                         }
                         const t = item.task;
                         const isDraggingTask = draggingTask?.id === t.id;
                         const isSelected = selectedTasks.has(t.id);
                         const startMs = new Date(t.startDate || t.createdAt).getTime();
                         const dueMs = new Date(t.dueDate || t.startDate || t.createdAt).getTime();
                         
                         let visualStartMs = startMs;
                         let visualDueMs = dueMs;
                         
                         if (draggingTask) {
                            if (isDraggingTask) { visualStartMs = draggingTask.currentStartMs; visualDueMs = draggingTask.currentDueMs; }
                            else if (isSelected && draggingTask.type === 'move' && selectedTasks.has(draggingTask.id)) {
                               const delta = draggingTask.currentStartMs - draggingTask.initialStartMs;
                               visualStartMs += delta; visualDueMs += delta;
                            }
                         }
                         
                         const left = (visualStartMs - timeline.minDateMs) * pixelsPerMs;
                         const width = Math.max((visualDueMs - visualStartMs) * pixelsPerMs, 4);

                         let colorClass = "bg-slate-500";
                         let lightClass = "bg-slate-300 opacity-80";
                         
                         if (colorBy === "status") {
                            if (t.status === "En Progreso") { colorClass = "bg-blue-600"; lightClass = "bg-blue-400 opacity-80"; }
                            if (t.status === "Completado") { colorClass = "bg-emerald-600"; lightClass = "bg-emerald-400 opacity-80"; }
                         } else {
                            const cScheme = getPhaseColor(t.assignee || "Sin asignar");
                            colorClass = cScheme.bg; lightClass = `${cScheme.light} opacity-100`;
                         }

                         const ringClass = isSelected ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-background" : "";
                         const criticalClass = showCriticalPath && criticalPathIds.has(t.id) ? "animate-pulse ring-2 ring-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.6)]" : "";

                         return (
                            <div 
                               key={t.id} 
                               className={`absolute flex items-center h-8 cursor-move group pointer-events-auto rounded-md select-none ${isDraggingTask ? 'z-50 opacity-90' : 'z-20'} ${ringClass} ${criticalClass}`}
                               onMouseEnter={() => { hoveredTaskRef.current = t.id; }}
                               onMouseLeave={() => { if (hoveredTaskRef.current === t.id) hoveredTaskRef.current = null; }}
                               style={{ top: i * 56 + 14, left, width }}
                               onMouseDown={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  setDraggingTask({ id: t.id, initialStartMs: startMs, initialDueMs: dueMs, currentStartMs: startMs, currentDueMs: dueMs, type: 'move', startMouseX: e.clientX });
                               }}
                               onClick={(e) => {
                                  e.stopPropagation();
                                  if (dragActionOccurred.current) { dragActionOccurred.current = false; return; }
                                  if (e.ctrlKey || e.metaKey) {
                                     setSelectedTasks(prev => {
                                        const next = new Set(prev);
                                        if (next.has(t.id)) next.delete(t.id);
                                        else next.add(t.id);
                                        return next;
                                     });
                                     return;
                                  }
                                  openEdit(t);
                               }}
                            >
                               <div className={`absolute inset-0 flex rounded-md overflow-hidden shadow-sm transition-transform ${isDraggingTask || isSelected ? '' : 'hover:scale-[1.02]'}`}>
                                  <div className={`w-[70%] ${colorClass}`} />
                                  <div className={`w-[30%] ${lightClass}`} />
                               </div>
                               <span className="relative z-10 px-2 text-[11px] font-semibold text-white truncate drop-shadow-md pointer-events-none">
                                  {t.title}
                               </span>
                               {t.assignee && (
                                 <div className="absolute top-1/2 -translate-y-1/2 -right-3 h-6 w-6 rounded-full bg-card border flex items-center justify-center shadow-sm z-30 translate-x-full pointer-events-none" title={t.assignee}>
                                   <span className="text-[9px] font-bold text-muted-foreground">{t.assignee.substring(0,2).toUpperCase()}</span>
                                 </div>
                               )}

                               {/* Tiradores de Redimensionamiento */}
                               <div 
                                 className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-20 hover:bg-white/40 rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity"
                                 onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingTask({ id: t.id, initialStartMs: startMs, initialDueMs: dueMs, currentStartMs: startMs, currentDueMs: dueMs, type: 'resize-left', startMouseX: e.clientX }); }}
                               />
                               <div 
                                 className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 hover:bg-white/40 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity"
                                 onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingTask({ id: t.id, initialStartMs: startMs, initialDueMs: dueMs, currentStartMs: startMs, currentDueMs: dueMs, type: 'resize-right', startMouseX: e.clientX }); }}
                               />
                               
                               {/* Conector Drag & Drop para dependencias */}
                               <div 
                                 className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-primary rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 z-40 hover:scale-125 transition-all shadow-sm"
                                 onMouseDown={(e) => handleStartConnection(e, t.id, visualDueMs, i)}
                                 title="Arrastra para conectar con otra tarea"
                               />
                            </div>
                         );
                      })}
                   </div>

                   {todayOffsetPixels >= 0 && todayOffsetPixels <= timelineWidth && (
                     <div id="today-line" className="absolute top-0 bottom-0 w-px bg-rose-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(225,29,72,0.6)]" style={{ left: `${todayOffsetPixels}px` }} />
                   )}
                </div>
              </div>
            </div>
            </div>
            
            {/* Minimap / Scrollbar Locator */}
            <div className="p-3 bg-background border-t shrink-0 flex items-center justify-center">
              <div 
                 className="h-12 w-full max-w-4xl rounded-xl border border-border/60 bg-muted/10 relative cursor-pointer overflow-hidden shadow-inner group transition-all hover:bg-muted/30 hover:border-border"
                 onMouseDown={handleMinimapClick}
                 onMouseMove={handleMinimapDrag}
                 title="Arrastra para navegar por el cronograma"
              >
                 {/* Timeline background representation */}
                 <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-border/40 -translate-y-1/2" />
                    {sortedTasks.map((t: any, i: number) => {
                       const startMs = new Date(t.startDate || t.createdAt).getTime();
                       const endMs = new Date(t.dueDate || t.startDate || t.createdAt).getTime();
                       const leftPct = Math.max(0, ((startMs - timeline.minDateMs) / timeline.durationMs) * 100);
                       const widthPct = Math.max(0.2, ((endMs - startMs) / timeline.durationMs) * 100);
                       
                       let colorClass = "bg-slate-400";
                       if (t.status === "En Progreso") colorClass = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";
                       if (t.status === "Completado") colorClass = "bg-emerald-500";
                       
                       return <div key={`mini-${t.id}`} className={`absolute h-1.5 rounded-full opacity-80 ${colorClass}`} style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: `${(i % 3) * 25 + 25}%` }} />;
                    })}
                 </div>
                 
                 {/* Viewport Indicator */}
                 <div 
                    className="absolute top-0 bottom-0 border-x border-primary/50 shadow-[0_0_15px_rgba(0,0,0,0.05)] pointer-events-none group-hover:border-primary/70 transition-colors bg-background/50 backdrop-blur-[1px]"
                    style={{ left: `${Math.min(100, Math.max(0, (scrollInfo.left / scrollInfo.scrollWidth) * 100))}%`, width: `${Math.min(100, Math.max(0, (scrollInfo.width / scrollInfo.scrollWidth) * 100))}%` }}
                 >
                    <div className="absolute top-1/2 -left-[3px] h-4 w-1.5 -translate-y-1/2 bg-primary rounded-full shadow-sm" />
                    <div className="absolute top-1/2 -right-[3px] h-4 w-1.5 -translate-y-1/2 bg-primary rounded-full shadow-sm" />
                 </div>
              </div>
            </div>
          </>
        )}
      </div>

      <ProjectTaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} project={project} initialGroup={createGroup} />
      <ProjectTaskEditModal open={!!editTask} task={editTask} onClose={() => setEditTask(null)} project={project} />

      <Dialog open={!!confirmDrag} onOpenChange={(o) => !o && setConfirmDrag(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Reprogramación</DialogTitle>
            <DialogDescription>
              Estás a punto de desplazar temporalmente todas las tareas de la fase <strong>{confirmDrag?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          {confirmDrag && (
            <div className="py-4 space-y-4">
              <div className="border rounded-md p-3 bg-primary/10 border-primary/20 flex flex-col items-center justify-center py-4 text-center mb-4">
                <p className="text-xs uppercase font-bold text-primary mb-1">Desplazamiento Total</p>
                <p className="text-2xl font-black text-primary">
                  {confirmDrag.deltaMs > 0 ? "+" : ""}{Math.round(confirmDrag.deltaMs / 3600000)} <span className="text-sm font-semibold">Horas</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3 bg-muted/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Inicio Original</p>
                  <p className="text-sm font-semibold">{new Date(confirmDrag.initialStartMs).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="border rounded-md p-3 bg-primary/10 border-primary/20">
                  <p className="text-[10px] uppercase font-bold text-primary mb-1">Nuevo Inicio</p>
                  <p className="text-sm font-semibold text-primary">{new Date(confirmDrag.currentStartMs).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Se moverán {tasksRef.current.filter((t: any) => t.group === confirmDrag.name).length} tareas en bloque. Esta acción dejará un registro en el historial de cada tarea.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDrag(null)}>Cancelar</Button>
            <Button onClick={executeBulkReschedule} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md">Confirmar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!confirmTaskDrag} onOpenChange={(o) => !o && setConfirmTaskDrag(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Reprogramación</DialogTitle>
            <DialogDescription>
              {confirmTaskDrag?.isBulk 
                ? `Estás desplazando en el tiempo ${confirmTaskDrag.tasks.length} tareas seleccionadas.`
                : `Estás modificando las fechas de la tarea ${confirmTaskDrag?.tasks[0]?.title}.`
              }
            </DialogDescription>
          </DialogHeader>
          {confirmTaskDrag && (
            <div className="py-4 space-y-4">
              {confirmTaskDrag.isBulk ? (
                 <div className="border rounded-md p-3 bg-primary/10 border-primary/20 flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-xs uppercase font-bold text-primary mb-2">Desplazamiento Total</p>
                    <p className="text-2xl font-black text-primary">
                       {confirmTaskDrag.deltaMs > 0 ? "+" : ""}{Math.round(confirmTaskDrag.deltaMs / 3600000)} <span className="text-sm font-semibold">Horas</span>
                    </p>
                 </div>
              ) : (
                 <div className="space-y-4">
                   <div className="border rounded-md p-3 bg-primary/10 border-primary/20 flex flex-col items-center justify-center py-4 text-center">
                      <p className="text-xs uppercase font-bold text-primary mb-1">Desplazamiento Total</p>
                      <p className="text-2xl font-black text-primary">
                         {confirmTaskDrag.deltaMs > 0 ? "+" : ""}{Math.round(confirmTaskDrag.deltaMs / 3600000)} <span className="text-sm font-semibold">Horas</span>
                      </p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="border rounded-md p-3 bg-muted/20">
                       <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Inicio Original</p>
                       <p className="text-xs font-semibold">{new Date(new Date(confirmTaskDrag.tasks[0].startDate || confirmTaskDrag.tasks[0].createdAt).getTime()).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                       <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2 mb-1">Fin Original</p>
                       <p className="text-xs font-semibold">{new Date(new Date(confirmTaskDrag.tasks[0].dueDate || confirmTaskDrag.tasks[0].startDate || confirmTaskDrag.tasks[0].createdAt).getTime()).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                     </div>
                     <div className="border rounded-md p-3 bg-primary/10 border-primary/20">
                       <p className="text-[10px] uppercase font-bold text-primary mb-1">Nuevo Inicio</p>
                       <p className="text-xs font-semibold text-primary">{new Date(confirmTaskDrag.newStartMs!).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                       <p className="text-[10px] uppercase font-bold text-primary mt-2 mb-1">Nuevo Fin</p>
                       <p className="text-xs font-semibold text-primary">{new Date(confirmTaskDrag.newDueMs!).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                     </div>
                   </div>
                 </div>
              )}
              <p className="text-xs text-muted-foreground font-medium">Esta acción dejará un registro en el historial de la tarea.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTaskDrag(null)}>Cancelar</Button>
            <Button onClick={executeTaskReschedule} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md">Confirmar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo de Borrado Masivo */}
      <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar en Bloque</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar <strong>{selectedTasks.size}</strong> tareas. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>Cancelar</Button>
            <Button onClick={executeBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md">Eliminar {selectedTasks.size} tareas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}