import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, ExternalLink, Pencil, Plus, Trash2, Filter, Sparkles, QrCode, TrendingUp, History } from "lucide-react";
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
import { useSettings } from "@/stores/settings";
import { formatMoney } from "@/lib/utils";
import { generateDemoProducts } from "@/lib/demo-data";
import { LabelsDialog } from "@/components/labels-dialog";
import { PriceHistoryDialog } from "@/components/price-history-dialog";
import { AnalyzeSupplierQuoteDialog } from "@/components/analyze-supplier-quote-dialog";
import { formatDate } from "@/lib/utils";
import { getProductCategories, type Product } from "@/lib/types";
import { useCan } from "@/lib/use-can";
import { PageGuard } from "@/components/page-guard";

export const Route = createFileRoute("/inventario")({
  head: () => ({ meta: [{ title: "Inventario · MIDAS ERP" }] }),
  component: () => (
    <PageGuard permission="page:inventario">
      <InventarioPage />
    </PageGuard>
  ),
});

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
    const onNew = () => setCreateOpen(true);
    window.addEventListener("app:new", onNew);
    return () => window.removeEventListener("app:new", onNew);
  }, []);

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
      toast.info("Activa una cotización o kit primero");
      return;
    }
    if (active.kind === "quote") {
      addToQuote(active.id, p, qty);
      toast.success(`+${qty} ${p.name} agregado a la cotización`);
    } else {
      addToKit(active.id, p.id, qty);
      toast.success(`+${qty} ${p.name} agregado al kit`);
    }
    setQtyMap((m) => ({ ...m, [p.id]: "1" }));
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
                {canBulk && (
                  <Button variant="destructive" onClick={() => setBulkOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selected.size})
                  </Button>
                )}
              </>
            )}
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
            cell: (p) => <span className="font-mono text-xs">{p.sku}</span>,
          },
          {
            key: "partNumber",
            header: "Nº de parte",
            sortable: true,
            accessor: (p) => p.partNumber || "",
            cell: (p) => (
              <span className="font-mono text-xs">
                {p.partNumber || <span className="text-muted-foreground">—</span>}
              </span>
            ),
          },
          {
            key: "name",
            header: "Producto",
            sortable: true,
            accessor: (p) => p.name,
            cell: (p) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                  {p.imageDataUrl ? (
                    <img src={p.imageDataUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
                <div className="font-medium">{p.name}</div>
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
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                  {extra > 0 && (
                    <Badge variant="outline" title={cats.slice(2).join(", ")}>
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
              <span className="text-sm">
                {p.supplier || <span className="text-muted-foreground">—</span>}
              </span>
            ),
          },
          {
            key: "unit",
            header: "Unidad",
            sortable: true,
            accessor: (p) => p.unit,
            cell: (p) => <span className="text-xs">{p.unit}</span>,
          },
          {
            key: "price",
            header: "Precio",
            sortable: true,
            accessor: (p) => p.price,
            cell: (p) => (
              <span className="font-medium">{formatMoney(p.price, p.currency)}</span>
            ),
          },
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (p) => (
              <div className="flex items-center justify-end gap-1">
                {active && (
                  <div className="mr-2 flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      value={qtyMap[p.id] ?? "1"}
                      onChange={(e) =>
                        setQtyMap((m) => ({ ...m, [p.id]: e.target.value }))
                      }
                      className="h-8 w-16"
                    />
                    <Button size="sm" onClick={() => addToActive(p)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewProduct(p)}
                  title="Ver"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditProduct(p)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setLabelTargets([p.id]);
                    setLabelsOpen(true);
                  }}
                  title="Imprimir etiqueta"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setHistoryProduct(p)}
                  title="Histórico de precios"
                  disabled={!p.priceHistory || p.priceHistory.length === 0}
                >
                  <History className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteProduct(p)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

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
    </div>
  );
}
