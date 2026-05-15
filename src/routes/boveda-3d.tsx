import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { PageGuard } from "@/components/page-guard";
import { useCadVault, type CadProject, type CadFileVersion, type CadFolder } from "@/stores/cad-vault";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Box, FileBox, Plus, Upload, History, Trash2, Download, Search, File as FileIcon, Edit, Eye, Loader2, Folder, FolderPlus, FolderOpen, ArrowLeft, ChevronRight, MoreVertical, MoveRight, Type, FileCode, FileImage, Link as LinkIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadProjectFiles } from "@/util/projects.functions";
import { v4 as uuid } from "uuid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MATERIAL_CATEGORIES } from "@/lib/farm-utils";

function StlViewer({ url, className }: { url: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | false>(false);
  const [debugUrl, setDebugUrl] = useState<string>("");

  useEffect(() => {
    let mount = containerRef.current;
    if (!mount) return;

    let renderer: any, scene: any, camera: any, controls: any, animationId: number;

    const actualUrl = typeof url === 'string' ? url : (url as any)?.url || (url as any)?.dataUrl;
    
    if (!actualUrl || typeof actualUrl !== 'string') {
       setError("URL inválida o corrupta.");
       setLoading(false);
       return;
    }

    let finalUrl = actualUrl;
    if (finalUrl.startsWith('public/')) finalUrl = finalUrl.replace('public/', '/');
    if (finalUrl.startsWith('./public/')) finalUrl = finalUrl.replace('./public/', '/');
    finalUrl = finalUrl.replace(/\\/g, '/');
    
    // Auto-codificar espacios en la URL si no es data string
    if (!finalUrl.startsWith('data:')) {
      finalUrl = finalUrl.split('/').map(p => p.includes(' ') ? encodeURIComponent(p) : p).join('/');
    }

    setDebugUrl(finalUrl);

    const initViewer = () => {
      const THREE = (window as any).THREE;
      if (!THREE || !THREE.STLLoader || !THREE.OrbitControls) {
        setError("Error al inicializar el motor 3D (Three.js no cargó).");
        setLoading(false); 
        return;
      }

      try {
        scene = new THREE.Scene();
        
        const aspect = mount.clientHeight > 0 ? mount.clientWidth / mount.clientHeight : 1;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 100, 100);
        scene.add(dirLight);
        
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight2.position.set(-100, -100, 50);
        scene.add(dirLight2);

        fetch(finalUrl)
          .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const buffer = await res.arrayBuffer();
            
            const header = new TextDecoder().decode(buffer.slice(0, 15)).toLowerCase();
            if (header.includes("<html") || header.includes("<!doc")) {
              throw new Error("El archivo no se encontró (Error 404 - HTML Devuelto).");
            }
            
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(buffer);
            
            if (!geometry || !geometry.attributes || !geometry.attributes.position) {
               throw new Error("El archivo STL está vacío o corrupto.");
            }

            const material = new THREE.MeshPhongMaterial({ color: 0x6366f1, specular: 0x111111, shininess: 100 });
            const mesh = new THREE.Mesh(geometry, material);
            
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            mesh.position.sub(center); 

            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
            camera.position.set(0, cameraZ * 0.5, cameraZ);
            camera.far = Math.max(1000, cameraZ * 10);
            camera.updateProjectionMatrix();
            camera.lookAt(0,0,0);
            
            const group = new THREE.Group();
            group.add(mesh);
            group.rotation.x = -Math.PI / 2;
            scene.add(group);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Fetch/Parse Error:", err);
            setError(err.message || "Error al leer el modelo 3D.");
            setLoading(false);
          });

        const animate = () => {
          animationId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const resizeObserver = new ResizeObserver(() => {
          if (!mount || mount.clientWidth === 0 || mount.clientHeight === 0) return;
          camera.aspect = mount.clientWidth / mount.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(mount.clientWidth, mount.clientHeight);
        });
        resizeObserver.observe(mount);
        
        (mount as any)._cleanupResize = () => resizeObserver.disconnect();
        
      } catch (e: any) {
         console.error("ThreeJS Setup Error:", e);
         setError(e.message || "Error fatal en Three.js"); 
         setLoading(false);
      }
    };

    const loadScripts = async () => {
      const loadScript = (src: string) => new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
        if (existing) {
          if (existing.getAttribute('data-loaded') === 'true') { resolve(true); return; }
          existing.addEventListener('load', () => resolve(true));
          existing.addEventListener('error', reject);
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => { s.setAttribute('data-loaded', 'true'); resolve(true); };
        s.onerror = reject;
        document.head.appendChild(s);
      });

      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js");
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
        setTimeout(initViewer, 50);
      } catch (e: any) {
        console.error("Fallo al inyectar scripts:", e);
        setError("Fallo al conectar con la librería gráfica."); setLoading(false);
      }
    };

    loadScripts();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer && mount) mount.removeChild(renderer.domElement);
      if (scene) scene.clear();
      if ((mount as any)?._cleanupResize) (mount as any)._cleanupResize();
    };
  }, [url]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
           <div className="flex flex-col items-center gap-3 text-indigo-500 bg-background/80 p-6 rounded-2xl shadow-xl backdrop-blur-sm border">
             <Loader2 className="h-8 w-8 animate-spin" />
             <span className="text-sm font-bold animate-pulse">Renderizando WebGL...</span>
           </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
           <div className="bg-background/80 p-6 rounded-2xl shadow-xl backdrop-blur-sm border text-center max-w-sm flex flex-col items-center">
             <span className="text-sm text-destructive font-bold mb-2 block">Error al cargar el modelo 3D</span>
             <p className="text-xs text-muted-foreground mb-3">{error}</p>
             {debugUrl && (
               <div className="bg-muted p-2 rounded text-[9px] font-mono text-muted-foreground w-full break-all max-h-24 overflow-y-auto">
                 {debugUrl}
               </div>
             )}
           </div>
        </div>
      )}
      {!loading && !error && (
        <div className="absolute bottom-4 right-4 flex gap-1 z-10 pointer-events-none">
           <span className="text-[10px] bg-background/60 backdrop-blur-md px-3 py-1.5 rounded-lg border text-foreground font-semibold shadow-sm">
             Click Izquierdo: Rotar · Click Derecho: Mover · Rueda: Zoom
           </span>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/boveda-3d")({
  component: () => (
    <PageGuard>
      <CadVaultPage />
    </PageGuard>
  ),
});

