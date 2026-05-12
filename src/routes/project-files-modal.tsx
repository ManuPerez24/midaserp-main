import { useState, useEffect, useMemo } from "react";
import { useProjects, type Project, type ProjectAttachment } from "@/stores/projects";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Paperclip, Search, UploadCloud, Download, Trash2, X, File, FileText, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";

export function ProjectFilesModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
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

export function FileCardCompact({ name, type, url, isActive, selected, onSelect, onDelete, onPreview, isNew, date, size }: any) {
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