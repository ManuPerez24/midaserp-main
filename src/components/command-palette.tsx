import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Calculator,
  FileText,
  Settings,
  User,
  Package,
  Boxes,
  Info,
  TerminalSquare
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "/") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Escribe un comando o busca un módulo..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>

        {/* Sección de aprendizaje para usuarios nuevos */}
        <CommandGroup heading="¿Cómo usar la Paleta de Comandos?">
          <CommandItem disabled className="opacity-100 data-[disabled]:opacity-100">
            <Info className="mr-2 h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground text-sm">
              Usa <kbd className="bg-muted px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono">↑</kbd> y <kbd className="bg-muted px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono">↓</kbd> para moverte. Presiona <kbd className="bg-muted px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono">Enter</kbd> para seleccionar.
            </span>
          </CommandItem>
          <CommandItem disabled className="opacity-100 data-[disabled]:opacity-100">
            <TerminalSquare className="mr-2 h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground text-sm">
              Puedes escribir "Inventario", "Crear Cotización" o "Ajustes" para saltar instantáneamente.
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegación Rápida">
          <CommandItem onSelect={() => runCommand(() => navigate({ to: '/' }))}>
            <Calculator className="mr-2 h-4 w-4" />
            <span>Dashboard (Inicio)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: '/inventario' }))}>
            <Package className="mr-2 h-4 w-4" />
            <span>Ir a Inventario</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: '/cotizaciones' }))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Ir a Cotizaciones</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: '/clientes' }))}>
            <User className="mr-2 h-4 w-4" />
            <span>Ir a Clientes</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate({ to: '/kits' }))}>
            <Boxes className="mr-2 h-4 w-4" />
            <span>Ir a Kits</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        
        <CommandGroup heading="Acciones">
          <CommandItem onSelect={() => runCommand(() => navigate({ to: '/ajustes' }))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Ajustes del Sistema</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}