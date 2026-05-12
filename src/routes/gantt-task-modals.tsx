import { useState, useEffect } from "react";
import { useProjects, type Project } from "@/stores/projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { Trash2, CheckCircle, Clock, UploadCloud, History as HistoryIcon, Download, File, User, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";
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

const toLocalISOString = (date?: Date) => {
  const d = date || new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function ProjectTaskCreateModal({ open, onClose, project, initialGroup }: { open: boolean, onClose: () => void, project: Project, initialGroup?: string }) {
  const updateProject = useProjects((s) => s.updateProject);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [group, setGroup] = useState(initialGroup || "");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setAssignee("");
      
      const now = new Date();
      const localNow = toLocalISOString(now).split("T");
      setStartDate(localNow[0]);
      setStartTime(localNow[1]);

      const tomorrow = new Date(Date.now() + 86400000);
      const localTomorrow = toLocalISOString(tomorrow).split("T");
      setDueDate(localTomorrow[0]);
      setDueTime(localTomorrow[1]);
      
      setGroup(initialGroup || "");
    }
  }, [open, initialGroup]);

  const handleSave = () => {
    if (!title) return toast.error("El título es requerido");
    
    const parsedStart = new Date(`${startDate}T${startTime}`);
    const newStartISO = isNaN(parsedStart.getTime()) ? new Date().toISOString() : parsedStart.toISOString();

    const parsedDue = new Date(`${dueDate}T${dueTime}`);
    const newDueISO = isNaN(parsedDue.getTime()) ? new Date().toISOString() : parsedDue.toISOString();

    const newTask = {
      id: uuid(),
      title,
      description,
      assignee,
      startDate: newStartISO,
      dueDate: newDueISO,
      dependencies: [],
      status: "Pendiente",
      group,
      createdAt: new Date().toISOString(),
      history: [{ date: new Date().toISOString(), action: "Tarea creada" }]
    };

    updateProject(project.id, { tasks: [...(project.tasks || []), newTask] as any });
    toast.success("Tarea creada");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[800px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background rounded-xl">
        <DialogHeader className="p-4 sm:p-6 border-b shrink-0 flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1 text-left">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Plus className="text-primary h-5 w-5 shrink-0" />
              <span className="line-clamp-1">{title || "Nueva Tarea"}</span>
            </DialogTitle>
            <DialogDescription>Añade una nueva tarea al proyecto {project.name}</DialogDescription>
          </div>
          <Badge className="bg-slate-500 ml-4 shrink-0">Borrador</Badge>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <Card>
              <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Instalación de equipo" /></div>
                <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} placeholder="Describe el alcance de la tarea..."/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Responsable</Label>
                    <Input list="system-users-list" value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="Nombre o email"/>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fase / Grupo</Label>
                    <Input list="group-suggestions" value={group} onChange={e=>setGroup(e.target.value)} placeholder="Ej. Fase 1"/>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Programación</CardTitle></CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Fecha Inicio</Label><Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Hora Inicio</Label><Input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Fecha Fin</Label><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Hora Fin</Label><Input type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <DialogFooter className="p-4 sm:p-6 bg-background border-t shrink-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Crear Tarea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectTaskEditModal({ open, onClose, project, task }: { open: boolean, onClose: () => void, project: Project, task: any }) {
  const updateProject = useProjects((s) => s.updateProject);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const uploadFilesFn = useServerFn(uploadProjectFiles);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setAssignee(task.assignee || "");
      
      const st = new Date(task.startDate || task.createdAt || Date.now());
      const localSt = toLocalISOString(st).split("T");
      setStartDate(localSt[0]);
      setStartTime(localSt[1]);
      
      const dt = new Date(task.dueDate || task.startDate || task.createdAt || Date.now());
      const localDt = toLocalISOString(dt).split("T");
      setDueDate(localDt[0]);
      setDueTime(localDt[1]);
      
      setStatus(task.status || "Pendiente");
      setGroup(task.group || "");
      setExistingPhotos(task.evidence || []);
      setEvidencePhotos([]);
      setComments(task.comments || "");
    }
  }, [open, task]);

  const handleSave = async () => {
    if (!title) return toast.error("El título es requerido");
    setSaving(true);

    let uploadedUrls = [...existingPhotos];
    let newlyUploadedUrls: any[] = [];
    
    if (evidencePhotos.length > 0) {
      const toastId = toast.loading("Subiendo evidencias...");
      try {
        const filesData = await Promise.all(
          evidencePhotos.map((f) => {
            return new Promise<{ name: string; type: string; base64: string; size: number }>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve({ name: f.name, type: f.type, base64: reader.result as string, size: f.size });
              reader.readAsDataURL(f);
            });
          })
        );
        const res = await uploadFilesFn({ data: { files: filesData } });
        if (res.ok) {
           newlyUploadedUrls = res.data;
           uploadedUrls = [...uploadedUrls, ...newlyUploadedUrls];
           toast.success("Evidencias subidas", { id: toastId });
        } else {
           toast.error("Error al subir evidencias", { id: toastId });
        }
      } catch (e) {
        toast.error("Error de red", { id: toastId });
      }
    }

    const parsedStart = new Date(`${startDate}T${startTime}`);
    const newStartISO = isNaN(parsedStart.getTime()) ? new Date().toISOString() : parsedStart.toISOString();

    const parsedDue = new Date(`${dueDate}T${dueTime}`);
    const newDueISO = isNaN(parsedDue.getTime()) ? new Date().toISOString() : parsedDue.toISOString();

    const updatedTasks = (project.tasks || []).map((t: any) => {
      if (t.id === task?.id) {
        const historyLog = [...(t.history || [])];
        
        let eventDate = new Date().toISOString();
        if (status === 'Completado') eventDate = newDueISO;
        else if (status === 'En Progreso' || status === 'Pendiente') eventDate = newStartISO;

        if (t.status !== status) historyLog.push({ date: eventDate, action: `Estado cambiado a ${status}` });
        if (evidencePhotos.length > 0 || comments !== (task.comments || "")) {
           historyLog.push({ date: eventDate, action: "Evidencia / Comentarios actualizados", snapshot: { comments, photos: evidencePhotos.length, files: newlyUploadedUrls } });
        }
        
        return {
          ...t,
          title,
          description,
          assignee,
          startDate: newStartISO,
          dueDate: newDueISO,
          status,
          group,
          evidence: uploadedUrls,
          comments,
          history: historyLog
        };
      }
      return t;
    });

    updateProject(project.id, { tasks: updatedTasks as any });
    toast.success("Tarea actualizada");
    setSaving(false);
    onClose();
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    const updatedTasks = (project.tasks || []).filter((t: any) => t.id !== task?.id);
    updateProject(project.id, { tasks: updatedTasks as any });
    toast.success("Tarea eliminada");
    setDeleteConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[99vw] max-w-[1800px] h-[98vh] max-h-[98vh] flex flex-col p-0 overflow-hidden bg-background rounded-xl">
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0 flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-xl flex items-center gap-2">
                {status === 'Completado' ? <CheckCircle className="text-emerald-500 h-5 w-5 shrink-0" /> : status === 'En Progreso' ? <Clock className="text-blue-500 h-5 w-5 shrink-0" /> : <Clock className="text-slate-500 h-5 w-5 shrink-0" />}
                <span className="line-clamp-1">{title || "Editar Tarea"}</span>
              </DialogTitle>
              <DialogDescription>Modifica la programación y registra evidencias.</DialogDescription>
            </div>
            <Badge className={status === 'Completado' ? 'bg-emerald-500 ml-4 shrink-0' : status === 'En Progreso' ? 'bg-blue-500 ml-4 shrink-0' : 'bg-slate-500 ml-4 shrink-0'}>{status}</Badge>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-muted/10 divide-y lg:divide-y-0 lg:divide-x">
            
            {/* Columna Izquierda: Formulario */}
            <div className="overflow-y-auto xl:overflow-hidden p-4 sm:p-6 min-h-0 bg-background/50 flex flex-col gap-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 shrink-0">
                <Card>
                  <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={e=>setTitle(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2}/></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Responsable</Label>
                        <Input list="system-users-list" value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="Nombre o email"/>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fase / Grupo</Label>
                        <Input list="group-suggestions" value={group} onChange={e=>setGroup(e.target.value)} placeholder="Ej. Fase 1"/>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3 px-4 border-b"><CardTitle className="text-base">Programación</CardTitle></CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Fecha Inicio</Label>
                        <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Hora Inicio</Label>
                        <Input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fecha Fin</Label>
                        <Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Hora Fin</Label>
                        <Input type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className={`flex-1 flex flex-col min-h-0 ${status === 'Completado' ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10' : status === 'En Progreso' ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                <CardHeader className="py-3 px-4 border-b shrink-0"><CardTitle className="text-base">Estado y Entrega</CardTitle></CardHeader>
                <CardContent className="flex flex-col xl:flex-row gap-4 p-4 overflow-hidden min-h-0">
                  <div className="flex flex-col gap-4 w-full xl:w-1/2 min-h-0 flex-1">
                    <div className="space-y-1.5 shrink-0">
                      <Label>Estado de la tarea</Label>
                      <Select value={status} onValueChange={(val) => {
                        setStatus(val);
                        const now = new Date();
                        const localNow = toLocalISOString(now).split("T");
                        if (val === 'Completado') {
                          setDueDate(localNow[0]);
                          setDueTime(localNow[1]);
                          toast.info("Fecha y hora de fin registradas al momento actual.");
                        } else if (val === 'En Progreso') {
                          setStartDate(localNow[0]);
                          setStartTime(localNow[1]);
                          toast.info("Fecha y hora de inicio registradas al momento actual.");
                        }
                      }}>
                        <SelectTrigger className={status === 'Completado' ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : status === 'En Progreso' ? 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/30' : ''}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En Progreso">En Progreso</SelectItem>
                          <SelectItem value="Completado">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3 shrink-0 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <Label>{status === 'Completado' ? 'Fecha Entrega' : 'Fecha Inicio'}</Label>
                        <Input type="date" value={status === 'Completado' ? dueDate : startDate} onChange={e => status === 'Completado' ? setDueDate(e.target.value) : setStartDate(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{status === 'Completado' ? 'Hora Entrega' : 'Hora Inicio'}</Label>
                        <Input type="time" value={status === 'Completado' ? dueTime : startTime} onChange={e => status === 'Completado' ? setDueTime(e.target.value) : setStartTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                      <Label>Comentarios del reporte</Label>
                      <Textarea value={comments} onChange={e=>setComments(e.target.value)} placeholder="Describe el trabajo realizado..." className="bg-background resize-none flex-1" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 space-y-1.5 border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-4 w-full xl:w-1/2">
                    <Label className="shrink-0">Fotografías / Adjuntos</Label>
                    <div className="flex-1 flex flex-col gap-3 min-h-0">
                      <label className={`border-2 border-dashed border-primary/30 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/5 transition-colors relative bg-background shrink-0 ${(existingPhotos.length > 0 || evidencePhotos.length > 0) ? 'py-2' : 'flex-1'}`}>
                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setEvidencePhotos([...evidencePhotos, ...Array.from(e.target.files)]);
                          }
                        }} />
                        <UploadCloud className={`${(existingPhotos.length > 0 || evidencePhotos.length > 0) ? 'h-5 w-5 mb-0.5' : 'h-8 w-8 mb-2'} text-primary/50`} />
                        <p className={`${(existingPhotos.length > 0 || evidencePhotos.length > 0) ? 'text-[10px]' : 'text-sm'} font-medium`}>Sube fotos</p>
                      </label>
                      
                      {(existingPhotos.length > 0 || evidencePhotos.length > 0) && (
                        <div className="flex-1 overflow-y-auto pr-1">
                          <div className="flex flex-wrap gap-2">
                            {existingPhotos.map((url: any, i) => {
                              const fileUrl = url.url || url;
                              const isImg = fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || (url.type && url.type.startsWith('image/'));
                              return (
                              <div key={`ex-${i}`} className="h-14 w-14 rounded border bg-background relative group overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                {isImg ? (
                                  <img src={fileUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center p-1 text-center">
                                    <File className="h-5 w-5 text-primary mb-0.5" />
                                    <span className="text-[8px] truncate w-full" title={url.name || fileUrl.split('/').pop()}>{url.name || fileUrl.split('/').pop()}</span>
                                  </div>
                                )}
                                <Button variant="destructive" size="icon" className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => setExistingPhotos(existingPhotos.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3"/></Button>
                              </div>
                            )})}
                            {evidencePhotos.map((file, i) => {
                              const isImg = file.type.startsWith('image/');
                              return (
                              <div key={`nw-${i}`} className="h-14 w-14 rounded border bg-background relative group overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                {isImg ? (
                                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center p-1 text-center">
                                    <File className="h-5 w-5 text-primary mb-0.5" />
                                    <span className="text-[8px] truncate w-full" title={file.name}>{file.name}</span>
                                  </div>
                                )}
                                <Button variant="destructive" size="icon" className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => setEvidencePhotos(evidencePhotos.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3"/></Button>
                              </div>
                            )})}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="flex flex-col h-full min-h-[400px] border-0 rounded-none bg-transparent shadow-none">
              <CardHeader className="shrink-0 px-4 sm:px-6 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                  <HistoryIcon className="h-4 w-4"/> Roadmap (Historial)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
                <div className="relative py-4 max-w-4xl mx-auto w-full">
                  <div className="absolute left-5 xl:left-1/2 top-0 bottom-0 w-[3px] bg-slate-800 dark:bg-slate-700 xl:-translate-x-1/2 rounded-full opacity-40" />
                  
                  {[...(task?.history || [])].reverse().map((h: any, i: number, arr: any[]) => {
                    const isEven = i % 2 === 0;
                    const timelineColors = ["bg-orange-500", "bg-yellow-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-purple-500"];
                    const colorClass = timelineColors[i % timelineColors.length];
                    const stepNum = String(arr.length - i).padStart(2, '0');
                    
                    return (
                      <div key={i} className={`relative flex items-start xl:items-center mb-6 last:mb-0 ${isEven ? 'xl:flex-row-reverse' : 'xl:flex-row'}`}>
                        <div className="hidden xl:block xl:w-1/2" />
                        
                        <div className={`absolute left-0 xl:left-1/2 xl:-translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-background ${colorClass} text-white font-bold text-sm shadow z-10 shrink-0`}>
                          {stepNum}
                        </div>
                        
                        <div className={`w-full xl:w-1/2 pl-14 xl:pl-0 ${isEven ? 'xl:pr-10 flex flex-col items-start xl:items-end xl:text-right' : 'xl:pl-10 flex flex-col items-start xl:text-left'}`}>
                          <div className={`flex items-center gap-1 text-[10px] text-muted-foreground mb-1 font-mono font-medium opacity-80 ${isEven ? 'xl:flex-row-reverse' : 'xl:flex-row'}`}>
                            <Clock className="h-3 w-3" />
                            {new Date(h.date).toLocaleString('es-MX')}
                          </div>
                          
                          <Label className="font-bold text-xs uppercase tracking-wider text-foreground mb-1.5 leading-tight">
                            {h.action}
                          </Label>
                          
                          {h.snapshot && (
                            <div className={`p-3 bg-card border rounded-lg text-xs shadow-sm w-full mt-0.5 ${isEven ? 'xl:rounded-tr-sm text-left xl:text-right' : 'xl:rounded-tl-sm text-left'}`}>
                              {h.snapshot.comments && <p className="text-muted-foreground leading-relaxed mb-2 italic">"{h.snapshot.comments}"</p>}
                              
                              {h.snapshot.files && h.snapshot.files.length > 0 ? (
                                <div className={`flex flex-wrap gap-1.5 ${isEven ? 'xl:justify-end' : 'xl:justify-start'}`}>
                                  {h.snapshot.files.map((f: any, idx: number) => {
                                    const url = typeof f === 'string' ? f : f.url;
                                    const name = typeof f === 'string' ? url.split('/').pop() : (f.name || url.split('/').pop());
                                    const isImg = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || (f.type && f.type.startsWith('image/'));
                                    return isImg ? (
                                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block relative group shrink-0" title={name}>
                                        <img src={url} alt={name} className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded border border-primary/20 shadow-sm" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                                          <Download className="h-4 w-4 text-white" />
                                        </div>
                                      </a>
                                    ) : (
                                      <a key={idx} href={url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 p-1.5 border border-primary/20 rounded hover:bg-muted transition-colors bg-background" title={name}>
                                        <File className="h-4 w-4 text-primary shrink-0" />
                                        <span className="max-w-[100px] truncate text-[10px] font-medium">{name}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              ) : h.snapshot.photos > 0 ? (
                                <p className={`text-primary font-medium flex items-center gap-1 ${isEven ? 'xl:justify-end' : 'xl:justify-start'}`}>
                                  <UploadCloud className="h-3 w-3"/> +{h.snapshot.photos} archivos adjuntos
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="p-4 sm:p-6 bg-background border-t shrink-0 flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete} type="button">
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la tarea "{task?.title}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}