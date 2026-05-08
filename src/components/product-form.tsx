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
import type { Product, Currency } from "@/lib/types";

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
  const [newUnit, setNewUnit] = useState("");
  const [showNewUnit, setShowNewUnit] = useState(false);

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

  const handleImage = (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
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
      category: finalCats[0] ?? "",
      categories: finalCats,
      supplier: supplier.trim(),
      website: website.trim(),
      imageDataUrl,
    });
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
            <p className="text-xs text-muted-foreground">Máximo 1 MB. PNG o JPG.</p>
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
        <Input
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          list="sup-list"
          placeholder="Sin proveedor"
        />
        <datalist id="sup-list">
          {settings.suppliers.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
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
