import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Upload, FileText, Check, ClipboardPaste, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSupplierQuote } from "@/util/analyze-supplier-quote.functions";
import { useInventory } from "@/stores/inventory";
import { useSettings } from "@/stores/settings";
import { useSupplierQuotes } from "@/stores/supplier-quotes";
import { logAction } from "@/stores/audit-log";
import { matchExtractedItems, type MatchResult } from "@/lib/quote-extract";
import { formatMoney } from "@/lib/utils";
import type { ExtractedQuoteItem } from "@/lib/types";
import { optimizeImage } from "@/lib/image-utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultSupplier?: string;
  /** Reanudar una cotización ya analizada (omite extracción). */
  resumeQuoteId?: string | null;
}

export function AnalyzeSupplierQuoteDialog({
  open,
  onOpenChange,
  defaultSupplier,
  resumeQuoteId,
}: Props) {
  const products = useInventory((s) => s.products);
  const addProduct = useInventory((s) => s.add);
  const updateProduct = useInventory((s) => s.update);
  const settings = useSettings((s) => s.settings);
  const addSQ = useSupplierQuotes((s) => s.add);
  const updateSQ = useSupplierQuotes((s) => s.update);
  const markApplied = useSupplierQuotes((s) => s.markApplied);
  const quotes = useSupplierQuotes((s) => s.quotes);
  const analyze = useServerFn(analyzeSupplierQuote);

  type Source = {
    name: string;
    kind: "pdf" | "image";
    pages: number;
    scanned: boolean;
    imageDataUrl?: string | null;
    extractedImage?: string | null;
    text?: string;
    supplier?: string;
    fileUrl?: string;
  };

  const [supplier, setSupplier] = useState(defaultSupplier ?? "");
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [tab, setTab] = useState<"file" | "text">("file");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [items, setItems] = useState<ExtractedQuoteItem[] | null>(null);
  const [itemSuppliers, setItemSuppliers] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [createNew, setCreateNew] = useState<Set<number>>(new Set());
  const [savedId, setSavedId] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<string[][]>([]);
  const [catDrafts, setCatDrafts] = useState<string[]>([]);
  const [correctionPrompt, setCorrectionPrompt] = useState("");
  const [previousItems, setPreviousItems] = useState<ExtractedQuoteItem[] | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const matches: MatchResult[] = useMemo(
    () => (items ? matchExtractedItems(items, products, supplier) : []),
    [items, products, supplier],
  );

  const sortedCategoryOptions = useMemo<string[]>(() => {
    const set = new Set<string>(settings.categories ?? []);
    // also include any newly drafted ones from the current analysis
    for (const arr of categories) for (const c of arr) if (c.trim()) set.add(c.trim());
    set.delete("Importado");
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    sorted.push("Importado");
    return sorted;
  }, [settings.categories, categories]);

  const existingCategorySet = useMemo(
    () => new Set<string>(settings.categories ?? []),
    [settings.categories],
  );

  const reset = () => {
    sources.forEach((s) => {
      if (s.fileUrl && s.fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(s.fileUrl);
      }
    });
    setSupplier(defaultSupplier ?? "");
    setReference("");
    setText("");
    setSources([]);
    setItems(null);
    setPicked(new Set());
    setCreateNew(new Set());
    setSavedId(null);
    setAlreadyApplied(new Set());
    setCategories([]);
    setCatDrafts([]);
    setItemSuppliers([]);
    setProgress(null);
    setCorrectionPrompt("");
    setPreviousItems(null);
    setIsReanalyzing(false);
    setShowPreview(true);
  };

  // Reanudar una cotización existente
  useEffect(() => {
    if (!open || !resumeQuoteId) return;
    const q = quotes.find((x) => x.id === resumeQuoteId);
    if (!q) return;
    setSupplier(q.supplier);
    setReference(q.reference ?? "");
    setItems(q.items);
    setCategories(q.items.map(() => ["Importado"]));
    setCatDrafts(q.items.map(() => ""));
    setItemSuppliers(q.items.map(() => q.supplier));
    setSavedId(q.id);
    const applied = new Set(q.appliedItemIndexes ?? []);
    setAlreadyApplied(applied);
    const pending = new Set<number>();
    q.items.forEach((_, i) => {
      if (!applied.has(i)) pending.add(i);
    });
    setPicked(pending);
    const matched = matchExtractedItems(q.items, products, q.supplier);
    const newOnes = new Set<number>();
    matched.forEach((m, i) => {
      if (m.kind === "new") newOnes.add(i);
    });
    setCreateNew(newOnes);
    if (q.imageDataUrl || q.rawText) {
      const isPdfDataUrl = typeof q.imageDataUrl === "string" && q.imageDataUrl.startsWith("data:application/pdf");
      setSources([
        {
          name: q.reference || "cotización",
          kind: isPdfDataUrl ? "pdf" : (q.imageDataUrl ? "image" : "pdf"),
          pages: 1,
          scanned: false,
          imageDataUrl: q.imageDataUrl ?? null,
          extractedImage: isPdfDataUrl ? null : (q.imageDataUrl ?? null),
          fileUrl: isPdfDataUrl ? (q.imageDataUrl as string) : undefined,
          text: q.rawText ?? "",
        },
      ]);
    }
  }, [open, resumeQuoteId, quotes, products]);

  const onFiles = async (files: File[]) => {
    const accepted: File[] = [];
    for (const f of files) {
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`"${f.name}" supera 8MB, omitido`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    setBusy(true);
    const newSources: Source[] = [];
    try {
      for (const f of accepted) {
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
          try {
            const { extractPdf } = await import("@/lib/pdf-extract");
            const res = await extractPdf(f);
            const pdfDataUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.onerror = () => reject(r.error);
              r.readAsDataURL(f);
            });
            newSources.push({
              name: f.name,
              kind: "pdf",
              pages: res.numPages,
              scanned: res.scanned,
              imageDataUrl: pdfDataUrl,
              extractedImage: res.scanned ? res.pageImages[0] ?? null : null,
              text: res.text || "",
              fileUrl: URL.createObjectURL(f),
            });
          } catch (e) {
            console.error(e);
            toast.error(`No se pudo leer "${f.name}"`);
          }
        } else if (f.type.startsWith("image/")) {
          const dataUrl = await optimizeImage(f, 1600, 1600, 0.85);
          newSources.push({
            name: f.name,
            kind: "image",
            pages: 1,
            scanned: false,
            imageDataUrl: dataUrl,
            extractedImage: dataUrl,
            text: "",
          });
        }
      }
      setSources((prev) => [...prev, ...newSources]);
      if (newSources.length > 0) {
        toast.success(`${newSources.length} archivo(s) listo(s)`);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeSource = (idx: number) =>
    setSources((s) => s.filter((_, i) => i !== idx));

  // Pegar imagen o PDF con Ctrl+V mientras el dialog está abierto
  useEffect(() => {
    if (!open || items) return;
    const onPaste = (e: ClipboardEvent) => {
      const clipItems = e.clipboardData?.items;
      if (!clipItems) return;
      const files: File[] = [];
      for (const it of Array.from(clipItems)) {
        if (it.kind !== "file") continue;
        if (
          it.type.startsWith("image/") ||
          it.type === "application/pdf"
        ) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onFiles(files);
        toast.success(`${files.length} archivo(s) pegado(s) del portapapeles`);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, items]);

  const onAnalyze = async (correction?: string) => {
    const isFile = tab === "file";
    const allHaveSupplier =
      isFile && sources.length > 0 && sources.every((s) => (s.supplier ?? "").trim().length > 0);
    if (!supplier.trim() && !allHaveSupplier) {
      toast.error("Indica el proveedor (general o por archivo)");
      return;
    }
    if (isFile && sources.length === 0) {
      toast.error("Sube al menos un PDF o imagen");
      return;
    }
    if (tab === "text" && !text.trim()) {
      toast.error("Pega el texto de la cotización");
      return;
    }
    setBusy(true);
    try {
      const catalogContext = products
        .map((p) => `- [${p.sku}] ${p.partNumber ? `(NP: ${p.partNumber}) ` : ""}${p.name}`)
        .join("\n");

      const semanticInstructions = `\n\nIMPORTANTE - EMPAREJAMIENTO SEMÁNTICO:
A continuación tienes nuestro catálogo de inventario actual. Al extraer los productos del proveedor, compáralos semánticamente con este catálogo.
Si un producto de la cotización es el mismo (aunque el proveedor use abreviaturas o distinto orden de palabras), DEBES devolver el 'name' y 'partNumber' exactos de nuestro catálogo para que el sistema haga match automáticamente.
Si el producto es nuevo, usa los datos del documento del proveedor.
REGLA ESTRICTA: Extrae el precio de costo tal cual viene en el documento. NO realices ningún auto-cálculo de precios ni márgenes de reventa.

CATÁLOGO ACTUAL:
${catalogContext}`;

      const allItems: ExtractedQuoteItem[] = [];
      const allSuppliers: string[] = [];
      if (isFile) {
        const total = sources.length;
        for (let idx = 0; idx < sources.length; idx++) {
          const s = sources[idx];
          setProgress({ current: idx + 1, total, name: s.name });
          const supplierForSource = (s.supplier?.trim() || supplier).trim();
          let userPromptWithCorrection = settings.ai?.userPrompt || "Extrae los productos de esta cotización de proveedor.";
          if (correction) {
            userPromptWithCorrection = `${userPromptWithCorrection}\n\nINSTRUCCIÓN DE CORRECCIÓN DEL USUARIO:\n${correction}`;
          }
          userPromptWithCorrection += semanticInstructions;
          const res = await analyze({
            data: {
              supplierHint: supplierForSource,
              imageDataUrl: s.extractedImage ?? undefined,
              text: s.text || undefined,
              provider: settings.ai?.provider,
              apiKey: settings.ai?.apiKey || undefined,
              model: settings.ai?.model || undefined,
              baseUrl: settings.ai?.baseUrl || undefined,
              systemPrompt: settings.ai?.systemPrompt || undefined,
              userPrompt: userPromptWithCorrection,
            },
          });
          if (!res.ok) {
            toast.error(`"${s.name}": ${res.error}`);
            continue;
          }
          for (const it of res.items) {
            allItems.push(it);
            allSuppliers.push(supplierForSource);
          }
        }
      } else {
        setProgress({ current: 1, total: 1, name: "texto" });
        let userPromptWithCorrection = settings.ai?.userPrompt || "Extrae los productos de esta cotización de proveedor.";
        if (correction) {
          userPromptWithCorrection = `${userPromptWithCorrection}\n\nINSTRUCCIÓN DE CORRECCIÓN DEL USUARIO:\n${correction}`;
        }
        userPromptWithCorrection += semanticInstructions;
        const res = await analyze({
          data: {
            supplierHint: supplier,
            text,
            provider: settings.ai?.provider,
            apiKey: settings.ai?.apiKey || undefined,
            model: settings.ai?.model || undefined,
            baseUrl: settings.ai?.baseUrl || undefined,
            systemPrompt: settings.ai?.systemPrompt || undefined,
            userPrompt: userPromptWithCorrection,
          },
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        for (const it of res.items) {
          allItems.push(it);
          allSuppliers.push(supplier);
        }
      }

      if (allItems.length === 0) {
        toast.error("No se detectaron productos");
        return;
      }

      // Si estamos re-analizando, guardar items anteriores para comparación
      if (correction) {
        setPreviousItems(items);
        setIsReanalyzing(true);
      }

      setItems(allItems);
      setItemSuppliers(allSuppliers);
      setCategories(allItems.map(() => ["Importado"]));
      setCatDrafts(allItems.map(() => ""));
      setPicked(new Set(allItems.map((_, i) => i)));
      const matched = matchExtractedItems(allItems, products, supplier);
      const newOnes = new Set<number>();
      matched.forEach((m, i) => {
        if (m.kind === "new") newOnes.add(i);
      });
      setCreateNew(newOnes);

      const source: "image" | "text" | "pdf" = isFile
        ? sources.some((s) => s.kind === "pdf")
          ? "pdf"
          : "image"
        : "text";
      const combinedText = isFile
        ? sources.map((s) => s.text).filter(Boolean).join("\n\n---\n\n") || undefined
        : text;
      const firstImage = isFile ? sources.find((s) => s.imageDataUrl)?.imageDataUrl ?? null : null;
      
      if (!savedId) {
        const saved = addSQ({
          supplier,
          reference: reference || sources.map((s) => s.name).join(", "),
          source,
          rawText: combinedText,
          imageDataUrl: firstImage,
          items: allItems,
        });
        setSavedId(saved.id);
        logAction("supplier-quote:create", `Cotización de proveedor '${saved.supplier}' analizada, ${allItems.length} ítems.`);
      } else if (correction) {
        updateSQ(savedId, { items: allItems });
      }
      
      toast.success(
        `${allItems.length} productos detectados${isFile && sources.length > 1 ? ` de ${sources.length} archivos` : ""}${correction ? " (corregidos)" : ""}`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Error al analizar");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const togglePick = (i: number) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const toggleNew = (i: number) =>
    setCreateNew((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const updateItem = (i: number, patch: Partial<ExtractedQuoteItem>) =>
    setItems((curr) => {
      if (!curr) return curr;
      const next = curr.slice();
      next[i] = { ...next[i], ...patch };
      return next;
    });

  const onApply = () => {
    let updated = 0;
    let created = 0;
    const newlyApplied = new Set<number>(alreadyApplied);
    matches.forEach((m, i) => {
      if (!picked.has(i)) return;
      if (alreadyApplied.has(i)) return;
      if (m.match && !createNew.has(i)) {
        if (m.priceChanged) {
          updateProduct(m.match.id, {
            price: m.item.price,
            currency: m.item.currency,
            partNumber: m.item.partNumber || m.match.partNumber,
          });
          updated++;
        }
      } else {
        const cats = (categories[i] ?? ["Importado"])
          .map((c) => c.trim())
          .filter(Boolean);
        const finalCats = cats.length > 0 ? cats : ["Importado"];
        addProduct({
          partNumber: m.item.partNumber,
          name: m.item.name,
          description: m.item.description ?? "",
          price: m.item.price,
          currency: m.item.currency,
          unit: (m.item.unit || "PIEZA").toUpperCase(),
          category: finalCats[0],
          categories: finalCats,
          supplier: itemSuppliers[i] || supplier,
          imageDataUrl: null,
        });
        created++;
      }
      newlyApplied.add(i);
    });

    if (savedId && items) {
      updateSQ(savedId, { appliedItemIndexes: Array.from(newlyApplied).sort((a, b) => a - b) });
      const allDone = items.every((_, i) => newlyApplied.has(i));
      if (allDone) markApplied(savedId);
    }

    const pendingCount = (items?.length ?? 0) - newlyApplied.size;
    toast.success(
      `Aplicado: ${updated} actualizados, ${created} nuevos${pendingCount > 0 ? ` · ${pendingCount} pendientes` : ""}`,
    );
    logAction("supplier-quote:apply", `${created} productos creados, ${updated} actualizados desde cotización de proveedor.`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex h-[98vh] w-[98vw] max-w-[98vw] flex-col overflow-hidden p-0 sm:max-w-[98vw]">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Analizar cotización con IA
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                Sube una foto/escaneo o pega el texto. La IA extrae nº de parte, precios y unidades, y te
                permite actualizar tu inventario.
              </DialogDescription>
            </div>
            {items && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="shrink-0"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" /> Ocultar documento
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" /> Mostrar documento
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">

        {!items ? (
          <div className="flex-1 flex flex-col px-6 py-4">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Proveedor (general)</Label>
                <Input
                  list="supplier-options"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value.trim()) useSettings.getState().addSupplier?.(e.target.value.trim());
                  }}
                  placeholder="Nombre del proveedor"
                />
                <datalist id="supplier-options">
                  {settings.suppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Folio / referencia (opcional)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "file" | "text")}>
              <TabsList>
                <TabsTrigger value="file">
                  <Upload className="mr-1 h-4 w-4" /> PDF / Imagen
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="mr-1 h-4 w-4" /> Pegar texto
                </TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="space-y-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    if (fs.length) onFiles(fs);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                    <Upload className="mr-2 h-4 w-4" /> Agregar archivos
                  </Button>
                  {sources.length > 0 && (
                    <Badge variant="secondary">{sources.length} archivo(s)</Badge>
                  )}
                  {sources.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSources([])} disabled={busy}>
                      Limpiar
                    </Button>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  También puedes pegar imágenes o PDF con <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Ctrl</kbd>+<kbd className="rounded border bg-muted px-1 font-mono text-[10px]">V</kbd>
                </p>
                {sources.length > 0 && (
                  <div className="space-y-2 rounded border p-2">
                    {sources.map((s, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="shrink-0">
                          {s.kind === "pdf"
                            ? s.scanned
                              ? `PDF · OCR`
                              : `PDF · ${s.pages}p`
                            : "Imagen"}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate" title={s.name}>
                          {s.name}
                        </span>
                        <Input
                          list="supplier-options"
                          placeholder={supplier ? `Proveedor (def: ${supplier})` : "Proveedor"}
                          value={s.supplier ?? ""}
                          onChange={(e) =>
                            setSources((prev) =>
                              prev.map((x, k) => (k === i ? { ...x, supplier: e.target.value } : x)),
                            )
                          }
                          onBlur={(e) => {
                            if (e.target.value.trim()) useSettings.getState().addSupplier?.(e.target.value.trim());
                          }}
                          className="h-7 w-44 text-xs"
                          disabled={busy}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => removeSource(i)}
                          disabled={busy}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {progress && (
                  <div className="text-xs text-muted-foreground">
                    Analizando {progress.current}/{progress.total}: {progress.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Puedes subir varios PDF o imágenes a la vez. Máx 8MB / 8 páginas por archivo.
                </p>
              </TabsContent>
              <TabsContent value="text">
                <Textarea
                  rows={10}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Pega aquí el contenido de la cotización (tabla de productos, precios, etc.)"
                />
              </TabsContent>
            </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full gap-4">
            {/* Panel izquierdo: Tabla de items + Correcciones */}
            <div className="flex flex-1 min-h-0 flex-col space-y-3 px-6 py-4 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="text-muted-foreground">
                  Marca con ✓ los elementos que quieras agregar/actualizar. Puedes desmarcar los que
                  no apliquen y retomarlos después.
                </div>
                <div className="flex items-center gap-2">
                  {alreadyApplied.size > 0 && (
                    <Badge variant="secondary">{alreadyApplied.size} ya aplicados</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const all = new Set<number>();
                      matches.forEach((_, i) => {
                        if (!alreadyApplied.has(i)) all.add(i);
                      });
                      setPicked(all);
                    }}
                  >
                    Seleccionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/40 p-2 text-xs">
                <span className="text-muted-foreground">Agregar categoría a todos:</span>
                <Input
                  list="bulk-cat-options"
                  placeholder="Categoría"
                  className="h-7 w-44 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (v) {
                        setCategories((curr) =>
                          curr.map((arr) => (arr.includes(v) ? arr : [...arr, v])),
                        );
                        useSettings.getState().addCategory?.(v);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
                <datalist id="bulk-cat-options">
                  {sortedCategoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <span className="text-muted-foreground">
                  (Enter agrega · "Importado" se mantiene por defecto)
                </span>
              </div>
              <ScrollArea className="min-h-0 flex-1 rounded border">
                <datalist id="item-cat-options">
                  {sortedCategoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <datalist id="unit-options">
                  {settings.units.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs uppercase">
                    <tr>
                      <th className="p-2 text-left w-8">
                        <Checkbox
                          checked={
                            matches.length > 0 &&
                            matches.every((_, i) => alreadyApplied.has(i) || picked.has(i))
                          }
                          onCheckedChange={(v) => {
                            if (v) {
                              const all = new Set<number>();
                              matches.forEach((_, i) => {
                                if (!alreadyApplied.has(i)) all.add(i);
                              });
                              setPicked(all);
                            } else {
                              setPicked(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="p-2 text-left">Nº parte / Nombre</th>
                      <th className="p-2 text-right">Precio detectado</th>
                      <th className="p-2 text-right">Precio actual</th>
                      <th className="p-2 text-left">Unidad</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-left">Categoría</th>
                      <th className="p-2 text-center">Crear nuevo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => {
                      const done = alreadyApplied.has(i);
                      return (
                        <tr key={i} className={`border-t align-top ${done ? "opacity-60" : ""}`}>
                          <td className="p-2">
                            <Checkbox
                              checked={done || picked.has(i)}
                              onCheckedChange={() => togglePick(i)}
                              disabled={done}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={m.item.partNumber}
                              onChange={(e) => updateItem(i, { partNumber: e.target.value })}
                              placeholder="Nº de parte"
                              className="mb-1 h-7 font-mono text-xs"
                            />
                            <Input
                              value={m.item.name}
                              onChange={(e) => updateItem(i, { name: e.target.value })}
                              placeholder="Nombre"
                              className="h-7 text-sm font-medium"
                            />
                            {m.item.description && (
                              <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                                {m.item.description}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={m.item.price}
                              onChange={(e) =>
                                updateItem(i, { price: parseFloat(e.target.value) || 0 })
                              }
                              className="h-7 w-28 text-right font-medium"
                            />
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {m.match ? formatMoney(m.match.price, m.match.currency) : "—"}
                          </td>
                          <td className="p-2">
                            <Input
                              list="unit-options"
                              value={m.item.unit || ""}
                              onChange={(e) => updateItem(i, { unit: e.target.value })}
                              onBlur={(e) => {
                                if (e.target.value.trim()) useSettings.getState().addUnit?.(e.target.value.trim().toUpperCase());
                              }}
                              placeholder="PIEZA"
                              className="h-7 w-20 text-xs uppercase"
                            />
                          </td>
                          <td className="p-2">
                            {done ? (
                              <Badge>
                                <Check className="mr-1 h-3 w-3" /> Aplicado
                              </Badge>
                            ) : (
                              <>
                                {m.kind === "exact" && (
                                  <Badge variant={m.priceChanged ? "default" : "secondary"}>
                                    {m.priceChanged ? "Actualiza precio" : "Sin cambios"}
                                  </Badge>
                                )}
                                {m.kind === "fuzzy" && (
                                  <Badge variant="outline">Match probable</Badge>
                                )}
                                {m.kind === "new" && <Badge variant="outline">Nuevo</Badge>}
                              </>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap items-center gap-1">
                              {(categories[i] ?? ["Importado"]).map((c, ci) => {
                                const isNewCat = !existingCategorySet.has(c);
                                return (
                                  <Badge
                                    key={`${c}-${ci}`}
                                    variant={isNewCat ? "outline" : "secondary"}
                                    className="gap-1 text-[10px] font-normal"
                                    title={isNewCat ? "Categoría nueva (se creará)" : "Categoría existente"}
                                  >
                                    {isNewCat && <span className="text-primary">+</span>}
                                    {c}
                                    {!done && (
                                      <button
                                        type="button"
                                        className="ml-0.5 text-muted-foreground hover:text-destructive"
                                        onClick={() =>
                                          setCategories((curr) => {
                                            const next = curr.map((a) => a.slice());
                                            while (next.length <= i) next.push(["Importado"]);
                                            next[i] = next[i].filter((_, k) => k !== ci);
                                            if (next[i].length === 0) next[i] = ["Importado"];
                                            return next;
                                          })
                                        }
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </Badge>
                                );
                              })}
                              {!done && (
                                <Input
                                  list="item-cat-options"
                                  value={catDrafts[i] ?? ""}
                                  placeholder="+ categoría"
                                  className="h-6 w-28 text-xs"
                                  onChange={(e) =>
                                    setCatDrafts((curr) => {
                                      const next = curr.slice();
                                      while (next.length <= i) next.push("");
                                      next[i] = e.target.value;
                                      return next;
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === ",") {
                                      e.preventDefault();
                                      const v = (catDrafts[i] ?? "").trim();
                                      if (!v) return;
                                      setCategories((curr) => {
                                        const next = curr.map((a) => a.slice());
                                        while (next.length <= i) next.push(["Importado"]);
                                        if (!next[i].includes(v)) next[i] = [...next[i], v];
                                        return next;
                                      });
                                      useSettings.getState().addCategory?.(v);
                                      setCatDrafts((curr) => {
                                        const next = curr.slice();
                                        while (next.length <= i) next.push("");
                                        next[i] = "";
                                        return next;
                                      });
                                    }
                                  }}
                                  onBlur={() => {
                                    const v = (catDrafts[i] ?? "").trim();
                                    if (!v) return;
                                    setCategories((curr) => {
                                      const next = curr.map((a) => a.slice());
                                      while (next.length <= i) next.push(["Importado"]);
                                      if (!next[i].includes(v)) next[i] = [...next[i], v];
                                      return next;
                                    });
                                    useSettings.getState().addCategory?.(v);
                                    setCatDrafts((curr) => {
                                      const next = curr.slice();
                                      while (next.length <= i) next.push("");
                                      next[i] = "";
                                      return next;
                                    });
                                  }}
                                />
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={createNew.has(i)}
                              onCheckedChange={() => toggleNew(i)}
                              disabled={!m.match || done}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
              <div className="space-y-3 rounded border bg-blue-50/50 dark:bg-blue-950/20 p-3">
                {isReanalyzing && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary">
                      <Sparkles className="h-3 w-3 mr-1" /> Re-análisis en progreso
                    </Badge>
                    <span className="text-muted-foreground">
                      Comparando con {previousItems?.length ?? 0} ítems anteriores
                    </span>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span>¿Hay algún error que corregir?</span>
                    <span className="text-xs text-muted-foreground">(Opcional)</span>
                  </Label>
                  <Textarea
                    rows={3}
                    value={correctionPrompt}
                    onChange={(e) => setCorrectionPrompt(e.target.value)}
                    placeholder="Ej: 'Usaste los subtotales como precios unitarios, deben ser los precios de la columna derecha' o 'La unidad es Metros, no Piezas'"
                    className="text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Describe qué corregir y la IA re-analizará la cotización con esta instrucción.
                  </p>
                </div>
                {correctionPrompt.trim() && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onAnalyze(correctionPrompt);
                      setCorrectionPrompt("");
                    }}
                    disabled={busy}
                    className="w-full gap-2"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Re-analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Re-analizar con corrección
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Panel derecho: Preview de documento */}
            {showPreview && (
              <div className="flex-1 min-h-0 flex flex-col border-l px-6 py-4 overflow-hidden">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Documento original</h3>
                {sources.length > 0 && sources[0]?.fileUrl ? (
                  <div className="flex-1 flex flex-col gap-2 rounded border bg-muted/20 p-4">
                    <iframe
                      src={sources[0].fileUrl}
                      title="Documento PDF"
                      className="w-full flex-1 rounded border bg-white"
                    />
                    {sources.length > 1 && (
                      <p className="text-xs text-muted-foreground text-center shrink-0">
                        {sources.length} documentos cargados (mostrando el primero)
                      </p>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="flex-1 rounded border bg-muted/20">
                    <div className="p-4">
                      {sources.length > 0 && sources[0]?.imageDataUrl ? (
                        <div className="flex flex-col gap-2">
                          <img
                            src={sources[0].imageDataUrl}
                            alt="Documento"
                            className="w-full h-auto rounded border"
                          />
                          {sources.length > 1 && (
                            <p className="text-xs text-muted-foreground text-center">
                              {sources.length} documentos cargados (mostrando el primero)
                            </p>
                          )}
                        </div>
                      ) : sources.length > 0 && sources[0]?.text ? (
                        <div className="flex flex-col gap-2 h-full">
                          <Textarea
                            value={sources[0].text}
                            readOnly
                            className="h-full min-h-[300px] resize-none bg-background text-xs font-mono"
                          />
                          {sources.length > 1 && (
                            <p className="text-xs text-muted-foreground text-center">
                              {sources.length} documentos cargados (mostrando el primero)
                            </p>
                          )}
                        </div>
                      ) : text ? (
                        <Textarea
                          value={text}
                          readOnly
                          className="h-full min-h-[300px] resize-none bg-background"
                          placeholder="Documento de texto"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm min-h-[300px]">
                          <div className="text-center">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Sin vista previa disponible</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        <DialogFooter className="border-t px-6 py-4">

          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          {!items ? (
            <Button data-primary="true" onClick={() => onAnalyze()} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Analizar
                </>
              )}
            </Button>
          ) : (
            <Button data-primary="true" onClick={onApply} disabled={picked.size === 0}>
              <Check className="mr-2 h-4 w-4" /> Aplicar cambios ({picked.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
