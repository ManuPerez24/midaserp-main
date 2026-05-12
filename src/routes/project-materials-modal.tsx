import { useState } from "react";
import { useProjects, type Project } from "@/stores/projects";
import { useInventory } from "@/stores/inventory";
import { useSettings } from "@/stores/settings";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ProjectMaterialsModal({ children, project, open, onOpenChange }: { children?: React.ReactNode, project: Project, open?: boolean, onOpenChange?: (open: boolean) => void }) {
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