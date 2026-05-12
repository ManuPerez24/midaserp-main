import { useState, useEffect } from "react";
import { useProjects, type Project, type ProjectType, type ProjectAttachment } from "@/stores/projects";
import { useClients } from "@/stores/clients";
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Building, User, Mail, Phone, MapPin, Copy, Download, Trash2, UploadCloud, File, FileText } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";

export function ProjectFormModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project?: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
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

export function FileCard({ name, type, url, selected, onSelect, onDelete, onPreview, isNew }: any) {
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