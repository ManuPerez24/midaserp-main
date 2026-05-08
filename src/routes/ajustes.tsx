import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Upload, X, Download, FileUp, Sun, Moon, Laptop, Lock, Unlock, Trash2, Sparkles } from "lucide-react";
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
import { QuotePreviewSheet } from "@/components/quote-preview-sheet";
import { SortableMenu } from "@/components/sortable-menu";
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

export const Route = createFileRoute("/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes · MIDAS ERP" }] }),
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
  const menuGroups = settings.menuGroups ?? defaultMenuGroups;
  const pinHash = settings.security?.pinHash ?? null;

  const [unlocked, setUnlocked] = useState(() => !pinHash || isAjustesUnlocked());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
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

  const themeOptions: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { value: "claro", label: "Claro", Icon: Sun },
    { value: "oscuro", label: "Oscuro", Icon: Moon },
    { value: "sistema", label: "Sistema", Icon: Laptop },
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

  const handleLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateIssuer({ logoDataUrl: String(reader.result) });
      toast.success("Logo actualizado");
    };
    reader.readAsDataURL(file);
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
            <CardTitle>Tema de la interfaz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map(({ value, label, Icon }) => {
                const active = (settings.branding.theme ?? "sistema") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateBranding({ theme: value })}
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
            <CardTitle>Backup local</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporta toda tu información (productos, kits, clientes, cotizaciones y
              ajustes) en un archivo JSON. Puedes restaurarlo después en este u otro
              navegador.
            </p>
            <div className="flex flex-wrap gap-2">
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
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Plantilla del PDF</CardTitle>
            <Button onClick={() => setPreviewOpen(true)} variant="outline">
              <Eye className="mr-2 h-4 w-4" /> Vista previa
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
            {menuGroups.map((group) => (
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
              Configura el proveedor de IA que se usa para analizar cotizaciones de proveedores
              (imágenes, PDF y texto). Por defecto se usa Lovable AI con la clave incluida en tu
              workspace.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Proveedor</Label>
                <Select
                  value={settings.ai?.provider ?? "lovable"}
                  onValueChange={(v) =>
                    updateAi({ provider: v as "lovable" | "openai" | "custom" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lovable">Lovable AI (Gemini / GPT)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="custom">Personalizado (compatible OpenAI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input
                  placeholder={
                    (settings.ai?.provider ?? "lovable") === "openai"
                      ? "gpt-4o-mini"
                      : "google/gemini-2.5-flash"
                  }
                  value={settings.ai?.model ?? ""}
                  onChange={(e) => updateAi({ model: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {(settings.ai?.provider ?? "lovable") === "lovable"
                    ? "Ej: google/gemini-2.5-flash, google/gemini-2.5-pro, openai/gpt-5-mini"
                    : (settings.ai?.provider ?? "lovable") === "openai"
                      ? "Ej: gpt-4o-mini, gpt-4o, gpt-4-turbo"
                      : "El nombre del modelo según tu endpoint."}
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  API Key{" "}
                  {(settings.ai?.provider ?? "lovable") === "lovable" && (
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    (settings.ai?.provider ?? "lovable") === "lovable"
                      ? "Vacío = usar LOVABLE_API_KEY del workspace"
                      : "sk-..."
                  }
                  value={settings.ai?.apiKey ?? ""}
                  onChange={(e) => updateAi({ apiKey: e.target.value })}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  La clave se guarda en tu cuenta y se envía al servidor sólo al analizar.
                </p>
              </div>

              {(settings.ai?.provider ?? "lovable") === "custom" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Base URL</Label>
                  <Input
                    placeholder="https://mi-endpoint.com/v1"
                    value={settings.ai?.baseUrl ?? ""}
                    onChange={(e) => updateAi({ baseUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Endpoint compatible con OpenAI. Se llamará a{" "}
                    <code>{"{baseUrl}/chat/completions"}</code>.
                  </p>
                </div>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Prompt del sistema</Label>
                <Textarea
                  value={settings.ai?.systemPrompt ?? DEFAULT_AI_SYSTEM_PROMPT}
                  onChange={(e) => updateAi({ systemPrompt: e.target.value })}
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
                  onChange={(e) => updateAi({ userPrompt: e.target.value })}
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
