import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2, Send, X, Search, MoreHorizontal, Boxes } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/data-table";
import { useKits } from "@/stores/kits";
import { useInventory } from "@/stores/inventory";
import { useActiveTask, requestActivateKit, clearActiveTask } from "@/stores/active-task";
import { useLocksStore } from "@/stores/locks";
import { useAuth } from "@/stores/auth";
import { logAction } from "@/stores/audit-log";
import { useQuotes } from "@/stores/quotes";
import { formatMoney } from "@/lib/utils";
import type { Kit, Currency } from "@/lib/types";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";
import { useSettings } from "@/stores/settings";

export const Route = createFileRoute("/kits")({
  head: () => ({ meta: [{ title: `Kits · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard permission="page:kits">
      <KitsPage />
    </PageGuard>
  ),
});

function KitForm({
  initial,
  onSubmit,
  label,
}: {
  initial?: Partial<Kit>;
  onSubmit: (data: { name: string; description: string }) => void;
  label: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), description: description.trim() });
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">{label}</Button>
      </div>
    </form>
  );
}

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

function KitsPage() {
  const kits = useKits((s) => s.kits);
  const addKit = useKits((s) => s.add);
  const updateKit = useKits((s) => s.update);
  const removeKit = useKits((s) => s.remove);
  const removeManyKits = useKits((s) => s.removeMany);
  const removeKitItem = useKits((s) => s.removeItem);
  const addKitItem = useKits((s) => s.addItem);
  const updateKitItemQuantity = useKits((s) => s.updateItemQuantity);

  const products = useInventory((s) => s.products);
  const productById = (id: string) => products.find((p) => p.id === id);

  const active = useActiveTask((s) => s.active);
  
  
  const addToQuote = useQuotes((s) => s.addProduct);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewKitId, setViewKitId] = useState<string | null>(null);
  const [editKit, setEditKit] = useState<Kit | null>(null);
  const [deleteKit, setDeleteKit] = useState<Kit | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [draftItems, setDraftItems] = useState<Kit["items"]>([]);
  const [menuState, setMenuState] = useState<{ open: boolean; x: number; y: number; kit: Kit | null }>({
    open: false,
    x: 0,
    y: 0,
    kit: null,
  });

  const canCreate = useCan("kits:create");
  const canEdit = useCan("kits:edit");
  const canDelete = useCan("kits:delete");
  const lockMap = useLocksStore((s) => s.locks);
  const currentUserId = useAuth((s) => s.user?.userId);
  const isLockedByOther = (kitId: string) => {
    const h = lockMap[`kit:${kitId}`];
    return !!h && h.userId !== currentUserId;
  };
  const lockHolder = (kitId: string) => lockMap[`kit:${kitId}`] ?? null;

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

  const viewKit = useMemo(
    () => kits.find((k) => k.id === viewKitId) ?? null,
    [kits, viewKitId]
  );

  useEffect(() => {
    setDraftItems(viewKit?.items ?? []);
  }, [viewKit?.id]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      `${p.sku} ${p.name} ${p.partNumber} ${p.category}`.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const kitTotals = (kit: Kit) => {
    const totals: Record<string, number> = {};
    kit.items.forEach((it) => {
      const p = productById(it.productId);
      if (!p) return;
      totals[p.currency] = (totals[p.currency] ?? 0) + p.price * it.quantity;
    });
    return totals;
  };

  const kitDraftTotals = (items: Kit["items"]) => {
    const totals: Record<string, number> = {};
    items.forEach((it) => {
      const p = productById(it.productId);
      if (!p) return;
      totals[p.currency] = (totals[p.currency] ?? 0) + p.price * it.quantity;
    });
    return totals;
  };

  const hasDraftChanges = viewKit
    ? draftItems.some((draft) => {
        const original = viewKit.items.find((item) => item.productId === draft.productId);
        return !original || original.quantity !== draft.quantity;
      }) || viewKit.items.some((item) => !draftItems.some((draft) => draft.productId === item.productId))
    : false;

  const saveKitChanges = () => {
    if (!viewKit) return;
    const originalItems = viewKit.items;

    draftItems.forEach((draft) => {
      const original = originalItems.find((item) => item.productId === draft.productId);
      if (original && original.quantity !== draft.quantity) {
        updateKitItemQuantity(viewKit.id, draft.productId, draft.quantity);
      }
    });

    originalItems.forEach((item) => {
      const stillExists = draftItems.some((draft) => draft.productId === item.productId);
      if (!stillExists) {
        removeKitItem(viewKit.id, item.productId);
        const p = productById(item.productId);
        logAction("kit:item-remove", `Producto '${p?.name}' eliminado de kit '${viewKit.name}'.`);
      }
    });

    toast.success("Cambios del kit guardados");
    setViewKitId(null);
  };

  const formatTotals = (totals: Record<string, number>) => {
    const entries = Object.entries(totals);
    if (entries.length === 0) return "—";
    return entries.map(([cur, amt]) => formatMoney(amt, cur as Currency)).join(" + ");
  };

  const injectKit = (kit: Kit) => {
    if (!active || active.kind !== "quote") {
      toast.error("Activa una cotización primero");
      return;
    }
    let added = 0;
    kit.items.forEach((it) => {
      const p = productById(it.productId);
      if (p) {
        addToQuote(active.id, p, it.quantity);
        added++;
      }
    });
    toast.success(`${added} producto(s) inyectado(s) a la cotización`);
  };

  const activateKit = async (kit: Kit) => {
    if (await requestActivateKit(kit.id)) {
      toast.success(`Kit "${kit.name}" activo. Ve a Inventario para añadir productos.`);
    }
  };

  const getKitActions = (k: Kit) => {
    const blocked = isLockedByOther(k.id);
    return [
      ...(canEdit
        ? [
            active?.kind === "kit" && active.id === k.id
              ? {
                  label: "Salir de modo edición",
                  icon: <X className="h-4 w-4" />,
                  onClick: () => clearActiveTask(),
                  color: "text-amber-600",
                  isPrimary: true,
                }
              : {
                  label: "Activar / editar",
                  icon: <Pencil className="h-4 w-4" />,
                  onClick: () => activateKit(k),
                  disabled: blocked,
                  color: "text-emerald-600",
                  isPrimary: true,
                },
          ]
        : []),
      {
        label: "Inyectar a cotización activa",
        icon: <Send className="h-4 w-4" />,
        onClick: () => injectKit(k),
        disabled: !active || active.kind !== "quote" || k.items.length === 0,
        color: "text-primary",
      },
      {
        label: "Detalles / agregar productos",
        icon: <Eye className="h-4 w-4" />,
        onClick: () => setViewKitId(k.id),
        color: "text-blue-500",
      },
      ...(canDelete
        ? [{
            label: "Eliminar",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => setDeleteKit(k),
            disabled: blocked,
            color: "text-destructive hover:bg-destructive/10",
          }]
        : []),
    ];
  };

  const handleAddProductToKit = (productId: string) => {
    if (!viewKit) return;
    const qty = parseInt(qtyMap[productId] || "1", 10);
    if (!qty || qty < 1) {
      toast.error("Cantidad inválida");
      return;
    }
    addKitItem(viewKit.id, productId, qty);
    const p = productById(productId);
    toast.success(`+${qty} ${p?.name ?? ""} agregado al kit`);
    logAction("kit:item-add", `Producto '${p?.name}' añadido a kit '${viewKit.name}'.`);
    setQtyMap((m) => ({ ...m, [productId]: "1" }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kits</h1>
        <p className="text-sm text-muted-foreground">
          Paquetes de productos reutilizables para cotizaciones rápidas.
        </p>
      </div>

      <DataTable
        rows={kits}
        rowKey={(k) => k.id}
        onRowClick={(e, k) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, input, a, label, [role='checkbox']")) return;

          let cx = e.clientX;
          let cy = e.clientY;

          const margin = 160;
          if (cx + margin > window.innerWidth) cx = window.innerWidth - margin;
          if (cx - margin < 0) cx = margin;
          if (cy + margin > window.innerHeight) cy = window.innerHeight - margin;
          if (cy - margin < 0) cy = margin;

          setMenuState({ open: true, x: cx, y: cy, kit: k });
        }}
        searchPlaceholder="Buscar kits..."
        searchAccessor={(k) => `${k.name} ${k.description}`}
        toolbar={
          <div className="flex gap-2">
            {canDelete && selected.size > 0 && (
              <Button variant="destructive" onClick={() => setBulkOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selected.size})
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo kit
              </Button>
            )}
          </div>
        }
        emptyState={<span className="text-sm text-muted-foreground">Sin kits aún.</span>}
        columns={[
          {
            key: "select",
            header: "",
            className: "w-8",
            cell: (k) => (
              <Checkbox
                checked={selected.has(k.id)}
                onCheckedChange={() => toggle(k.id)}
                aria-label="Seleccionar"
              />
            ),
          },
          {
            key: "name",
            header: "Nombre",
            sortable: true,
            accessor: (k) => k.name,
            cell: (k) => (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-sm">
                  <Boxes className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate text-foreground">{k.name}</span>
                {k.description && (
                    <span className="text-[11px] text-muted-foreground truncate mt-0.5" title={k.description}>{k.description}</span>
                )}
                </div>
              </div>
            ),
          },
          {
            key: "items",
            header: "Componentes",
            sortable: true,
            accessor: (k) => k.items.length,
            cell: (k) => (
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider bg-background">
                {k.items.length} {k.items.length === 1 ? 'ítem' : 'ítems'}
              </Badge>
            ),
          },
          {
            key: "total",
            header: "Valor Total",
            sortable: true,
            accessor: (k) => {
              const t = kitTotals(k);
              return Object.values(t).reduce((a, b) => a + b, 0);
            },
            cell: (k) => (
              <span className="font-bold text-foreground tabular-nums">{formatTotals(kitTotals(k))}</span>
            ),
          },
          {
            key: "status",
            header: "Estado",
            cell: (k) =>
              active?.kind === "kit" && active.id === k.id ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Activo</span>
                </div>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">—</span>
              ),
          },
          {
            key: "actions",
            header: "Acciones",
            className: "text-right",
            cell: (k) => {
              const blocked = isLockedByOther(k.id);
              const holder = lockHolder(k.id);
              return (
                <div className="flex items-center justify-end gap-1">
                  {blocked && holder && (
                    <span
                      className="text-[10px] text-amber-700"
                      title={`Bloqueado por ${holder.userName ?? holder.userEmail}`}
                    >
                      🔒 {holder.userName ?? holder.userEmail}
                    </span>
                  )}
                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted rounded-full" title="Menú Radial" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); let cx = rect.left + rect.width / 2; let cy = rect.top + rect.height / 2; const margin = 160; if (cx + margin > window.innerWidth) cx = window.innerWidth - margin; if (cx - margin < 0) cx = margin; if (cy + margin > window.innerHeight) cy = window.innerHeight - margin; if (cy - margin < 0) cy = margin; setMenuState({ open: true, x: cx, y: cy, kit: k }); }}>
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground transition-transform hover:scale-110" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      <RadialMenuOverlay
        open={menuState.open}
        coords={{ x: menuState.x, y: menuState.y }}
        onClose={() => setMenuState((prev) => ({ ...prev, open: false }))}
        actions={menuState.kit ? getKitActions(menuState.kit) : []}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo kit</DialogTitle>
            <DialogDescription>
              Después de crearlo, puedes agregar productos directamente desde su detalle.
            </DialogDescription>
          </DialogHeader>
          <KitForm
            label="Crear kit"
            onSubmit={(data) => {
              const k = addKit(data);
              setCreateOpen(false);
              setViewKitId(k.id);
              toast.success(`Kit "${k.name}" creado`);
              logAction("kit:create", `Kit '${k.name}' creado.`);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Detalle de kit con buscador de inventario y cantidad + botón */}
      <Dialog open={!!viewKit} onOpenChange={(o) => !o && setViewKitId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader className="px-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle>{viewKit?.name}</DialogTitle>
                <DialogDescription>{viewKit?.description}</DialogDescription>
              </div>
              {viewKit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditKit(viewKit)}
                >
                  Editar kit
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewKit && (
            <>
              <div className="space-y-4 px-6">
                <div>
                  <p className="mb-2 text-sm font-semibold">Productos del kit</p>
                  {draftItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Este kit no tiene productos.</p>
                  ) : (
                    <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
                      <ul className="divide-y">
                        {draftItems.map((it) => {
                          const p = productById(it.productId);
                          return (
                            <li
                              key={it.productId}
                              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-sm">
                                  {p?.name ?? "Producto eliminado"}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                                  <span>{p?.sku ?? it.productId}</span>
                                  {p && <span>Precio: {formatMoney(p.price, p.currency)} c/u</span>}
                                  {p && <span>Subtotal: {formatMoney(p.price * it.quantity, p.currency)}</span>}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="space-y-1 text-right">
                                  <label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                    Cantidad
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={it.quantity}
                                    className="h-8 w-20"
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value, 10);
                                      if (isNaN(qty) || qty < 1) return;
                                      setDraftItems((prev) =>
                                        prev.map((item) =>
                                          item.productId === it.productId ? { ...item, quantity: qty } : item,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() =>
                                    setDraftItems((prev) => prev.filter((item) => item.productId !== it.productId))
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {draftItems.length > 0 && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Total del kit</span>
                      <span className="text-base font-semibold tabular-nums">
                        {formatTotals(kitDraftTotals(draftItems))}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Agregar productos</p>
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar producto del inventario..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-[30vh] overflow-y-auto rounded-lg border">
                    {filteredProducts.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Sin productos.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {filteredProducts.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 p-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {p.sku} · {formatMoney(p.price, p.currency)}
                              </div>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              value={qtyMap[p.id] ?? "1"}
                              onChange={(e) =>
                                setQtyMap((m) => ({ ...m, [p.id]: e.target.value }))
                              }
                              className="h-8 w-16"
                            />
                            <Button size="sm" onClick={() => handleAddProductToKit(p.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="justify-end gap-2 px-6">
                <Button variant="outline" onClick={() => setViewKitId(null)}>
                  Cerrar
                </Button>
                <Button data-primary="true" onClick={saveKitChanges} disabled={!hasDraftChanges}>
                  Guardar cambios del kit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editKit} onOpenChange={(o) => !o && setEditKit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar kit</DialogTitle>
          </DialogHeader>
          {editKit && (
            <KitForm
              initial={editKit}
              label="Guardar"
              onSubmit={(data) => {
                updateKit(editKit.id, data);
                setEditKit(null);
                toast.success("Kit actualizado");
                logAction("kit:update", `Kit '${data.name}' actualizado.`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteKit} onOpenChange={(o) => !o && setDeleteKit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar kit</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{deleteKit?.name}". Los productos del inventario no se ven afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteKit) {
                  if (active?.kind === "kit" && active.id === deleteKit.id) await clearActiveTask();
                  removeKit(deleteKit.id);
                  toast.success("Kit eliminado");
                  logAction("kit:delete", `Kit '${deleteKit.name}' eliminado.`);
                  setDeleteKit(null);
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
            <AlertDialogTitle>Eliminar {selected.size} kit(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeManyKits([...selected]);
                setSelected(new Set());
                setBulkOpen(false);
                toast.success("Kits eliminados");
                logAction("kit:bulk-delete", `${selected.size} kits eliminados masivamente.`);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
