import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, Search, PlusCircle, Package, FolderKanban, Factory, HelpCircle } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setWorkspace = useWorkspace((s) => s.setWorkspace);
  const activeWorkspace = useWorkspace((s) => s.activeWorkspace);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo dentro de un input o textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Shift + ? -> Abrir el panel de ayuda de atajos
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      
      // Alt + N -> Ir a Cotizaciones (Nueva)
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate({ to: "/cotizaciones" });
      }

      // Alt + I -> Abrir Inventario
      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        navigate({ to: "/inventario" });
      }

      // Alt + P -> Abrir Proyectos
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        navigate({ to: "/proyectos" });
      }

      // Alt + M -> Cambiar Workspace (Midas ERP <-> Midas 3D)
      if (e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setWorkspace(activeWorkspace === "erp" ? "3d" : "erp");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, activeWorkspace, setWorkspace]);

  const shortcuts = [
    { keys: ["Ctrl / Cmd", "K"], description: "Abrir Paleta de Comandos / Búsqueda", icon: <Search className="h-4 w-4" /> },
    { keys: ["Shift", "?"], description: "Mostrar este panel de atajos", icon: <HelpCircle className="h-4 w-4" /> },
    { keys: ["Alt", "N"], description: "Ir a Cotizaciones (Nueva)", icon: <PlusCircle className="h-4 w-4" /> },
    { keys: ["Alt", "I"], description: "Abrir el Inventario", icon: <Package className="h-4 w-4" /> },
    { keys: ["Alt", "P"], description: "Abrir Proyectos / Gantt", icon: <FolderKanban className="h-4 w-4" /> },
    { keys: ["Alt", "M"], description: "Alternar entre Midas ERP y Fábrica 3D", icon: <Factory className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" /> Atajos de Teclado
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-md shadow-sm border text-primary">
                  {shortcut.icon}
                </div>
                <span className="font-medium text-sm">{shortcut.description}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((k, j) => (
                  <span key={j} className="px-2 py-1 bg-background border shadow-sm rounded text-xs font-mono font-bold text-muted-foreground">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground mt-2">
          Puedes presionar <kbd className="px-1.5 py-0.5 bg-muted border rounded font-mono font-bold text-foreground">Shift + ?</kbd> en cualquier momento para ver esta ventana.
        </div>
      </DialogContent>
    </Dialog>
  );
}
