import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, ExternalLink, Pencil, Plus, Trash2, Filter, Sparkles, QrCode, TrendingUp, History, MoreHorizontal, X, Download, Copy, ScanLine, Package } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/data-table";
import { ProductForm } from "@/components/product-form";
import { useInventory } from "@/stores/inventory";
import { useActiveTask } from "@/stores/active-task";
import { useQuotes } from "@/stores/quotes";
import { useKits } from "@/stores/kits";
import { useProjects } from "@/stores/projects";
import { logAction } from "@/stores/audit-log";
import { useSettings } from "@/stores/settings";
import { formatMoney } from "@/lib/utils";
import { generateDemoProducts } from "@/lib/demo-data";
import { LabelsDialog } from "@/components/labels-dialog";
import { PriceHistoryDialog } from "@/components/price-history-dialog";
import { AnalyzeSupplierQuoteDialog } from "@/components/analyze-supplier-quote-dialog";
import { formatDate, cn } from "@/lib/utils";
import { getProductCategories, type Product } from "@/lib/types";
import { useCan } from "@/lib/use-can";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { PageGuard } from "@/components/page-guard";

export const Route = createFileRoute("/inventario")({
  head: () => ({ meta: [{ title: `Inventario · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:inventario">
      <InventarioPage />
    </PageGuard>
  ),
});

function RadialMenuOverlay({
  open,
  coords,
  onClose,
  actions,
}: {
  open: boolean;
  coords: { x: number; y: number };
  onClose: () => void;
  actions: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
    isPrimary?: boolean;
  }[];
}) {
  if (!open || typeof document === "undefined") return null;

  const validActions = actions.filter((a) => !a.disabled);
  const sortedActions = [...validActions].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background/20 backdrop-blur-[1px] animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {sortedActions.map((a, i) => {
        const angle = (i / sortedActions.length) * 360 - 90;
        const radius = 75;
        const x = coords.x + Math.cos((angle * Math.PI) / 180) * radius;
        const y = coords.y + Math.sin((angle * Math.PI) / 180) * radius;
        const sizeClass = a.isPrimary ? "h-14 w-14" : "h-11 w-11";
        const iconWrapperClass = a.isPrimary ? "[&>svg]:h-6 [&>svg]:w-6" : "";
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center animate-in zoom-in duration-300 hover:z-50"
            style={{
              left: x,
              top: y,
              animationFillMode: "both",
              animationDelay: `${i * 15}ms`,
            }}
          >
            <button
              aria-label={a.label}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
                onClose();
              }}
              className={`peer flex ${sizeClass} items-center justify-center rounded-full bg-background border shadow-xl transition-all hover:scale-110 ${
                a.color || "text-foreground hover:text-primary"
              }`}
            >
              <div className={iconWrapperClass}>{a.icon}</div>
            </button>
            <span className="pointer-events-none absolute top-[calc(100%+8px)] opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-popover/95 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md border">
              {a.label}
            </span>
          </div>
        );
      })}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform animate-in zoom-in duration-200"
        style={{ left: coords.x, top: coords.y }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Cerrar menú"
      >
        <X className="h-5 w-5" />
      </div>
    </div>,
    document.body
  );
}

function InventarioPage() {
  const products = useInventory((s) => s.products);
  const addProduct = useInventory((s) => s.add);
  const updateProduct = useInventory((s) => s.update);
  const removeProduct = useInventory((s) => s.remove);
  const removeManyProducts = useInventory((s) => s.removeMany);
  const bulkLoad = useInventory((s) => s.bulkLoad);

  const settings = useSettings((s) => s.settings);
  const active = useActiveTask((s) => s.active);
  const addToQuote = useQuotes((s) => s.addProduct);
  const addToKit = useKits((s) => s.addItem);
  const projects = useProjects((s) => s.projects);
  const updateProject = useProjects((s) => s.updateProject);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [labelTargets, setLabelTargets] = useState<string[]>([]);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; product: Product | null }>({
    open: false,
    x: 0,
    y: 0,
    product: null,
  });
  const canCreate = useCan("inventario:create");
  const canEdit = useCan("inventario:edit");
  const canDelete = useCan("inventario:delete");
  const canBulk = useCan("inventario:bulk");
  const canAnalyze = useCan("inventario:analyze");
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");

  // Keyboard shortcut: 'n' creates new
  useEffect(() => {
    const onNew = () => {
      if (canCreate) setCreateOpen(true);
    };
    window.addEventListener("app:new", onNew);
    if (sessionStorage.getItem("autoOpenCreate") === "true" && canCreate) {
      sessionStorage.removeItem("autoOpenCreate");
      setCreateOpen(true);
    }
    return () => window.removeEventListener("app:new", onNew);
  }, [canCreate]);

  // Compute all categories actually present in products (plus settings list)
  const allCategories = useMemo(() => {
    const set = new Set<string>(settings.categories);
    for (const p of products) for (const c of getProductCategories(p)) set.add(c);
    return [...set].sort();
  }, [products, settings.categories]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const cats = getProductCategories(p);
      if (categoryFilter.size > 0 && !cats.some((c) => categoryFilter.has(c))) return false;
      if (supplierFilter !== "all" && p.supplier !== supplierFilter) return false;
      if (currencyFilter !== "all" && p.currency !== currencyFilter) return false;
      return true;
    });
  }, [products, categoryFilter, supplierFilter, currencyFilter]);

  const toggleCat = (c: string) =>
    setCategoryFilter((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  const addToActive = (p: Product) => {
    const qty = parseInt(qtyMap[p.id] || "1", 10);
    if (!qty || qty < 1) {
      toast.error("Cantidad inválida");
      return;
    }
    if (!active) {
      toast.info("Activa una cotización, kit o proyecto primero");
      return;
    }
    if (active.kind === "quote") {
      addToQuote(active.id, p, qty);
      toast.success(`+${qty} ${p.name} agregado a la cotización`);
    } else if (active.kind === "kit") {
      addToKit(active.id, p.id, qty);
      toast.success(`+${qty} ${p.name} agregado al kit`);
    } else if (active.kind === "project") {
      const proj = projects.find(proj => proj.id === active.id);
      if (proj) {
         const newConsumed = [...(proj.consumedMaterials || [])];
         const existing = newConsumed.find(cm => cm.productId === p.id);
         if (existing) {
            existing.quantity += qty;
         } else {
            newConsumed.push({
               id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
               productId: p.id,
               name: p.name,
               sku: p.sku,
               quantity: qty,
               unitCost: p.price,
               date: new Date().toISOString()
            } as any);
         }
         updateProject(proj.id, { consumedMaterials: newConsumed });
         
         if ((settings as any).inventory?.enableStock) {
           updateProduct(p.id, { stock: (p.stock ?? 0) - qty } as any);
         }
         toast.success(`+${qty} ${p.name} consumido en el proyecto`);
      }
    }
    setQtyMap((m) => ({ ...m, [p.id]: "1" }));
  };

  const handleExportCSV = () => {
    const headers = ["SKU", "Nº de parte", "Producto", "Categorías", "Proveedor", "Unidad", "Precio", "Moneda"];
    const csvRows = filtered.map((p) => {
      const cats = getProductCategories(p).join(", ");
      return [
        `"${p.sku.replace(/"/g, '""')}"`,
        `"${(p.partNumber || "").replace(/"/g, '""')}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cats.replace(/"/g, '""')}"`,
        `"${(p.supplier || "").replace(/"/g, '""')}"`,
        `"${p.unit.replace(/"/g, '""')}"`,
        p.price,
        p.currency,
      ].join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScan = (code: string) => {
    const found = products.find(p => p.sku.toLowerCase() === code.toLowerCase() || p.partNumber?.toLowerCase() === code.toLowerCase());
    if (found) {
      if (active) {
        addToActive(found);
      } else {
        setViewProduct(found);
        toast.success(`Producto encontrado: ${found.name}`);
      }
    } else {
      toast.error(`No se encontró producto con código: ${code}`);
    }
  };

  const getProductActions = (p: Product) => {
    return [
      ...(canEdit
        ? [
            {
              label: "Editar",
              icon: <Pencil className="h-4 w-4" />,
              color: "text-amber-600",
              isPrimary: true,
              onClick: () => setEditProduct(p),
            },
          ]
        : []),
      {
        label: "Ver",
        icon: <Eye className="h-4 w-4" />,
        isPrimary: !canEdit,
        onClick: () => setViewProduct(p),
        color: "text-blue-500",
      },
      ...(canCreate
        ? [
            {
              label: "Duplicar",
              icon: <Copy className="h-4 w-4" />,
              onClick: () => {
                const { id, sku, createdAt, priceHistory, ...rest } = p;
                const newP = addProduct({ ...rest, name: `${rest.name} (Copia)` } as any);
                toast.success("Producto duplicado");
                logAction("product:clone", `Producto '${p.name}' duplicado como '${newP.name}' (${newP.sku}).`);
              },
            },
          ]
        : []),
      {
        label: "Imprimir etiqueta",
        icon: <QrCode className="h-4 w-4" />,
        onClick: () => {
          setLabelTargets([p.id]);
          setLabelsOpen(true);
        },
        color: "text-slate-600",
      },
      {
        label: "Histórico de precios",
        icon: <History className="h-4 w-4" />,
        onClick: () => setHistoryProduct(p),
        disabled: !p.priceHistory || p.priceHistory.length === 0,
        color: "text-purple-500",
      },
      ...(canDelete
        ? [{
            label: "Eliminar",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => setDeleteProduct(p),
            color: "text-destructive hover:bg-destructive/10",
          }]
        : []),
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo maestro de productos. {active && "Modo carga activo."}
          </p>
        </div>
        {products.length === 0 ? (
          <Button
            variant="outline"
            onClick={() => {
              const items = generateDemoProducts(200);
              bulkLoad(items);
              toast.success("200 productos demo cargados");
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Cargar 200 demo
          </Button>
        ) : null}
      </div>

      <DataTable
        rows={filtered}
        rowKey={(p) => p.id}
        onRowClick={(e, p) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, input, a, label, [role='checkbox']")) return;

          let cx = e.clientX;
          let cy = e.clientY;

          const margin = 160;
          if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
          if (cx - margin < 0) cx = margin;
          if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
          if (cy - margin < 0) cy = margin;

          setMenuState({ open: true, x: cx, y: cy, product: p });
        }}
        searchPlaceholder="Buscar por SKU, nombre o nº de parte..."
        searchAccessor={(p) =>
          `${p.sku} ${p.name} ${p.partNumber} ${getProductCategories(p).join(" ")} ${p.supplier}`
        }
        toolbar={
          <div className="flex gap-2">
            {selected.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLabelTargets([...selected]);
                    setLabelsOpen(true);
                  }}
                >
                  <QrCode className="mr-2 h-4 w-4" /> Etiquetas ({selected.size})
                </Button>
                <Button variant="outline" onClick={() => setScannerOpen(true)}>
                  <ScanLine className="mr-2 h-4 w-4" /> Escanear
                </Button>
                {canBulk && (
                  <Button variant="destructive" onClick={() => setBulkOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selected.size})
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            {canAnalyze && (
              <Button variant="outline" onClick={() => setAnalyzeOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Analizar cot. IA
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo producto
              </Button>
            )}
          </div>
        }
        filters={
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-start gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  Categorías
                  {categoryFilter.size > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {categoryFilter.size}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">Filtrar por categoría</span>
                  {categoryFilter.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setCategoryFilter(new Set())}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-1 pr-2">
                    {allCategories.length === 0 ? (
                      <p className="px-1 text-xs text-muted-foreground">
                        Sin categorías aún.
                      </p>
                    ) : (
                      allCategories.map((c) => (
                        <label
                          key={c}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <Checkbox
                            checked={categoryFilter.has(c)}
                            onCheckedChange={() => toggleCat(c)}
                          />
                          <span className="flex-1 truncate">{c}</span>
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {settings.suppliers.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="MXN">MXN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        emptyState={
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No hay productos.</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Crear el primero
            </Button>
          </div>
        }
        columns={[
          {
            key: "select",
            header: "",
            className: "w-8",
            cell: (p) => (
              <Checkbox
                checked={selected.has(p.id)}
                onCheckedChange={() => toggle(p.id)}
                aria-label="Seleccionar"
              />
            ),
          },
          {
            key: "sku",
            header: "SKU",
            sortable: true,
            accessor: (p) => p.sku,
            cell: (p) => <span className="font-mono text-xs font-semibold text-primary/80">{p.sku}</span>,
          },
          {
            key: "partNumber",
            header: "Nº de parte",
            sortable: true,
            accessor: (p) => p.partNumber || "",
            cell: (p) => (
              <span className="font-mono text-xs text-muted-foreground">
                {p.partNumber || "—"}
              </span>
            ),
          },
          {
            key: "name",
            header: "Producto",
            className: "min-w-[250px]",
            sortable: true,
            accessor: (p) => p.name,
            cell: (p) => (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background shadow-sm">
                  {p.imageDataUrl ? (
                    <img src={p.imageDataUrl} alt={p.name} className="h-full w-full object-cover transition-transform hover:scale-110" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  {p.description && (
                    <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={p.description}>
                      {p.description}
                    </span>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Categorías",
            sortable: true,
            accessor: (p) => getProductCategories(p).join(", "),
            cell: (p) => {
              const cats = getProductCategories(p);
              if (cats.length === 0) {
                return <span className="text-xs text-muted-foreground">—</span>;
              }
              const visible = cats.slice(0, 2);
              const extra = cats.length - visible.length;
              return (
                <div className="flex flex-wrap gap-1">
                  {visible.map((c) => (
                    <Badge key={c} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent font-medium">
                      {c}
                    </Badge>
                  ))}
                  {extra > 0 && (
                    <Badge variant="outline" className="text-[10px]" title={cats.slice(2).join(", ")}>
                      +{extra}
                    </Badge>
                  )}
                </div>
              );
            },
          },
          {
            key: "supplier",
            header: "Proveedor",
            sortable: true,
            accessor: (p) => p.supplier || "",
            cell: (p) => (
              <span className="text-xs font-medium text-muted-foreground">
                {p.supplier || "—"}
              </span>
            ),
          },
          {
            key: "unit",
            header: "Unidad",
            sortable: true,
            accessor: (p) => p.unit,
            cell: (p) => <Badge variant="outline" className="text-[10px] uppercase font-mono">{p.unit}</Badge>,
          },
          ...((settings as any).inventory?.enableStock ? [{
            key: "stock",
            header: "Stock",
            sortable: true,
            accessor: (p: Product) => p.stock ?? 0,
            cell: (p: Product) => {
              const isLow = p.minStock !== undefined && (p.stock ?? 0) <= p.minStock;
              const isEmpty = (p.stock ?? 0) <= 0;
              return (
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", isEmpty ? "bg-destructive animate-pulse" : isLow ? "bg-amber-500" : "bg-emerald-500")} />
                  <span className={`font-semibold tabular-nums ${isEmpty ? "text-destructive" : isLow ? "text-amber-600" : "text-foreground"}`}>
                    {p.stock ?? "—"}
                  </span>
                  {isLow && !isEmpty && <span title={`Stock mínimo es ${p.minStock}`}><AlertTriangle className="h-3 w-3 text-amber-500" /></span>}
                </div>
              );
            },
          }] : []),
          {
            key: "price",
            header: "Precio",
            className: "text-right",
            sortable: true,
            accessor: (p) => p.price,
            cell: (p) => (
              <div className="flex flex-col items-end">
                <span className="font-bold text-foreground">{formatMoney(p.price, p.currency)}</span>
                {p.volumePrices && p.volumePrices.length > 0 && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-600 mt-0.5 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> Mayoreo
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (p) => (
              <div className="flex items-center justify-end gap-2">
                {active && (
                  <div className="flex h-8 items-center rounded-md border bg-background shadow-sm focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                    <Input
                      type="number"
                      min="1"
                      value={qtyMap[p.id] ?? "1"}
                      onChange={(e) => setQtyMap((m) => ({ ...m, [p.id]: e.target.value }))}
                      className="h-full w-12 border-0 bg-transparent focus-visible:ring-0 text-center text-xs font-semibold tabular-nums p-0"
                    />
                    <div className="w-[1px] h-5 bg-border" />
                    <Button size="icon" variant="ghost" className="h-full w-8 rounded-none text-primary hover:text-primary hover:bg-primary/10" onClick={() => addToActive(p)} title="Añadir a la tarea activa">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted rounded-full" title="Menú Radial" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); let cx = rect.left + rect.width / 2; let cy = rect.top + rect.height / 2; const margin = 160; if (cx + margin > window.innerWidth) cx = window.innerWidth - margin; if (cx - margin < 0) cx = margin; if (cy + margin > window.innerHeight) cy = window.innerHeight - margin; if (cy - margin < 0) cy = margin; setMenuState({ open: true, x: cx, y: cy, product: p }); }}>
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground transition-transform hover:scale-110" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription>
              El SKU se generará automáticamente al guardar.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            onSubmit={(data) => {
              addProduct(data);
              setCreateOpen(false);
              toast.success("Producto creado");
              logAction("product:create", `Producto '${data.name}' creado.`);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewProduct} onOpenChange={(o) => !o && setViewProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewProduct?.name}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              SKU: {viewProduct?.sku}
            </DialogDescription>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-2 text-sm">
              {viewProduct.imageDataUrl && (
                <div className="flex justify-center">
                  <img
                    src={viewProduct.imageDataUrl}
                    alt={viewProduct.name}
                    className="max-h-56 rounded-md border object-contain"
                  />
                </div>
              )}
              {viewProduct.description && <p>{viewProduct.description}</p>}
              <dl className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <dt className="text-muted-foreground">Nº de parte</dt>
                <dd>{viewProduct.partNumber || "—"}</dd>
                <dt className="text-muted-foreground">Categorías</dt>
                <dd className="flex flex-wrap gap-1">
                  {getProductCategories(viewProduct).length === 0
                    ? "—"
                    : getProductCategories(viewProduct).map((c) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ))}
                </dd>
                <dt className="text-muted-foreground">Proveedor</dt>
                <dd>{viewProduct.supplier || "—"}</dd>
                <dt className="text-muted-foreground">Unidad</dt>
                <dd>{viewProduct.unit}</dd>
                {(settings as any).inventory?.enableStock && (
                  <>
                    <dt className="text-muted-foreground">Stock</dt>
                    <dd>{viewProduct.stock ?? "—"}</dd>
                    {viewProduct.minStock !== undefined && <><dt className="text-muted-foreground">Stock Mínimo</dt><dd>{viewProduct.minStock}</dd></>}
                  </>
                )}
                <dt className="text-muted-foreground">Precio</dt>
                <dd className="font-semibold">
                  {formatMoney(viewProduct.price, viewProduct.currency)}
                </dd>
              </dl>
              {viewProduct.website && (
                <div className="pt-3">
                  <Button asChild variant="outline" size="sm">
                    <a href={viewProduct.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Sitio web
                    </a>
                  </Button>
                </div>
              )}
              {viewProduct.volumePrices && viewProduct.volumePrices.length > 0 && (
                <div className="pt-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> Precios por volumen
                  </div>
                  <ul className="space-y-1.5 border-l-2 border-border pl-3">
                    {[...viewProduct.volumePrices].sort((a, b) => a.minQty - b.minQty).map((vp, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">A partir de {vp.minQty} {viewProduct.unit.toLowerCase()}(s)</span>
                        <span className="font-semibold text-emerald-600">{formatMoney(vp.price, viewProduct.currency)} c/u</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {viewProduct.priceHistory && viewProduct.priceHistory.length > 1 && (
                <div className="pt-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> Histórico de precios
                  </div>
                  <ol className="space-y-1.5 border-l-2 border-border pl-3">
                    {[...viewProduct.priceHistory]
                      .slice()
                      .reverse()
                      .map((h, i, arr) => {
                        const prev = arr[i + 1];
                        const delta = prev ? h.price - prev.price : 0;
                        const pct = prev && prev.price > 0 ? (delta / prev.price) * 100 : 0;
                        return (
                          <li key={h.at + i} className="text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{formatDate(h.at)}</span>
                              <span className="font-medium">
                                {formatMoney(h.price, h.currency)}
                              </span>
                            </div>
                            {prev ? (
                              <div className={`text-[10px] ${delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                                {delta > 0 ? "▲" : delta < 0 ? "▼" : "="}{" "}
                                {delta !== 0
                                  ? `${formatMoney(Math.abs(delta), h.currency)} (${pct.toFixed(1)}%)`
                                  : "sin cambio"}
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground">precio inicial</div>
                            )}
                          </li>
                        );
                      })}
                  </ol>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>SKU: {editProduct?.sku}</DialogDescription>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              initial={editProduct}
              submitLabel="Guardar cambios"
              onSubmit={(data) => {
                updateProduct(editProduct.id, data);
                setEditProduct(null);
                toast.success("Producto actualizado");
                logAction("product:update", `Producto '${data.name}' (${editProduct.sku}) actualizado.`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProduct} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{deleteProduct?.name}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProduct) {
                  removeProduct(deleteProduct.id);
                  toast.success("Producto eliminado");
                  logAction("product:delete", `Producto '${deleteProduct.name}' (${deleteProduct.sku}) eliminado.`);
                  setDeleteProduct(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selected.size} producto(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeManyProducts([...selected]);
                setSelected(new Set());
                setBulkOpen(false);
                toast.success("Productos eliminados");
                logAction("product:bulk-delete", `${selected.size} productos eliminados masivamente.`);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LabelsDialog
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        productIds={labelTargets}
      />

      <PriceHistoryDialog
        product={historyProduct}
        open={!!historyProduct}
        onOpenChange={(o) => !o && setHistoryProduct(null)}
      />

      <AnalyzeSupplierQuoteDialog open={analyzeOpen} onOpenChange={setAnalyzeOpen} />

      <RadialMenuOverlay
        open={menuState.open}
        coords={{ x: menuState.x, y: menuState.y }}
        onClose={() => setMenuState((prev) => ({ ...prev, open: false }))}
        actions={menuState.product ? getProductActions(menuState.product) : []}
      />
    </div>
  );
}
