import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Upload, X, Download, FileUp, Sun, Moon, Laptop, Lock, Unlock, Trash2, Sparkles, Bell, Send, MessageCircle, HelpCircle, Briefcase, Factory, CloudRain, Droplets, MapPin, CloudUpload } from "lucide-react";
import { Gamepad2, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QuotePreviewSheet } from "@/components/quote-preview-sheet";
import { SortableMenu } from "@/components/sortable-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AjustesPinGate } from "@/components/ajustes-pin-gate";
import { useSettings, defaultMenuGroups } from "@/stores/settings";
import { useInventory } from "@/stores/inventory";
import { useSupplierQuotes } from "@/stores/supplier-quotes";
import { DEFAULT_AI_SYSTEM_PROMPT, DEFAULT_AI_USER_PROMPT } from "@/lib/ai-prompts";
import type { Quote, Client, MenuGroup, ThemeMode } from "@/lib/types";
import { downloadBackup, readBackupFile, restoreBackup, type BackupFile } from "@/lib/backup";
import { notify } from "@/stores/notifications";
import { sha256, isAjustesUnlocked, lockAjustes } from "@/lib/security";
import { saveUserData } from "@/util/sync.functions";
import { useAuth } from "@/stores/auth";
import { Save, ShieldAlert } from "lucide-react";
import { PageGuard } from "@/components/page-guard";
import { logAction } from "@/stores/audit-log";
import { optimizeImage } from "@/lib/image-utils";
import { SortablePdfLayout } from "@/components/sortable-pdf-layout";