function CadVaultPage() {
  const vaultStore = useCadVault() as any;
  const projects: CadProject[] = vaultStore.projects || [];
  const { addProject, updateProject, removeProject, addVersion, updateVersion, removeVersion, addFolder, updateFolder, removeFolder, moveItems, removeMultipleItems } = vaultStore;
  const user = useAuth(s => s.user);
  const uploadFilesFn = useServerFn(uploadProjectFiles);
  
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjCat, setNewProjCat] = useState("Prototipos");
  const [newProjMaterial, setNewProjMaterial] = useState("Cualquiera");
  const [newMatPopoverOpen, setNewMatPopoverOpen] = useState(false);
  
  const [editProjectOpen, setEditProjectOpen] = useState<CadProject | null>(null);
  const [editProjName, setEditProjName] = useState("");
  const [editProjDesc, setEditProjDesc] = useState("");
  const [editProjCat, setEditProjCat] = useState("Prototipos");
  const [editProjMaterial, setEditProjMaterial] = useState("Cualquiera");
  const [editMatPopoverOpen, setEditMatPopoverOpen] = useState(false);
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadWeight, setUploadWeight] = useState("");
  const [uploadPrintTimeDays, setUploadPrintTimeDays] = useState("");
  const [uploadPrintTimeHrs, setUploadPrintTimeHrs] = useState("");
  const [uploadPrintTimeMins, setUploadPrintTimeMins] = useState("");
  
  const [editVersionOpen, setEditVersionOpen] = useState<CadFileVersion | null>(null);
  const [editVersionDesc, setEditVersionDesc] = useState("");
  const [editVersionFile, setEditVersionFile] = useState<File | null>(null);
  const [editVersionWeight, setEditVersionWeight] = useState("");
  const [editVersionPrintTimeDays, setEditVersionPrintTimeDays] = useState("");
  const [editVersionPrintTimeHrs, setEditVersionPrintTimeHrs] = useState("");
  const [editVersionPrintTimeMins, setEditVersionPrintTimeMins] = useState("");
  const [previewVersion, setPreviewVersion] = useState<CadFileVersion | null>(null);

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [renameItemOpen, setRenameItemOpen] = useState<{ id: string, type: 'file' | 'folder', currentName: string } | null>(null);
  const [newRenameName, setNewRenameName] = useState("");
  
  const [moveOpen, setMoveOpen] = useState<{ fileIds: string[], folderIds: string[] } | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>("root");

  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'file' | 'folder' } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSourceProj, setLinkSourceProj] = useState<string>("");
  const [linkSourceFile, setLinkSourceFile] = useState<string>("");

  const generateShortId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    projects.forEach((p: CadProject) => {
      const versionsWithoutId = (p.versions || []).filter(v => !v.shortId);
      if (versionsWithoutId.length > 0) {
        versionsWithoutId.forEach(v => {
          updateVersion(p.id, v.id, { shortId: generateShortId() });
        });
      }
    });
  }, [projects, updateVersion]);

  const selectProject = (p: CadProject | null) => {
    setActiveProjectId(p ? p.id : null);
    setCurrentFolderId(undefined);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  };

  const breadcrumbs = useMemo(() => {
    if (!activeProject) return [];
    const crumbs: CadFolder[] = [];
    let curr = currentFolderId;
    while (curr) {
      const folder = (activeProject.folders || []).find(f => f.id === curr);
      if (folder) {
        crumbs.unshift(folder);
        curr = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  }, [activeProject, currentFolderId]);

  const explorerFolders = useMemo(() => {
    if (!activeProject) return [];
    return (activeProject.folders || []).filter(f => f.parentId === currentFolderId).sort((a,b) => (a.name || "").localeCompare(b.name || ""));
  }, [activeProject, currentFolderId]);

  const explorerFiles = useMemo(() => {
    if (!activeProject) return [];
    return (activeProject.versions || []).filter(v => v.folderId === currentFolderId).sort((a,b) => (a.fileName || "").localeCompare(b.fileName || ""));
  }, [activeProject, currentFolderId]);

  const toggleFile = (id: string) => {
    const next = new Set(selectedFiles);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedFiles(next);
  }
  const toggleFolder = (id: string) => {
    const next = new Set(selectedFolders);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedFolders(next);
  }
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFolders(new Set(explorerFolders.map(f => f.id)));
      setSelectedFiles(new Set(explorerFiles.map(f => f.id)));
    } else {
      setSelectedFolders(new Set());
      setSelectedFiles(new Set());
    }
  }
  const allSelected = explorerFolders.length + explorerFiles.length > 0 && selectedFolders.size === explorerFolders.length && selectedFiles.size === explorerFiles.length;

  const handleCreateProject = () => {
    if(!newProjName.trim()) return toast.error("El nombre es requerido");
    addProject({
      id: uuid(),
      name: newProjName,
      description: newProjDesc,
      category: newProjCat,
      material: newProjMaterial,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
    } as any);
    toast.success("Proyecto CAD creado");
    setCreateOpen(false);
    setNewProjName("");
    setNewProjDesc("");
    setNewProjCat("Prototipos");
    setNewProjMaterial("Cualquiera");
  };
  
  const openEditProject = (p: CadProject) => {
    setEditProjectOpen(p);
    setEditProjName(p.name);
    setEditProjDesc(p.description || "");
    setEditProjCat(p.category || "Prototipos");
    setEditProjMaterial((p as any).material || "Cualquiera");
  };

  const handleEditProject = () => {
    if (!editProjectOpen) return;
    if (!editProjName.trim()) return toast.error("El nombre es requerido");
    const patch: any = { name: editProjName, description: editProjDesc, category: editProjCat, material: editProjMaterial, updatedAt: new Date().toISOString() };
    if (updateProject) updateProject(editProjectOpen.id, patch);
    toast.success("Proyecto CAD actualizado");
    setEditProjectOpen(null);
  };

  const handleUploadVersion = async () => {
    if(!activeProject) return;
    
    if (!uploadFile) {
      if (activeProject.versions && activeProject.versions.length > 0) {
        const latest = activeProject.versions.reduce((prev: any, current: any) => (prev.version > current.version) ? prev : current);
        updateVersion(activeProject.id, latest.id, {
          weight: uploadWeight ? Number(uploadWeight) : undefined,
          printTimeMinutes: (uploadPrintTimeDays || uploadPrintTimeHrs || uploadPrintTimeMins) ? (Number(uploadPrintTimeDays || 0) * 1440) + (Number(uploadPrintTimeHrs || 0) * 60) + Number(uploadPrintTimeMins || 0) : undefined,
          description: uploadDesc.trim() ? uploadDesc : latest.description
        });
        toast.success("Metadatos de la versión actualizados");
        setUploadOpen(false);
        setUploadDesc("");
        setUploadWeight("");
        setUploadPrintTimeDays("");
        setUploadPrintTimeHrs("");
        setUploadPrintTimeMins("");
        return;
      } else {
        return toast.error("Selecciona un archivo 3D/CAD");
      }
    }

    if(!uploadDesc.trim()) return toast.error("Añade una nota de revisión");
    
    setIsUploading(true);
    const toastId = toast.loading("Subiendo archivo al servidor local...");
    try {
      const b64 = await new Promise<string>((resolve) => {
        const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(uploadFile);
      });
      const res = await uploadFilesFn({ data: { files: [{ name: uploadFile.name, type: uploadFile.type || "application/octet-stream", base64: b64, size: uploadFile.size }] } });
      if (res.ok && res.data.length > 0) {
        const uploadedFile = res.data[0] as any;
        const actualUrl = typeof uploadedFile === 'string' ? uploadedFile : uploadedFile.url;
        const nextVerNum = (activeProject.versions || []).length > 0 ? Math.max(...(activeProject.versions || []).map(v => v.version || 1)) + 1 : 1;
        const newVer: CadFileVersion = {
          id: uuid(),
          shortId: generateShortId(),
          version: nextVerNum,
          description: uploadDesc,
          url: actualUrl,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.name || "Operador",
          folderId: currentFolderId,
          weight: uploadWeight ? Number(uploadWeight) : undefined,
          printTimeMinutes: (uploadPrintTimeDays || uploadPrintTimeHrs || uploadPrintTimeMins) ? (Number(uploadPrintTimeDays || 0) * 1440) + (Number(uploadPrintTimeHrs || 0) * 60) + Number(uploadPrintTimeMins || 0) : undefined,
          originalProjectId: (activeProject.versions || []).length > 0 ? activeProject.versions.reduce((prev: any, current: any) => (prev.version > current.version) ? prev : current).originalProjectId : undefined,
        };
        addVersion(activeProject.id, newVer);
        
        toast.success("Nueva revisión guardada físicamente", { id: toastId });
        setUploadOpen(false);
        setUploadFile(null);
        setUploadDesc("");
        setUploadWeight("");
        setUploadPrintTimeDays("");
        setUploadPrintTimeHrs("");
        setUploadPrintTimeMins("");
      } else {
        toast.error("Error al guardar archivo en el disco", { id: toastId });
      }
    } catch(e) {
      toast.error("Error de red durante la subida", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleEditVersion = async () => {
    if (!activeProject || !editVersionOpen) return;
    if (!editVersionDesc.trim()) return toast.error("Añade una nota de revisión");

    setIsUploading(true);
    let newUrl = editVersionOpen.url;
    let newFileName = editVersionOpen.fileName;
    let newFileSize = editVersionOpen.fileSize;

    if (editVersionFile) {
      const toastId = toast.loading("Subiendo nuevo archivo al servidor...");
      try {
        const b64 = await new Promise<string>((resolve) => {
          const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(editVersionFile);
        });
        const res = await uploadFilesFn({ data: { files: [{ name: editVersionFile.name, type: editVersionFile.type || "application/octet-stream", base64: b64, size: editVersionFile.size }] } });
        if (res.ok && res.data.length > 0) {
          const uploadedFile = res.data[0] as any;
          newUrl = typeof uploadedFile === 'string' ? uploadedFile : uploadedFile.url;
          newFileName = editVersionFile.name;
          newFileSize = editVersionFile.size;
          toast.success("Archivo actualizado", { id: toastId });
        } else {
          toast.error("Error al guardar archivo en el disco", { id: toastId });
          setIsUploading(false);
          return;
        }
      } catch (e) {
        toast.error("Error de red durante la subida", { id: toastId });
        setIsUploading(false);
        return;
      }
    }

    updateVersion(activeProject.id, editVersionOpen.id, {
      description: editVersionDesc,
      url: newUrl,
      fileName: newFileName,
      fileSize: newFileSize,
      folderId: editVersionOpen.folderId,
      weight: editVersionWeight ? Number(editVersionWeight) : undefined,
      printTimeMinutes: (editVersionPrintTimeDays || editVersionPrintTimeHrs || editVersionPrintTimeMins) ? (Number(editVersionPrintTimeDays || 0) * 1440) + (Number(editVersionPrintTimeHrs || 0) * 60) + Number(editVersionPrintTimeMins || 0) : undefined,
    });

    toast.success("Revisión actualizada");
    setEditVersionOpen(null);
    setEditVersionFile(null);
    setEditVersionDesc("");
    setEditVersionWeight("");
    setEditVersionPrintTimeDays("");
    setEditVersionPrintTimeHrs("");
    setEditVersionPrintTimeMins("");
    setIsUploading(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateFolder = () => {
    if (!activeProject || !newFolderName.trim()) return;
    addFolder(activeProject.id, {
      id: uuid(),
      name: newFolderName,
      parentId: currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setCreateFolderOpen(false);
    setNewFolderName("");
    toast.success("Carpeta creada");
  }

  const handleRename = () => {
    if (!renameItemOpen || !activeProject || !newRenameName.trim()) return;
    if (renameItemOpen.type === 'folder') updateFolder(activeProject.id, renameItemOpen.id, { name: newRenameName });
    else updateVersion(activeProject.id, renameItemOpen.id, { fileName: newRenameName });
    toast.success("Renombrado con éxito");
    setRenameItemOpen(null);
  };

  const handleMoveAction = () => {
    if (!moveOpen || !activeProject) return;
    const targetId = moveTarget === "root" ? undefined : moveTarget;
    if (moveOpen.fileIds.length > 0) moveItems(activeProject.id, moveOpen.fileIds, targetId);
    if (moveOpen.folderIds.length > 0) moveOpen.folderIds.forEach(fid => updateFolder(activeProject.id, fid, { parentId: targetId }));
    toast.success("Elementos movidos");
    setMoveOpen(null);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  };

  const handleLinkAccessory = () => {
    if (!activeProject || !linkSourceProj || !linkSourceFile) return;
    const sourceProj = projects.find(p => p.id === linkSourceProj);
    if (!sourceProj) return;
    const sourceFile = sourceProj.versions?.find(v => v.id === linkSourceFile);
    if (!sourceFile) return;

    const nextVerNum = (activeProject.versions || []).length > 0 ? Math.max(...(activeProject.versions || []).map(v => v.version || 1)) + 1 : 1;
    const newVer: CadFileVersion = {
      id: uuid(),
      shortId: generateShortId(),
      version: nextVerNum,
      description: `Vínculo de accesorio: ${sourceFile.fileName} (Desde ${sourceProj.name})`,
      url: sourceFile.url,
      fileName: sourceFile.fileName,
      fileSize: sourceFile.fileSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.name || "Operador",
      folderId: currentFolderId,
      weight: sourceFile.weight,
      printTimeMinutes: sourceFile.printTimeMinutes,
      originalProjectId: sourceProj.id,
    };
    addVersion(activeProject.id, newVer);
    toast.success("Accesorio vinculado correctamente");
    setLinkOpen(false);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedItem || !activeProject || draggedItem.id === targetFolderId) return;
    if (draggedItem.type === 'file') {
      moveItems(activeProject.id, [draggedItem.id], targetFolderId);
    } else {
      updateFolder(activeProject.id, draggedItem.id, { parentId: targetFolderId });
    }
    setDraggedItem(null);
  };

  const filteredProjects: CadProject[] = projects.filter((p: CadProject) => (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-indigo-500">
            <Box className="h-6 w-6" /> Bóveda CAD y G-Code
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestor documental físico con control de versiones para tus modelos 3D y rutinas G-Code.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar modelos..." 
              className="pl-8 bg-card w-[200px] lg:w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      {!activeProject ? (
        <div className="grid grid-cols-1 gap-6 items-start">
          {filteredProjects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-muted/20">
              <FileBox className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <h2 className="text-xl font-bold mb-2">Bóveda Vacía</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">No has creado ningún proyecto CAD. Sube tu primer modelo STL o archivo G-Code.</p>
              <Button onClick={() => setCreateOpen(true)} variant="outline" className="border-indigo-500 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                <Plus className="h-4 w-4 mr-2" /> Crear Proyecto
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((p: any) => {
                const latestVersion = (p.versions || []).length > 0 ? (p.versions || [])[0] : null;
                const isActive = activeProject?.id === p.id;
                
                return (
                  <Card 
                    key={p.id} 
                    className={`cursor-pointer transition-all hover:shadow-md hover:border-indigo-500/30 relative group`}
                    onClick={() => selectProject(p)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base truncate" title={p.name}>{p.name}</CardTitle>
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <Badge variant="outline" className="bg-muted text-[10px]">{p.category}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditProject(p)}><Edit className="mr-2 h-4 w-4"/> Editar Proyecto</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => { if(confirm("¿Eliminar proyecto y todo su contenido permanentemente?")) { if (removeProject) removeProject(p.id); } }}><Trash2 className="mr-2 h-4 w-4"/> Eliminar Proyecto</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-1 min-h-[32px]">{p.description || "Sin descripción"}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-dashed">
                        <div className="flex items-center text-muted-foreground">
                          <History className="h-3.5 w-3.5 mr-1" /> {(p.versions || []).length} {(p.versions || []).length === 1 ? 'Revisión' : 'Revisiones'}
                        </div>
                        {latestVersion ? (
                          <span className="font-semibold text-indigo-600">v{latestVersion.version}.0</span>
                        ) : (
                          <span className="text-muted-foreground italic">Vacío</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <Card className="flex flex-col h-[calc(100vh-140px)] border-indigo-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => selectProject(null)}><ArrowLeft className="h-4 w-4" /></Button>
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                <span className="cursor-pointer hover:text-foreground transition-colors font-bold text-indigo-600" onClick={() => setCurrentFolderId(undefined)}>{activeProject.name}</span>
                {breadcrumbs.map(b => (
                  <React.Fragment key={b.id}>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <span className="cursor-pointer hover:text-foreground transition-colors font-semibold text-indigo-500" onClick={() => setCurrentFolderId(b.id)}>{b.name}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(selectedFiles.size > 0 || selectedFolders.size > 0) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMoveOpen({ fileIds: Array.from(selectedFiles), folderIds: Array.from(selectedFolders) })}>
                    <MoveRight className="h-4 w-4 mr-2" /> Mover
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => {
                    if (confirm("¿Eliminar elementos seleccionados permanentemente?")) {
                      removeMultipleItems(activeProject.id, Array.from(selectedFiles), Array.from(selectedFolders));
                      setSelectedFiles(new Set());
                      setSelectedFolders(new Set());
                    }
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" /> Nueva Carpeta
              </Button>
              <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900" onClick={() => { setLinkSourceProj(""); setLinkSourceFile(""); setLinkOpen(true); }}>
                <LinkIcon className="h-4 w-4 mr-2" /> Vincular
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { 
                setUploadFile(null); 
                setUploadDesc(""); 
                if (activeProject && activeProject.versions && activeProject.versions.length > 0) {
                  const latest = activeProject.versions.reduce((prev: any, current: any) => (prev.version > current.version) ? prev : current);
                  setUploadWeight(latest.weight ? String(latest.weight) : "");
                  if (latest.printTimeMinutes) {
                    setUploadPrintTimeDays(String(Math.floor(latest.printTimeMinutes / 1440)));
                    setUploadPrintTimeHrs(String(Math.floor((latest.printTimeMinutes % 1440) / 60)));
                    setUploadPrintTimeMins(String(latest.printTimeMinutes % 60));
                  } else {
                    setUploadPrintTimeDays("");
                    setUploadPrintTimeHrs("");
                    setUploadPrintTimeMins("");
                  }
                } else {
                  setUploadWeight("");
                  setUploadPrintTimeDays("");
                  setUploadPrintTimeHrs("");
                  setUploadPrintTimeMins("");
                }
                setUploadOpen(true); 
              }}>
                <Upload className="h-4 w-4 mr-2" /> Subir Archivo
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditProject(activeProject)}><Edit className="mr-2 h-4 w-4"/> Editar Proyecto</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => { if(confirm("¿Eliminar proyecto y todo su contenido permanentemente?")) { if(removeProject) removeProject(activeProject.id); setActiveProjectId(null); } }}><Trash2 className="mr-2 h-4 w-4"/> Eliminar Proyecto</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/10">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                <TableRow>
                  <TableHead className="w-[40px] px-4"><Checkbox checked={allSelected} onCheckedChange={handleSelectAll} /></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Modificado</TableHead>
                  <TableHead className="w-[80px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {explorerFolders.length === 0 && explorerFiles.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center py-12 text-muted-foreground bg-background">
                       <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                       Esta carpeta está vacía.
                     </TableCell>
                   </TableRow>
                )}

                {explorerFolders.map((folder: CadFolder) => (
                  <TableRow 
                    key={folder.id} 
                    className={`cursor-pointer group bg-background ${dragOverId === folder.id ? 'bg-indigo-500/10 border-indigo-500' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(folder.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    onClick={() => { setCurrentFolderId(folder.id); setSelectedFiles(new Set()); setSelectedFolders(new Set()); }}
                  >
                     <TableCell className="px-4" onClick={e => e.stopPropagation()}>
                       <Checkbox checked={selectedFolders.has(folder.id)} onCheckedChange={() => toggleFolder(folder.id)} />
                     </TableCell>
                     <TableCell className="font-medium">
                        <div draggable onDragStart={(e) => { e.stopPropagation(); setDraggedItem({ id: folder.id, type: 'folder' }) }} className="flex items-center gap-2 cursor-grab active:cursor-grabbing w-fit">
                           <Folder className="h-5 w-5 text-indigo-400 fill-indigo-400/20" />
                           {folder.name}
                        </div>
                     </TableCell>
                     <TableCell className="text-muted-foreground">—</TableCell>
                     <TableCell className="text-muted-foreground">{new Date(folder.updatedAt).toLocaleDateString()}</TableCell>
                     <TableCell className="text-right px-4" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4"/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setRenameItemOpen({ id: folder.id, type: 'folder', currentName: folder.name }); setNewRenameName(folder.name); }}><Type className="mr-2 h-4 w-4"/> Renombrar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setMoveOpen({ fileIds: [], folderIds: [folder.id] })}><MoveRight className="mr-2 h-4 w-4"/> Mover a...</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => { if(confirm("¿Eliminar carpeta y su contenido?")) removeFolder(activeProject.id, folder.id); }}><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </TableCell>
                  </TableRow>
                ))}

                {explorerFiles.map((file: CadFileVersion) => {
                   const isImg = file.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                   const isModel = file.fileName.match(/\.(stl|obj|3mf|step)$/i);
                   const isGcode = file.fileName.match(/\.(gcode)$/i);
                   return (
                    <TableRow key={file.id} className="cursor-default group bg-background hover:bg-muted/30 transition-colors" onDoubleClick={() => (isModel || isImg) ? setPreviewVersion(file) : null}>
                       <TableCell className="px-4">
                         <Checkbox checked={selectedFiles.has(file.id)} onCheckedChange={() => toggleFile(file.id)} />
                       </TableCell>
                       <TableCell className="font-medium">
                          <div draggable onDragStart={(e) => { e.stopPropagation(); setDraggedItem({ id: file.id, type: 'file' }) }} className="flex flex-col cursor-grab active:cursor-grabbing w-fit" onClick={() => (isModel || isImg) ? setPreviewVersion(file) : null}>
                             <div className="flex items-center gap-2">
                               {isImg ? <FileImage className="h-5 w-5 text-sky-500" /> : isGcode ? <FileCode className="h-5 w-5 text-emerald-500" /> : isModel ? <Box className="h-5 w-5 text-indigo-500" /> : <FileIcon className="h-5 w-5 text-slate-500" />}
                               <span className={(isModel || isImg) ? 'hover:underline cursor-pointer' : ''}>{file.fileName}</span>
                               {file.shortId && <Badge variant="outline" className="font-mono text-[9px] px-1 h-4 shadow-none bg-background">#{file.shortId}</Badge>}
                               <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-200 shadow-none text-[9px] px-1 h-4">v{file.version}</Badge>
                               {file.description?.startsWith("Vínculo de accesorio:") && <span title={file.description}><LinkIcon className="h-3 w-3 text-indigo-400" /></span>}
                             </div>
                             {(file.weight || file.printTimeMinutes) && (
                               <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-7 mt-0.5 font-mono">
                                 {file.weight ? <span>⚖️ {file.weight}g</span> : null}
                                 {file.printTimeMinutes ? <span>⏱️ {Math.floor(file.printTimeMinutes/1440) > 0 ? `${Math.floor(file.printTimeMinutes/1440)}d ` : ''}{Math.floor((file.printTimeMinutes%1440)/60)}h {file.printTimeMinutes%60}m</span> : null}
                               </div>
                             )}
                          </div>
                       </TableCell>
                       <TableCell className="text-muted-foreground">{formatBytes(file.fileSize)}</TableCell>
                       <TableCell className="text-muted-foreground">
                         <div className="flex flex-col">
                           <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                           <span className="text-[10px] text-muted-foreground font-semibold">{file.uploadedBy}</span>
                         </div>
                       </TableCell>
                       <TableCell className="text-right px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(isModel || isImg) && <DropdownMenuItem onClick={() => setPreviewVersion(file)}><Eye className="mr-2 h-4 w-4"/> {isImg ? "Ver Imagen" : "Ver WebGL"}</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => { const url = typeof file.url === 'string' ? file.url : (file.url as any)?.url; window.open(url, '_blank'); }}><Download className="mr-2 h-4 w-4"/> Descargar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { 
                                setEditVersionDesc(file.description || ""); 
                                setEditVersionFile(null); 
                                setEditVersionWeight(file.weight ? String(file.weight) : "");
                                if (file.printTimeMinutes) {
                                  setEditVersionPrintTimeDays(String(Math.floor(file.printTimeMinutes / 1440)));
                                  setEditVersionPrintTimeHrs(String(Math.floor((file.printTimeMinutes % 1440) / 60)));
                                  setEditVersionPrintTimeMins(String(file.printTimeMinutes % 60));
                                } else {
                                  setEditVersionPrintTimeDays("");
                                  setEditVersionPrintTimeHrs("");
                                  setEditVersionPrintTimeMins("");
                                }
                                setEditVersionOpen(file); 
                              }}><Edit className="mr-2 h-4 w-4"/> Editar detalles</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setMoveOpen({ fileIds: [file.id], folderIds: [] })}><MoveRight className="mr-2 h-4 w-4"/> Mover a...</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => { if(confirm("¿Eliminar archivo permanentemente?")) removeVersion(activeProject.id, file.id); }}><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </TableCell>
                    </TableRow>
                   );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Nuevo Proyecto CAD</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la Pieza / Proyecto</Label>
              <Input value={newProjName} onChange={e => setNewProjName(e.target.value)} placeholder="Ej. Soporte Extrusor MK2" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={newProjCat} onValueChange={setNewProjCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prototipos">Prototipos</SelectItem>
                  <SelectItem value="Producción">Producción en Masa</SelectItem>
                  <SelectItem value="Refacciones">Refacciones Internas</SelectItem>
                  <SelectItem value="Utillaje">Herramientas/Utillaje</SelectItem>
                  <SelectItem value="Cliente Externo">Cliente Externo</SelectItem>
                  <SelectItem value="Accesorios">Accesorios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material Predeterminado</Label>
              <Popover open={newMatPopoverOpen} onOpenChange={setNewMatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-background">
                    {newProjMaterial === "Cualquiera" ? "Cualquiera / Sin restricción" : newProjMaterial}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] sm:w-[450px] p-0" align="start">
                  <ScrollArea className="h-[350px]">
                    <div className="p-4 grid gap-5">
                      <Button variant="outline" className="w-full border-dashed" onClick={() => { setNewProjMaterial("Cualquiera"); setNewMatPopoverOpen(false); }}>
                        Cualquiera / Sin restricción
                      </Button>
                      {MATERIAL_CATEGORIES.map(cat => (
                        <div key={cat.name} className="space-y-2.5">
                          <div className="flex items-center gap-2 border-b pb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${cat.color} shadow-sm`} />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {cat.items.map(item => (
                              <div key={item.id} onClick={() => { setNewProjMaterial(item.id); setNewMatPopoverOpen(false); }} className={`text-xs p-2.5 rounded-md border cursor-pointer transition-colors shadow-sm ${newProjMaterial === item.id ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted/30 hover:bg-muted/60 hover:border-primary/50'}`}>
                                {item.id}
                                <div className={`text-[10px] mt-0.5 ${newProjMaterial === item.id ? 'text-primary/70 font-medium' : 'text-muted-foreground font-normal'}`}>{item.name}</div>
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
            <div className="space-y-2">
              <Label>Descripción Breve</Label>
              <Textarea value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} placeholder="Ej. Montaje reforzado para impresoras delta." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateProject} className="bg-indigo-600 hover:bg-indigo-700 text-white">Crear Bóveda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProjectOpen} onOpenChange={o => { if(!o) setEditProjectOpen(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Editar Proyecto CAD</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la Pieza / Proyecto</Label>
              <Input value={editProjName} onChange={e => setEditProjName(e.target.value)} placeholder="Ej. Soporte Extrusor MK2" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={editProjCat} onValueChange={setEditProjCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prototipos">Prototipos</SelectItem>
                  <SelectItem value="Producción">Producción en Masa</SelectItem>
                  <SelectItem value="Refacciones">Refacciones Internas</SelectItem>
                  <SelectItem value="Utillaje">Herramientas/Utillaje</SelectItem>
                  <SelectItem value="Cliente Externo">Cliente Externo</SelectItem>
                  <SelectItem value="Accesorios">Accesorios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material Predeterminado</Label>
              <Popover open={editMatPopoverOpen} onOpenChange={setEditMatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-background">
                    {editProjMaterial === "Cualquiera" ? "Cualquiera / Sin restricción" : editProjMaterial}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] sm:w-[450px] p-0" align="start">
                  <ScrollArea className="h-[350px]">
                    <div className="p-4 grid gap-5">
                      <Button variant="outline" className="w-full border-dashed" onClick={() => { setEditProjMaterial("Cualquiera"); setEditMatPopoverOpen(false); }}>
                        Cualquiera / Sin restricción
                      </Button>
                      {MATERIAL_CATEGORIES.map(cat => (
                        <div key={cat.name} className="space-y-2.5">
                          <div className="flex items-center gap-2 border-b pb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${cat.color} shadow-sm`} />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {cat.items.map(item => (
                              <div key={item.id} onClick={() => { setEditProjMaterial(item.id); setEditMatPopoverOpen(false); }} className={`text-xs p-2.5 rounded-md border cursor-pointer transition-colors shadow-sm ${editProjMaterial === item.id ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted/30 hover:bg-muted/60 hover:border-primary/50'}`}>
                                {item.id}
                                <div className={`text-[10px] mt-0.5 ${editProjMaterial === item.id ? 'text-primary/70 font-medium' : 'text-muted-foreground font-normal'}`}>{item.name}</div>
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
            <div className="space-y-2">
              <Label>Descripción Breve</Label>
              <Textarea value={editProjDesc} onChange={e => setEditProjDesc(e.target.value)} placeholder="Ej. Montaje reforzado para impresoras delta." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectOpen(null)}>Cancelar</Button>
            <Button onClick={handleEditProject} className="bg-indigo-600 hover:bg-indigo-700 text-white">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={o => !o && !isUploading && setUploadOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Subir Revisión de Diseño</DialogTitle>
            <DialogDescription>
              Añade un nuevo archivo de iteración para ({activeProject?.name}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Archivo Físico (.stl, .3mf, .gcode, .step) {activeProject?.versions && activeProject.versions.length > 0 && <span className="text-muted-foreground font-normal">(Opcional para actualizar datos)</span>}</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 hover:bg-muted/30 transition-colors">
                <Input 
                  type="file" 
                  className="hidden" 
                  id="cad-upload"
                  onChange={e => { if(e.target.files?.length) setUploadFile(e.target.files[0]); }}
                />
                <Label htmlFor="cad-upload" className="cursor-pointer flex flex-col items-center text-center">
                  <Upload className="h-8 w-8 text-indigo-500 mb-2" />
                  <span className="text-sm font-medium text-indigo-600">Haz clic para buscar archivo</span>
                  <span className="text-xs text-muted-foreground mt-1 px-4 text-center break-all">
                    {uploadFile ? uploadFile.name : "Archivos soportados: STL, STEP, 3MF, GCODE. Sin límite de tamaño."}
                  </span>
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Peso (g)</Label>
                <Input type="number" min="0" value={uploadWeight} onChange={e => setUploadWeight(e.target.value)} placeholder="Ej. 150" />
              </div>
              <div className="space-y-1.5">
                <Label>Días (d)</Label>
                <Input type="number" min="0" value={uploadPrintTimeDays} onChange={e => setUploadPrintTimeDays(e.target.value)} placeholder="Ej. 1" />
              </div>
              <div className="space-y-1.5">
                <Label>Horas (h)</Label>
                <Input type="number" min="0" value={uploadPrintTimeHrs} onChange={e => setUploadPrintTimeHrs(e.target.value)} placeholder="Ej. 10" />
              </div>
              <div className="space-y-1.5">
                <Label>Mins (m)</Label>
                <Input type="number" min="0" max="59" value={uploadPrintTimeMins} onChange={e => setUploadPrintTimeMins(e.target.value)} placeholder="Ej. 30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas de esta versión / Changelog</Label>
              <Textarea 
                value={uploadDesc} 
                onChange={e => setUploadDesc(e.target.value)} 
                placeholder="Ej. Se aumentaron las tolerancias de los agujeros M3 a 3.2mm y se reforzó la base..." 
                rows={4} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>Cancelar</Button>
            <Button onClick={handleUploadVersion} disabled={isUploading || (!uploadFile && (!activeProject?.versions || activeProject.versions.length === 0)) || (!!uploadFile && !uploadDesc.trim())} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isUploading ? "Transfiriendo..." : (!uploadFile && activeProject?.versions && activeProject.versions.length > 0) ? "Actualizar Datos" : "Guardar Revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVersionOpen} onOpenChange={o => !o && !isUploading && setEditVersionOpen(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Revisión v{editVersionOpen?.version}</DialogTitle>
            <DialogDescription>
              Modifica las notas o sube un nuevo archivo para reemplazar el existente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Reemplazar Archivo Físico (Opcional)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/10 hover:bg-muted/30 transition-colors">
                <Input 
                  type="file" 
                  className="hidden" 
                  id="cad-edit-upload"
                  onChange={e => { if(e.target.files?.length) setEditVersionFile(e.target.files[0]); }}
                />
                <Label htmlFor="cad-edit-upload" className="cursor-pointer flex flex-col items-center text-center">
                  <Upload className="h-8 w-8 text-indigo-500 mb-2" />
                  <span className="text-sm font-medium text-indigo-600">Haz clic para buscar nuevo archivo</span>
                  <span className="text-xs text-muted-foreground mt-1 px-4 text-center break-all">
                    {editVersionFile ? editVersionFile.name : `Actual: ${editVersionOpen?.fileName}`}
                  </span>
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Peso (g)</Label>
                <Input type="number" min="0" value={editVersionWeight} onChange={e => setEditVersionWeight(e.target.value)} placeholder="Ej. 150" />
              </div>
              <div className="space-y-1.5">
                <Label>Días (d)</Label>
                <Input type="number" min="0" value={editVersionPrintTimeDays} onChange={e => setEditVersionPrintTimeDays(e.target.value)} placeholder="Ej. 1" />
              </div>
              <div className="space-y-1.5">
                <Label>Horas (h)</Label>
                <Input type="number" min="0" value={editVersionPrintTimeHrs} onChange={e => setEditVersionPrintTimeHrs(e.target.value)} placeholder="Ej. 10" />
              </div>
              <div className="space-y-1.5">
                <Label>Mins (m)</Label>
                <Input type="number" min="0" max="59" value={editVersionPrintTimeMins} onChange={e => setEditVersionPrintTimeMins(e.target.value)} placeholder="Ej. 30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas de esta versión / Changelog</Label>
              <Textarea value={editVersionDesc} onChange={e => setEditVersionDesc(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVersionOpen(null)} disabled={isUploading}>Cancelar</Button>
            <Button onClick={handleEditVersion} disabled={isUploading || !editVersionDesc.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isUploading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Nueva Carpeta</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Nombre de la carpeta</Label>
            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Ej. Modelos V2" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFolder} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!newFolderName.trim()}>Crear Carpeta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameItemOpen} onOpenChange={o => !o && setRenameItemOpen(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Renombrar {renameItemOpen?.type === 'folder' ? 'Carpeta' : 'Archivo'}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Nuevo nombre</Label>
            <Input value={newRenameName} onChange={e => setNewRenameName(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameItemOpen(null)}>Cancelar</Button>
            <Button onClick={handleRename} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!newRenameName.trim()}>Renombrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveOpen} onOpenChange={o => !o && setMoveOpen(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Mover Elementos</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Carpeta Destino</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">/ (Raíz del proyecto)</SelectItem>
                {activeProject?.folders?.filter(f => !moveOpen?.folderIds.includes(f.id)).map(f => (
                   <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(null)}>Cancelar</Button>
            <Button onClick={handleMoveAction} className="bg-indigo-600 hover:bg-indigo-700 text-white">Mover aquí</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Vincular Accesorio</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Proyecto Origen (Librería)</Label>
              <Select value={linkSourceProj} onValueChange={(val) => { setLinkSourceProj(val); setLinkSourceFile(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proyecto..." /></SelectTrigger>
                <SelectContent>
                  {projects.filter(p => p.id !== activeProject?.id && ['Refacciones', 'Utillaje', 'Accesorios', 'Categoría', 'Categoria'].includes(p.category || '')).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {projects.filter(p => p.id !== activeProject?.id && ['Refacciones', 'Utillaje', 'Accesorios', 'Categoría', 'Categoria'].includes(p.category || '')).length === 0 && (
                    <SelectItem value="none" disabled>Sin librerías disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archivo a Vincular</Label>
              <Select value={linkSourceFile} onValueChange={setLinkSourceFile} disabled={!linkSourceProj}>
                <SelectTrigger><SelectValue placeholder="Seleccionar archivo..." /></SelectTrigger>
                <SelectContent>
                  {projects.find(p => p.id === linkSourceProj)?.versions?.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.fileName} (v{v.version})</SelectItem>
                  ))}
                  {projects.find(p => p.id === linkSourceProj)?.versions?.length === 0 && (
                    <SelectItem value="none" disabled>No hay archivos</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button onClick={handleLinkAccessory} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!linkSourceFile}>Crear Vínculo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewVersion} onOpenChange={o => !o && setPreviewVersion(null)}>
        <DialogContent className="sm:max-w-4xl h-[80vh] p-0 flex flex-col overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b shrink-0 bg-card z-10 flex flex-row items-center justify-between shadow-sm space-y-0">
            <div className="flex flex-col gap-1">
               <DialogTitle className="flex items-center gap-2 text-indigo-500">
                 {previewVersion?.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <FileImage className="h-5 w-5"/> : <Box className="h-5 w-5"/>}
                 {previewVersion?.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "Visor de Imagen" : "Visor 3D WebGL"}
               </DialogTitle>
               <DialogDescription className="font-mono text-xs">{previewVersion?.fileName}</DialogDescription>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm ml-4">v{previewVersion?.version}.0</Badge>
          </DialogHeader>
          <div className="flex-1 relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 overflow-hidden flex items-center justify-center">
            {previewVersion && previewVersion.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
              <img src={previewVersion.url} alt={previewVersion.fileName} className="max-w-full max-h-full object-contain drop-shadow-md p-4" />
            ) : previewVersion ? (
              <StlViewer url={previewVersion.url} className="w-full h-full" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}