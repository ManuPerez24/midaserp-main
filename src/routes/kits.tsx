import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2, Send, X, Search } from "lucide-react";
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
import { useQuotes } from "@/stores/quotes";
import { formatMoney } from "@/lib/utils";
import type { Kit, Currency } from "@/lib/types";
import { PageGuard } from "@/components/page-guard";
import { useCan } from "@/lib/use-can";

export const Route = createFileRoute("/kits")({
  head: () => ({ meta: [{ title: "Kits · MIDAS ERP" }] }),
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
              <div>
                <div className="font-medium">{k.name}</div>
                {k.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{k.description}</div>
                )}
              </div>
            ),
          },
          {
            key: "items",
            header: "Items",
            sortable: true,
            accessor: (k) => k.items.length,
            cell: (k) => <Badge variant="secondary">{k.items.length} ítems</Badge>,
          },
          {
            key: "total",
            header: "Total",
            sortable: true,
            accessor: (k) => {
              const t = kitTotals(k);
              return Object.values(t).reduce((a, b) => a + b, 0);
            },
            cell: (k) => (
              <span className="font-medium tabular-nums">{formatTotals(kitTotals(k))}</span>
            ),
          },
          {
            key: "status",
            header: "Estado",
            cell: (k) =>
              active?.kind === "kit" && active.id === k.id ? (
                <Badge>activo</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewKitId(k.id)}
                    title="Detalles / agregar productos"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit && (active?.kind === "kit" && active.id === k.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearActiveTask()}
                      title="Salir de modo edición"
                    >
                      <X className="mr-1 h-3 w-3" /> Cerrar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={blocked}
                      onClick={() => activateKit(k)}
                      title={blocked ? "En edición por otro usuario" : "Activar / editar"}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    onClick={() => injectKit(k)}
                    title="Inyectar a cotización activa"
                    disabled={!active || active.kind !== "quote" || k.items.length === 0}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={blocked}
                      onClick={() => setDeleteKit(k)}
                      title={blocked ? "En edición por otro usuario" : "Eliminar"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
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
