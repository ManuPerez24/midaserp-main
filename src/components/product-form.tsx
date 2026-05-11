import { useState, useEffect, useRef } from "react";
import { Plus, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/stores/settings";
import type { Product, Currency, VolumePrice } from "@/lib/types";
import { optimizeImage } from "@/lib/image-utils";

interface Props {
  initial?: Partial<Product>;
  onSubmit: (data: Omit<Product, "id" | "sku" | "createdAt">) => void;
  submitLabel?: string;
}

export function ProductForm({ initial, onSubmit, submitLabel = "Guardar producto" }: Props) {
  const settings = useSettings((s) => s.settings);

  const [partNumber, setPartNumber] = useState(initial?.partNumber ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState<string>(initial?.price?.toString() ?? "0");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "MXN");
  const [unit, setUnit] = useState(initial?.unit ?? "PIEZA");
  const [stock, setStock] = useState<string>(initial?.stock?.toString() ?? "");
  const [minStock, setMinStock] = useState<string>(initial?.minStock?.toString() ?? "");
  const [volumePrices, setVolumePrices] = useState<VolumePrice[]>(initial?.volumePrices ?? []);
  const [newUnit, setNewUnit] = useState("");
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);

  const [categories, setCategories] = useState<string[]>(
    initial?.categories && initial.categories.length > 0
      ? initial.categories
      : initial?.category
        ? [initial.category]
        : [],
  );
  const [catInput, setCatInput] = useState("");
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initial?.imageDataUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (file: File) => {
    try {
      const optimizedUrl = await optimizeImage(file, 800, 800, 0.8);
      setImageDataUrl(optimizedUrl);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo procesar la imagen");
    }
  };

  useEffect(() => {
    if (!settings.units.includes(unit) && settings.units.length > 0) {
      setUnit(settings.units[0]);
    }
  }, [settings.units, unit]);

  const addCategory = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (categories.includes(v)) return;
    setCategories([...categories, v]);
    setCatInput("");
    useSettings.getState().addCategory?.(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let finalCats = [...categories];
    const pending = catInput.trim();
    if (pending && !finalCats.includes(pending)) finalCats.push(pending);
    onSubmit({
      partNumber: partNumber.trim(),
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      currency,
      unit: unit.trim().toUpperCase(),
      stock: stock === "" ? undefined : (parseFloat(stock) || 0),
      minStock: minStock === "" ? undefined : (parseFloat(minStock) || 0),
      volumePrices: volumePrices.filter((v) => v.minQty > 1 && v.price > 0),
      category: finalCats[0] ?? "",
      categories: finalCats,
      supplier: supplier.trim(),
      website: website.trim(),
      imageDataUrl,
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1.5">
        <Label>Imagen</Label>
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" /> {imageDataUrl ? "Cambiar" : "Subir imagen"}
              </Button>
              {imageDataUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageDataUrl(null)}>
                  <X className="mr-2 h-4 w-4" /> Quitar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">La imagen se redimensionará y optimizará automáticamente.</p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Nº de parte</Label>
        <Input
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          placeholder="ABC-123"
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Nombre / Título <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Cable HDMI 4K"
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label>Descripción</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles, especificaciones..."
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Precio</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Moneda</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MXN">MXN</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(settings as any).inventory?.enableStock && (
        <>
          <div className="space-y-1.5">
            <Label>Existencias (Stock)</Label>
            <Input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stock mínimo (Alertas)</Label>
            <Input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label>Unidad</Label>
        {!showNewUnit ? (
          <div className="flex gap-2">
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.units.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowNewUnit(true)}
              title="Nueva unidad"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="ROLLO, CAJA, ..."
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const v = newUnit.trim().toUpperCase();
                if (v) {
                  useSettings.getState().addUnit(v);
                  setUnit(v);
                  setShowNewUnit(false);
                  setNewUnit("");
                } else {
                  setShowNewUnit(false);
                }
              }}
            >
              Usar
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Categorías</Label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-1.5 min-h-9">
          {categories.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
            >
              {c}
              <button
                type="button"
                onClick={() => setCategories(categories.filter((x) => x !== c))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Quitar ${c}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={catInput}
            onChange={(e) => setCatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addCategory(catInput);
              } else if (e.key === "Backspace" && !catInput && categories.length > 0) {
                setCategories(categories.slice(0, -1));
              }
            }}
            onBlur={() => addCategory(catInput)}
            list="cat-list"
            placeholder={categories.length === 0 ? "Escribe y presiona Enter…" : ""}
            className="flex-1 min-w-[120px] bg-transparent px-1 text-sm outline-none"
          />
        </div>
        <datalist id="cat-list">
          {settings.categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <p className="text-[11px] text-muted-foreground">
          Enter o coma para añadir varias.
        </p>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Proveedor</Label>
        {!showNewSupplier ? (
          <div className="flex gap-2">
            <Select value={supplier || "none"} onValueChange={(v) => setSupplier(v === "none" ? "" : v)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sin proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proveedor</SelectItem>
                {settings.suppliers.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowNewSupplier(true)}
              title="Nuevo proveedor"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              placeholder="Nombre del proveedor"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const v = newSupplier.trim();
                if (v) {
                  useSettings.getState().addSupplier?.(v);
                  setSupplier(v);
                  setShowNewSupplier(false);
                  setNewSupplier("");
                } else {
                  setShowNewSupplier(false);
                }
              }}
            >
              Usar
            </Button>
          </div>
        )}
      </div>

      <div className="sm:col-span-2 space-y-1.5 rounded-lg border p-4 bg-muted/20">
        <Label>Precios por volumen (Mayoreo)</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Configura descuentos automáticos al cotizar cantidades mayores.
        </p>
        {volumePrices.map((vp, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm">A partir de</span>
            <Input
              type="number"
              min="2"
              value={vp.minQty}
              onChange={(e) => {
                const next = [...volumePrices];
                next[i].minQty = parseInt(e.target.value) || 2;
                setVolumePrices(next);
              }}
              className="w-24 h-8"
            />
            <span className="text-sm">{unit.toLowerCase()}(s) a</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={vp.price}
              onChange={(e) => {
                const next = [...volumePrices];
                next[i].price = parseFloat(e.target.value) || 0;
                setVolumePrices(next);
              }}
              className="w-28 h-8"
            />
            <span className="text-sm">c/u</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-auto" onClick={() => setVolumePrices(volumePrices.filter((_, idx) => idx !== i))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setVolumePrices([...volumePrices, { minQty: 2, price: 0 }])}>
          <Plus className="mr-2 h-4 w-4" /> Agregar escalón de precio
        </Button>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Sitio web</Label>
        <Input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