export const Route = createFileRoute("/ajustes")({
  head: () => ({ meta: [{ title: `Ajustes · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard adminOnly>
      <AjustesPage />
    </PageGuard>
  ),
});

const sampleClient: Client = {
  id: "sample",
  receiver: "Cliente de Ejemplo",
  company: "Empresa Demo S.A.",
  email: "demo@ejemplo.com",
  phone: "+52 55 0000 0000",
  address: "Av. Demo 123, Ciudad",
  createdAt: new Date().toISOString(),
};

const sampleQuote: Quote = {
  id: "sample",
  folio: "COT-0001",
  clientId: "sample",
  status: "Pendiente",
  notes: "Vigencia: 15 días.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lines: [
    {
      productId: "1",
      sku: "CAB-HDMI-1234",
      name: "Cable HDMI 4K 2m",
      description: "Cable de alta velocidad blindado.",
      unit: "PIEZA",
      unitPrice: 189,
      currency: "MXN",
      quantity: 2,
    },
    {
      productId: "2",
      sku: "ROU-WIFI-5678",
      name: "Router WiFi 6 AX3000",
      description: "Doble banda con 4 antenas externas.",
      unit: "PIEZA",
      unitPrice: 2390,
      currency: "MXN",
      quantity: 1,
    },
  ],
};

function AjustesPage() {
  const user = useAuth((s) => s.user);
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const updateIssuer = useSettings((s) => s.updateIssuer);
  const updateBranding = useSettings((s) => s.updateBranding);
  const updatePdf = useSettings((s) => s.updatePdf);
  const updateFolio = useSettings((s) => s.updateFolio);
  const updateAi = useSettings((s) => s.updateAi);
  const setMenuGroups = useSettings((s) => s.setMenuGroups);
  const storedMenuGroups = settings.menuGroups ?? defaultMenuGroups;
  const menuGroups = useMemo(() => {
    const missingGroups = defaultMenuGroups.filter(dg => !storedMenuGroups.some(g => g.id === dg.id));
    return [...storedMenuGroups, ...missingGroups];
  }, [storedMenuGroups]);
  const pinHash = settings.security?.pinHash ?? null;

  const erpGroups = menuGroups.filter(g => g.id !== "fabrica-3d");
  const farmGroups = menuGroups.filter(g => g.id === "fabrica-3d");

  const [unlocked, setUnlocked] = useState(() => !pinHash || isAjustesUnlocked());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pinNew, setPinNew] = useState("");
  const [pinNew2, setPinNew2] = useState("");
  const [pinCurrent, setPinCurrent] = useState("");

  useEffect(() => {
    if (!pinHash) setUnlocked(true);
  }, [pinHash]);

  const setPin = async () => {
    if (pinNew.length < 4) {
      toast.error("El PIN debe tener al menos 4 dígitos");
      return;
    }
    if (pinNew !== pinNew2) {
      toast.error("Los PIN no coinciden");
      return;
    }
    const hash = await sha256(pinNew);
    updateSettings({ security: { ...(settings.security ?? {}), pinHash: hash } });
    setPinNew("");
    setPinNew2("");
    toast.success("PIN configurado");
  };

  const removePin = async () => {
    if (!pinHash) return;
    const h = await sha256(pinCurrent);
    if (h !== pinHash) {
      toast.error("PIN actual incorrecto");
      return;
    }
    updateSettings({ security: { ...(settings.security ?? {}), pinHash: null } });
    setPinCurrent("");
    lockAjustes();
    toast.success("PIN eliminado");
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      // Guardado forzado manual del estado global
      // (Se puede extender importando y agregando otros stores si es necesario)
      await saveUserData({
        data: { store: "midas:v1:settings", data: { settings }, shared: true },
      });
      toast.success("Sincronización completada", {
        description: "Los datos han sido respaldados manualmente en la nube."
      });
      logAction("settings:sync", "Sincronización manual forzada a la base de datos.");
    } catch (error) {
      toast.error("Error al sincronizar", { description: "Revisa tu conexión a internet." });
    } finally {
      setIsSyncing(false);
    }
  };

  const themeOptions: { value: string; label: string; Icon: typeof Sun }[] = [
    { value: "claro", label: "Claro", Icon: Sun },
    { value: "oscuro", label: "Oscuro", Icon: Moon },
    { value: "sistema", label: "Sistema", Icon: Laptop },
    { value: "ciberpunk", label: "Ciberpunk", Icon: Gamepad2 },
    { value: "neumorfico", label: "Neumórfico", Icon: Layers },
  ];

  const handleImport = async (file: File) => {
    try {
      const backup = await readBackupFile(file);
      setPendingBackup(backup);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archivo inválido");
    }
  };

  const confirmRestore = () => {
    if (!pendingBackup) return;
    restoreBackup(pendingBackup);
    setPendingBackup(null);
    toast.success("Datos restaurados");
    notify("success", "Backup restaurado correctamente");
  };

  const updateGroupItems = (groupId: string, items: MenuGroup["items"]) => {
    const next: MenuGroup[] = menuGroups.map((g) =>
      g.id !== groupId ? g : { ...g, items },
    );
    setMenuGroups(next);
  };

  const resetMenu = () => {
    setMenuGroups(defaultMenuGroups);
    toast.success("Menú restaurado");
  };

  const handleLogo = async (file: File) => {
    try {
      const dataUrl = await optimizeImage(file, 600, 600, 0.9);
      updateIssuer({ logoDataUrl: dataUrl });
      toast.success("Logo actualizado");
    } catch {
      toast.error("Error al procesar el logo");
    }
  };

  const previewStyle = useMemo(
    () => ({ borderColor: settings.branding.primaryColor }),
    [settings.branding.primaryColor]
  );

  if (!user?.isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="text-muted-foreground">Solo los administradores pueden acceder a Ajustes.</p>
      </div>
    );
  }

  if (!unlocked && pinHash) {
    return <AjustesPinGate pinHash={pinHash} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted-foreground">
            Perfil fiscal, apariencia y plantilla del PDF.
          </p>
        </div>
        {pinHash ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              lockAjustes();
              setUnlocked(false);
              toast.success("Ajustes bloqueados");
            }}
          >
            <Lock className="mr-2 h-4 w-4" /> Bloquear
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil fiscal (Emisor)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre de la empresa</Label>
                <Input
                  value={settings.issuer.companyName}
                  onChange={(e) => updateIssuer({ companyName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>RFC</Label>
                <Input
                  value={settings.issuer.rfc}
                  onChange={(e) => updateIssuer({ rfc: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dirección fiscal</Label>
                <Textarea
                  value={settings.issuer.address}
                  onChange={(e) => updateIssuer({ address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input
                  value={settings.issuer.phone}
                  onChange={(e) => updateIssuer({ phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>IVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.issuer.ivaPercent}
                  onChange={(e) =>
                    updateIssuer({ ivaPercent: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logotipo</Label>
              <div className="flex items-center gap-3">
                {settings.issuer.logoDataUrl ? (
                  <img
                    src={settings.issuer.logoDataUrl}
                    alt="logo"
                    className="h-16 w-16 rounded border bg-white object-contain"
                    style={previewStyle}
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded border bg-muted text-xs text-muted-foreground"
                    style={previewStyle}
                  >
                    Sin logo
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogo(f);
                    }}
                  />
                  <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    Subir
                  </span>
                </label>
                {settings.issuer.logoDataUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateIssuer({ logoDataUrl: null })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Folios y apariencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Prefijo de folio</Label>
                <Input
                  value={settings.folio.prefix}
                  onChange={(e) => updateFolio({ prefix: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Siguiente número</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.folio.nextNumber}
                  onChange={(e) =>
                    updateFolio({ nextNumber: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Padding</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.folio.pad}
                  onChange={(e) => updateFolio({ pad: parseInt(e.target.value) || 4 })}
                />
              </div>
              <div className="sm:col-span-3 text-xs text-muted-foreground">
                Próximo folio:{" "}
                <span className="font-mono font-semibold">
                  {settings.folio.prefix}
                  {settings.folio.nextNumber.toString().padStart(settings.folio.pad, "0")}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
              <div className="space-y-1.5">
                <Label>Nombre del sitio</Label>
                <Input
                  value={settings.branding.siteName}
                  onChange={(e) => updateBranding({ siteName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frase / tagline</Label>
                <Input
                  value={settings.branding.siteTagline ?? ""}
                  onChange={(e) => updateBranding({ siteTagline: e.target.value })}
                  placeholder="Aparece bajo el nombre"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color primario</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color de acento</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.accentColor ?? "#0f1b3d"}
                    onChange={(e) => updateBranding({ accentColor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    value={settings.branding.accentColor ?? "#0f1b3d"}
                    onChange={(e) => updateBranding({ accentColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Moneda por defecto</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={settings.branding.defaultCurrency ?? "MXN"}
                  onChange={(e) =>
                    updateBranding({ defaultCurrency: e.target.value as "MXN" | "USD" })
                  }
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Formato de fecha</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={settings.branding.dateFormat ?? "DD/MM/YYYY"}
                  onChange={(e) =>
                    updateBranding({
                      dateFormat: e.target.value as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD",
                    })
                  }
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div>
                  <Label className="text-sm">Fondo decorativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Iconos difuminados en la esquina inferior derecha.
                  </p>
                </div>
                <Switch
                  checked={settings.branding.showDecoBackground !== false}
                  onCheckedChange={(v) => updateBranding({ showDecoBackground: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apariencia / Skins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              {themeOptions.map(({ value, label, Icon }) => {
                const active = (settings.branding.theme ?? "sistema") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateBranding({ theme: value as ThemeMode })}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-accent ${
                      active ? "border-primary bg-accent" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{label}</span>
                    {active && <span className="text-[10px] text-primary">Activo</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Respaldo y Sincronización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Fuerza la subida de datos a la nube para asegurarte de que todo está guardado, o
              exporta toda tu información en un archivo JSON para tener un respaldo local.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                onClick={handleForceSync}
                disabled={isSyncing}
              >
                <CloudUpload className="mr-2 h-4 w-4" /> 
                {isSyncing ? "Sincronizando..." : "Sincronizar a la Nube"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  downloadBackup();
                  toast.success("Backup descargado");
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar backup
              </Button>
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
              >
                <FileUp className="mr-2 h-4 w-4" /> Importar backup
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              Importar reemplazará todos los datos actuales. Te pediremos confirmar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limpieza de catálogos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Elimina categorías, proveedores y unidades que ya no estén en uso por
              ningún producto ni cotización de proveedor.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                const products = useInventory.getState().products;
                const supplierQuotes = useSupplierQuotes.getState().quotes;
                const units: string[] = [];
                const categories: string[] = [];
                const suppliers: string[] = [];
                for (const p of products) {
                  if (p.unit) units.push(p.unit);
                  if (p.supplier) suppliers.push(p.supplier);
                  const cats = p.categories && p.categories.length > 0 ? p.categories : p.category ? [p.category] : [];
                  for (const c of cats) categories.push(c);
                }
                for (const sq of supplierQuotes) {
                  if (sq.supplier) suppliers.push(sq.supplier);
                  for (const it of sq.items ?? []) {
                    if (it.unit) units.push(it.unit);
                  }
                }
                const removed = useSettings.getState().pruneOrphans({ units, categories, suppliers });
                const total = removed.units + removed.categories + removed.suppliers;
                if (total === 0) {
                  toast.success("No había registros huérfanos");
                } else {
                  toast.success(
                    `Eliminadas ${removed.categories} categorías, ${removed.suppliers} proveedores y ${removed.units} unidades sin uso.`,
                  );
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpiar registros huérfanos
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estructura del PDF (Drag & Drop)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Arrastra los bloques para reordenar la información y presentación en tus cotizaciones.
            </p>
            <SortablePdfLayout
              layout={settings.pdf.layout ?? ["header", "client", "table", "totals", "notes", "terms"]}
              onChange={(newLayout) => updatePdf({ layout: newLayout })}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-primary" /> Clima y Secado Inteligente (Smart Weather)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Guarda tu ubicación para que el sistema consulte la humedad ambiental local automáticamente. Esto inyectará recomendaciones de temperatura y horas de secado dinámicas en el inventario de bobinas.
            </p>
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <Label>Latitud</Label>
                <Input type="number" placeholder="Ej. 19.4326" value={(settings as any).weather?.lat || ""} onChange={(e) => updateSettings({ weather: { ...((settings as any).weather || {}), lat: parseFloat(e.target.value) } } as any)} />
              </div>
              <div className="space-y-1.5">
                <Label>Longitud</Label>
                <Input type="number" placeholder="Ej. -99.1332" value={(settings as any).weather?.lng || ""} onChange={(e) => updateSettings({ weather: { ...((settings as any).weather || {}), lng: parseFloat(e.target.value) } } as any)} />
              </div>
              <Button variant="outline" onClick={() => {
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    updateSettings({ weather: { ...((settings as any).weather || {}), lat: pos.coords.latitude, lng: pos.coords.longitude } } as any);
                    toast.success("Ubicación guardada exitosamente");
                  }, () => toast.error("Permiso de ubicación denegado"));
                } else {
                  toast.error("Geolocalización no soportada en tu navegador");
                }
              }}>
                <MapPin className="h-4 w-4 mr-2" /> Obtener mi ubicación
              </Button>
            </div>
            {(settings as any).weather?.humidity && (
              <div className="text-sm text-muted-foreground bg-blue-500/10 text-blue-700 border border-blue-200 p-3 rounded-md flex items-center gap-2 w-fit">
                <Droplets className="h-4 w-4 animate-pulse" /> Última humedad registrada: <strong>{(settings as any).weather.humidity}%</strong>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Plantilla del PDF</CardTitle>
            <Button onClick={() => setPreviewOpen(true)} variant="outline">
              <Eye className="mr-2 h-4 w-4" /> Vista previa
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Estilo / Diseño</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={settings.pdf.template ?? "modern"}
                onChange={(e) => updatePdf({ template: e.target.value as "modern" | "minimalist" | "classic" })}
              >
                <option value="modern">Moderno (Bloques de color)</option>
                <option value="minimalist">Minimalista (Bordes y fondo blanco)</option>
                <option value="classic">Clásico (Sobrio y formal)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Color del encabezado</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.pdf.headerColor}
                  onChange={(e) => updatePdf({ headerColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={settings.pdf.headerColor}
                  onChange={(e) => updatePdf({ headerColor: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mostrar fotos de productos</Label>
                <p className="text-xs text-muted-foreground">Muestra la miniatura en la tabla del PDF.</p>
              </div>
              <Switch
                checked={settings.pdf.showPhotos !== false}
                onCheckedChange={(v) => updatePdf({ showPhotos: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mostrar SKU / Código</Label>
                <p className="text-xs text-muted-foreground">Incluye la columna del SKU del producto.</p>
              </div>
              <Switch
                checked={settings.pdf.showSku !== false}
                onCheckedChange={(v) => updatePdf({ showSku: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mostrar descuento</Label>
                <p className="text-xs text-muted-foreground">Columna de descuento por línea.</p>
              </div>
              <Switch
                checked={settings.pdf.showDiscount !== false}
                onCheckedChange={(v) => updatePdf({ showDiscount: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color de acento (tabla)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.pdf.accentColor}
                  onChange={(e) => updatePdf({ accentColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={settings.pdf.accentColor}
                  onChange={(e) => updatePdf({ accentColor: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mostrar logotipo</Label>
                <p className="text-xs text-muted-foreground">Aparece en el encabezado del PDF.</p>
              </div>
              <Switch
                checked={settings.pdf.showLogo}
                onCheckedChange={(v) => updatePdf({ showLogo: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Filas intercaladas</Label>
                <p className="text-xs text-muted-foreground">Zebra striping en la tabla.</p>
              </div>
              <Switch
                checked={settings.pdf.zebra}
                onCheckedChange={(v) => updatePdf({ zebra: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mostrar notas adicionales</Label>
                <p className="text-xs text-muted-foreground">Incluye las notas de la cotización en el PDF.</p>
              </div>
              <Switch
                checked={settings.pdf.showNotes !== false}
                onCheckedChange={(v) => updatePdf({ showNotes: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tamaño de página</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={settings.pdf.pageSize ?? "LETTER"}
                onChange={(e) => updatePdf({ pageSize: e.target.value as "LETTER" | "A4" })}
              >
                <option value="LETTER">Carta (LETTER)</option>
                <option value="A4">A4</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Mostrar QR de verificación</Label>
                <p className="text-xs text-muted-foreground">QR en el pie del PDF.</p>
              </div>
              <Switch
                checked={settings.pdf.showQr !== false}
                onCheckedChange={(v) => updatePdf({ showQr: v })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Pie de página</Label>
              <Input
                value={settings.pdf.footerText}
                onChange={(e) => updatePdf({ footerText: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Términos y condiciones</Label>
              <Textarea
                value={settings.pdf.paymentTerms ?? ""}
                onChange={(e) => updatePdf({ paymentTerms: e.target.value })}
                rows={3}
                placeholder="Texto adicional que aparecerá al final del PDF."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Control de existencias (Stock)</Label>
                <p className="text-xs text-muted-foreground">
                  Permite indicar stock en los productos y lo descuenta al cerrar o aceptar cotizaciones.
                </p>
              </div>
              <Switch
                checked={(settings as any).inventory?.enableStock === true}
                onCheckedChange={(v) => updateSettings({ inventory: { ...((settings as any).inventory || {}), enableStock: v } } as any)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Menú lateral</CardTitle>
            <Button variant="outline" size="sm" onClick={resetMenu}>
              Restaurar valores
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Arrastra para reordenar, edita etiquetas u oculta items. Los cambios se
              guardan localmente en este navegador.
            </p>
            <Tabs defaultValue="erp" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
                <TabsTrigger value="erp"><Briefcase className="h-4 w-4 mr-2"/> Midas ERP</TabsTrigger>
                <TabsTrigger value="3d"><Factory className="h-4 w-4 mr-2"/> Fábrica 3D</TabsTrigger>
              </TabsList>
              <TabsContent value="erp" className="space-y-4">
                {erpGroups.map((group) => (
                  <div key={group.id} className="space-y-2 rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {group.label}
                    </p>
                    <SortableMenu
                      items={group.items}
                      onChange={(items) => updateGroupItems(group.id, items)}
                    />
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="3d" className="space-y-4">
                {farmGroups.map((group) => (
                  <div key={group.id} className="space-y-2 rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {group.label}
                    </p>
                    <SortableMenu
                      items={group.items}
                      onChange={(items) => updateGroupItems(group.id, items)}
                    />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> IA del analizador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configura el proveedor de IA y las credenciales que se usarán para el Asistente Midas,
              así como para analizar las cotizaciones (imágenes, PDF y texto).
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Proveedor</Label>
                <Select
                  value={settings.ai?.provider ?? "openai"}
                  onValueChange={(v) =>
                    updateAi({ ...settings.ai, provider: v as "openai" | "custom" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="custom">Personalizado (compatible OpenAI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input
                  placeholder={
                    (settings.ai?.provider ?? "openai") === "openai"
                      ? "gpt-4o-mini"
                      : "tu-modelo-aqui"
                  }
                  value={settings.ai?.model ?? ""}
                  onChange={(e) => updateAi({ ...settings.ai, model: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {(settings.ai?.provider ?? "openai") === "openai"
                      ? "Ej: gpt-4o-mini, gpt-4o, gpt-4-turbo"
                      : "El nombre del modelo según tu endpoint."}
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  API Key
                </Label>
                <Input
                  type="password"
                  placeholder={
                    "sk-..."
                  }
                  value={settings.ai?.apiKey ?? ""}
                  onChange={(e) => updateAi({ ...settings.ai, apiKey: e.target.value })}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  La clave se guarda en tu cuenta y se envía al servidor sólo al analizar.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Base URL</Label>
                <Input
                  placeholder="https://api.openai.com/v1"
                  value={(settings.ai?.provider ?? "openai") === "openai" ? "https://api.openai.com/v1" : (settings.ai?.baseUrl ?? "")}
                  onChange={(e) => updateAi({ ...settings.ai, baseUrl: e.target.value })}
                  disabled={(settings.ai?.provider ?? "openai") === "openai"}
                />
                <p className="text-xs text-muted-foreground">
                  {(settings.ai?.provider ?? "openai") === "openai" 
                    ? "Para modificar el Base URL, cambia el Proveedor a 'Personalizado' arriba."
                    : <>Endpoint compatible con OpenAI. Se llamará a <code>{"{baseUrl}/chat/completions"}</code>.</>}
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Prompt del sistema</Label>
                <Textarea
                  value={settings.ai?.systemPrompt ?? DEFAULT_AI_SYSTEM_PROMPT}
                  onChange={(e) => updateAi({ ...settings.ai, systemPrompt: e.target.value })}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Guía el comportamiento general de la IA para la extracción.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Prompt del usuario</Label>
                <Textarea
                  value={settings.ai?.userPrompt ?? DEFAULT_AI_USER_PROMPT}
                  onChange={(e) => updateAi({ ...settings.ai, userPrompt: e.target.value })}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Prompt que se combina con el texto o imagen. Usa <code>{"{{supplierHint}}"}</code> para insertar el proveedor.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Notificaciones Push (IoT)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configura las credenciales para enviar alertas automáticas de Midas 3D (mermas, fin de impresión) a través de Telegram o WhatsApp.
            </p>
            
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/10">
              <div>
                <Label className="text-sm">Habilitar Notificaciones Push</Label>
                <p className="text-xs text-muted-foreground">Activa el envío de mensajes a los canales configurados.</p>
              </div>
              <Switch
                checked={(settings as any).notifications?.enabled === true}
                onCheckedChange={(v) => updateSettings({ notifications: { ...((settings as any).notifications || {}), enabled: v } } as any)}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 mt-4">
              <div className="space-y-3 p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="h-4 w-4 text-sky-500" />
                  <Label className="text-base font-semibold text-sky-600">Telegram</Label>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Bot Token</Label>
                    <Popover>
                      <PopoverTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" /></PopoverTrigger>
                      <PopoverContent className="w-80 text-xs" side="top">
                        <p className="font-bold mb-1">¿Cómo obtenerlo?</p>
                        <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                          <li>Abre Telegram y busca a <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">@BotFather</a>.</li>
                          <li>Envía el comando <code>/newbot</code> y sigue las instrucciones para nombrar a tu bot.</li>
                          <li>Copia el token HTTP de la API que te dará al final (ej. 123456:ABC...).</li>
                        </ol>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input 
                    type="password"
                    placeholder="123456789:ABCDefghIJKL..." 
                    value={(settings as any).notifications?.telegramToken || ""} 
                    onChange={(e) => updateSettings({ notifications: { ...((settings as any).notifications || {}), telegramToken: e.target.value } } as any)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Chat ID</Label>
                    <Popover>
                      <PopoverTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" /></PopoverTrigger>
                      <PopoverContent className="w-80 text-xs" side="top">
                        <p className="font-bold mb-1">¿Qué es y cómo conseguirlo?</p>
                        <p className="text-muted-foreground mb-2">Es el identificador único del chat (grupo o usuario) a donde el bot enviará las alertas.</p>
                        <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                          <li>Envía un mensaje cualquiera a tu nuevo bot en Telegram.</li>
                          <li>Visita <a href="https://api.telegram.org/botTU_TOKEN/getUpdates" target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">https://api.telegram.org/botTU_TOKEN/getUpdates</a> en tu navegador web (reemplazando TU_TOKEN con el real).</li>
                          <li>Busca el campo <strong>"chat": {"{"} "id": 123456789 {"}"}</strong> y copia ese número (puede ser negativo si es un grupo).</li>
                        </ol>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input 
                    placeholder="-1001234567890" 
                    value={(settings as any).notifications?.telegramChatId || ""} 
                    onChange={(e) => updateSettings({ notifications: { ...((settings as any).notifications || {}), telegramChatId: e.target.value } } as any)}
                  />
                  <p className="text-[10px] text-muted-foreground">El ID del grupo o usuario que recibirá las alertas.</p>
                </div>
              </div>

              <div className="space-y-3 p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                  <Label className="text-base font-semibold text-emerald-600">WhatsApp</Label>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Access Token / API Key</Label>
                    <Popover>
                      <PopoverTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" /></PopoverTrigger>
                      <PopoverContent className="w-80 text-xs" side="top">
                        <p className="font-bold mb-1">Configuración en Meta</p>
                        <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                          <li>Ve a <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">developers.facebook.com</a> y crea una App de empresa.</li>
                          <li>Añade el producto de <strong>WhatsApp</strong>.</li>
                          <li>En la sección "Configuración de la API", copia el Token de acceso temporal o permanente.</li>
                        </ol>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input 
                    type="password"
                    placeholder="EAAB..." 
                    value={(settings as any).notifications?.whatsappToken || ""} 
                    onChange={(e) => updateSettings({ notifications: { ...((settings as any).notifications || {}), whatsappToken: e.target.value } } as any)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Número Destino</Label>
                    <Popover>
                      <PopoverTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" /></PopoverTrigger>
                      <PopoverContent className="w-80 text-xs" side="top">
                        <p className="font-bold mb-1">Destinatario Autorizado</p>
                        <p className="text-muted-foreground">Si usas un token de pruebas, este número debe estar agregado y verificado en tu panel de <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">Meta for Developers</a> (en la sección "Lista de destinatarios de prueba").</p>
                        <p className="text-muted-foreground mt-1">Recuerda incluir tu código de país (ej. +52 o +34).</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input 
                    placeholder="+5215555555555" 
                    value={(settings as any).notifications?.whatsappPhone || ""} 
                    onChange={(e) => updateSettings({ notifications: { ...((settings as any).notifications || {}), whatsappPhone: e.target.value } } as any)}
                  />
                  <p className="text-[10px] text-muted-foreground">Incluye el código de país (ej. +52).</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Protege la página de Ajustes con un PIN. Esto evita cambios accidentales
              pero no protege contra acceso al navegador.
            </p>
            {pinHash ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">PIN activo</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    type="password"
                    placeholder="PIN actual"
                    value={pinCurrent}
                    onChange={(e) => setPinCurrent(e.target.value)}
                  />
                  <Button variant="destructive" onClick={removePin} disabled={!pinCurrent}>
                    <Unlock className="mr-2 h-4 w-4" /> Quitar PIN
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  type="password"
                  placeholder="Nuevo PIN (mín. 4)"
                  value={pinNew}
                  onChange={(e) => setPinNew(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirmar PIN"
                  value={pinNew2}
                  onChange={(e) => setPinNew2(e.target.value)}
                />
                <Button onClick={setPin} disabled={!pinNew || !pinNew2}>
                  <Lock className="mr-2 h-4 w-4" /> Activar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <SaveSettingsBar />
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Vista previa del PDF</DialogTitle>
            <DialogDescription>Así se verá la plantilla de cotización.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[75vh] w-full bg-muted">
            <div className="p-4 sm:p-6">
              <QuotePreviewSheet quote={sampleQuote} client={sampleClient} settings={settings} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingBackup} onOpenChange={(o) => !o && setPendingBackup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
            <AlertDialogDescription>
              Se reemplazarán todos los datos actuales (productos, kits, clientes,
              cotizaciones y ajustes) con los del archivo. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveSettingsBar() {
  const settings = useSettings((s) => s.settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserData({
        data: { store: "midas:v1:settings", data: { settings }, shared: true },
      });
      toast.success("Ajustes guardados");
      logAction("settings:save", "Ajustes generales guardados.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron guardar los ajustes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sticky bottom-4 z-10 flex justify-end">
      <Button size="lg" onClick={handleSave} disabled={saving} className="shadow-lg">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  );
}
