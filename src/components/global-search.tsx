import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, FileText, Users, Boxes, Search, Info, TerminalSquare, Calculator, Settings, PlusCircle } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/stores/inventory";
import { useClients } from "@/stores/clients";
import { useKits } from "@/stores/kits";
import { useQuotes } from "@/stores/quotes";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const products = useInventory((s) => s.products);
  const clients = useClients((s) => s.clients);
  const kits = useKits((s) => s.kits);
  const quotes = useQuotes((s) => s.quotes);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => {
          if (!o) setSearch(""); // Limpiar al abrir por atajo
          return !o;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setSearch(""); // Limpiar al navegar
    navigate({ to: path });
  };

  const topProducts = useMemo(() => products.slice(0, 50), [products]);
  const topClients = useMemo(() => clients.slice(0, 50), [clients]);
  const topKits = useMemo(() => kits.slice(0, 50), [kits]);
  const topQuotes = useMemo(() => quotes.slice(0, 50), [quotes]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Buscar (Ctrl+K)"
        onClick={() => {
          setSearch("");
          setOpen(true);
        }}
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog 
        open={open} 
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearch(""); // Limpiar al cerrar haciendo click fuera
        }}
      >
        <CommandInput 
          placeholder="Buscar cotizaciones, productos, clientes..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>

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
                Busca un producto por SKU, un cliente por nombre, o navega entre módulos.
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Acciones Rápidas">
            <CommandItem onSelect={() => { sessionStorage.setItem("autoOpenCreate", "true"); go('/cotizaciones'); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Crear nueva cotización</span>
            </CommandItem>
            <CommandItem onSelect={() => { sessionStorage.setItem("autoOpenCreate", "true"); go('/inventario'); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Crear nuevo producto</span>
            </CommandItem>
            <CommandItem onSelect={() => { sessionStorage.setItem("autoOpenCreate", "true"); go('/kits'); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Crear nuevo kit</span>
            </CommandItem>
            <CommandItem onSelect={() => { sessionStorage.setItem("autoOpenCreate", "true"); go('/clientes'); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Crear nuevo cliente</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navegación Rápida">
            <CommandItem onSelect={() => go('/')}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Ir a Dashboard (Inicio)</span>
            </CommandItem>
            <CommandItem onSelect={() => go('/inventario')}>
              <Package className="mr-2 h-4 w-4" />
              <span>Ir a Inventario</span>
            </CommandItem>
            <CommandItem onSelect={() => go('/cotizaciones')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Ir a Cotizaciones</span>
            </CommandItem>
            <CommandItem onSelect={() => go('/ajustes')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Ir a Ajustes</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {topQuotes.length > 0 && (
            <CommandGroup heading="Cotizaciones">
              {topQuotes.map((q) => {
                const c = clients.find((x) => x.id === q.clientId);
                return (
                  <CommandItem
                    key={q.id}
                    value={`${q.folio} ${c?.receiver ?? ""} ${c?.company ?? ""}`}
                    onSelect={() => go(`/cotizaciones/${q.id}`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="font-mono">{q.folio}</span>
                    <span className="ml-2 text-muted-foreground">
                      {c?.receiver ?? "Sin cliente"}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {topProducts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Inventario">
                {topProducts.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.sku} ${p.partNumber} ${p.name}`}
                    onSelect={() => go("/inventario")}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <span>{p.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {p.sku}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {topClients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {topClients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.receiver} ${c.company} ${c.email}`}
                    onSelect={() => go("/clientes")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{c.receiver}</span>
                    {c.company && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.company}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {topKits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Kits">
                {topKits.map((k) => (
                  <CommandItem
                    key={k.id}
                    value={`${k.name} ${k.description}`}
                    onSelect={() => go("/kits")}
                  >
                    <Boxes className="mr-2 h-4 w-4" />
                    {k.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
