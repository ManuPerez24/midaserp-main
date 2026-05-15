import { create } from "zustand";
import { registerServerStore } from "@/lib/server-store-sync";
import { DEFAULT_AI_SYSTEM_PROMPT, DEFAULT_AI_USER_PROMPT } from "@/lib/ai-prompts";
import type { AppSettings, MenuGroup } from "@/lib/types";

interface SettingsState {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  updateIssuer: (patch: Partial<AppSettings["issuer"]>) => void;
  updateBranding: (patch: Partial<AppSettings["branding"]>) => void;
  updatePdf: (patch: Partial<AppSettings["pdf"]>) => void;
  updateFolio: (patch: Partial<AppSettings["folio"]>) => void;
  updateAi: (patch: Partial<NonNullable<AppSettings["ai"]>>) => void;
  setMenuGroups: (groups: MenuGroup[]) => void;
  addUnit: (u: string) => void;
  addCategory: (c: string) => void;
  addSupplier: (s: string) => void;
  pruneOrphans: (used: { units: string[]; categories: string[]; suppliers: string[] }) => {
    units: number;
    categories: number;
    suppliers: number;
  };
  consumeFolio: () => string;
}

export const defaultMenuGroups: MenuGroup[] = [
  {
    id: "main",
    label: "Navegación",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { id: "inventario", label: "Inventario", icon: "Package" },
      { id: "kits", label: "Kits", icon: "Boxes" },
      { id: "cotizaciones", label: "Cotizaciones", icon: "FileText" },
      { id: "proyectos", label: "Proyectos", icon: "HardHat" },
      { id: "cotizaciones-proveedores", label: "Cot. Proveedores", icon: "Tag" },
      { id: "compras", label: "Compras", icon: "ShoppingCart" },
      { id: "clientes", label: "Clientes", icon: "Users" },
      { id: "recordatorios", label: "Recordatorios", icon: "Star" },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    items: [
      { id: "usuarios", label: "Usuarios", icon: "ShieldCheck" },
      { id: "audit-log", label: "Log de Auditoría", icon: "History" },
    ],
  },
  {
    id: "fabrica-3d",
    label: "Fábrica 3D",
    items: [
      { id: "impresion-3d", label: "Granja de Impresoras", icon: "Printer" as any },
      { id: "ordenes-3d", label: "Órdenes de Producción", icon: "ListChecks" as any },
      { id: "estadisticas-3d", label: "Dashboard y Métricas", icon: "BarChartHorizontal" as any },
      { id: "boveda-3d", label: "Bóveda CAD", icon: "Box" as any },
      { id: "logros-3d", label: "Logros 3D", icon: "Award" as any },
    ],
  },
];

const defaultSettings: AppSettings = {
  issuer: {
    companyName: "Mi Empresa S.A. de C.V.",
    address: "Calle Principal 123, Ciudad, México",
    phone: "+52 55 0000 0000",
    rfc: "XAXX010101000",
    ivaPercent: 16,
    logoDataUrl: null,
  },
  branding: {
    siteName: "COMPANY ERP",
    siteTagline: "ERP ligero",
    primaryColor: "#3b82f6",
    accentColor: "#0f1b3d",
    sidebarVariant: "claro",
    density: "comodo",
    showDecoBackground: true,
    defaultCurrency: "MXN",
    dateFormat: "DD/MM/YYYY",
    theme: "oscuro",
  },
  pdf: {
    headerColor: "#3b82f6",
    accentColor: "#0f1b3d",
    showLogo: true,
    zebra: true,
    footerText: "Gracias por su preferencia.",
    pageSize: "LETTER",
    showQr: true,
    paymentTerms: "",
    template: "modern",
    showPhotos: true,
    showSku: true,
    showDiscount: true,
    showNotes: true,
    layout: ["header", "client", "table", "totals", "notes", "terms"],
  },
  folio: {
    prefix: "COT-",
    nextNumber: 1,
    pad: 4,
  },
  units: ["PIEZA", "METRO", "PAQUETE", "KILOGRAMO", "LITRO", "SERVICIO"],
  categories: [],
  suppliers: [],
  ai: {
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
    userPrompt: DEFAULT_AI_USER_PROMPT,
  },
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  update: (patch) => set({ settings: { ...get().settings, ...patch } }),
  updateIssuer: (patch) => set({ settings: { ...get().settings, issuer: { ...get().settings.issuer, ...patch } } }),
  updateBranding: (patch) => set({ settings: { ...get().settings, branding: { ...get().settings.branding, ...patch } } }),
  updatePdf: (patch) => set({ settings: { ...get().settings, pdf: { ...get().settings.pdf, ...patch } } }),
  updateFolio: (patch) => set({ settings: { ...get().settings, folio: { ...get().settings.folio, ...patch } } }),
  updateAi: (patch) =>
    set({
      settings: {
        ...get().settings,
        ai: {
          provider: get().settings.ai?.provider ?? "openai",
          model: get().settings.ai?.model ?? "gpt-4o-mini",
          apiKey: get().settings.ai?.apiKey ?? "",
          baseUrl: get().settings.ai?.baseUrl ?? "https://api.openai.com/v1",
          ...patch,
        },
      },
    }),
  setMenuGroups: (groups) => set({ settings: { ...get().settings, menuGroups: groups } }),
  addUnit: (u) => {
    const v = u.trim().toUpperCase();
    if (!v) return;
    const s = get().settings;
    if (s.units.includes(v)) return;
    set({ settings: { ...s, units: [...s.units, v] } });
  },
  addCategory: (c) => {
    const v = c.trim();
    if (!v) return;
    const s = get().settings;
    if (s.categories.includes(v)) return;
    set({ settings: { ...s, categories: [...s.categories, v] } });
  },
  addSupplier: (sup) => {
    const v = sup.trim();
    if (!v) return;
    const s = get().settings;
    if (s.suppliers.includes(v)) return;
    set({ settings: { ...s, suppliers: [...s.suppliers, v] } });
  },
  pruneOrphans: ({ units, categories, suppliers }) => {
    const s = get().settings;
    const usedUnits = new Set(units.map((u) => u.trim().toUpperCase()).filter(Boolean));
    const usedCats = new Set(categories.map((c) => c.trim()).filter(Boolean));
    const usedSups = new Set(suppliers.map((x) => x.trim()).filter(Boolean));
    const nextUnits = s.units.filter((u) => usedUnits.has(u.trim().toUpperCase()));
    const nextCats = s.categories.filter((c) => usedCats.has(c.trim()));
    const nextSups = s.suppliers.filter((x) => usedSups.has(x.trim()));
    const removed = {
      units: s.units.length - nextUnits.length,
      categories: s.categories.length - nextCats.length,
      suppliers: s.suppliers.length - nextSups.length,
    };
    set({ settings: { ...s, units: nextUnits, categories: nextCats, suppliers: nextSups } });
    return removed;
  },
  consumeFolio: () => {
    const { folio } = get().settings;
    const num = folio.nextNumber.toString().padStart(folio.pad, "0");
    const value = `${folio.prefix}${num}`;
    set({ settings: { ...get().settings, folio: { ...folio, nextNumber: folio.nextNumber + 1 } } });
    return value;
  },
}));

registerServerStore(
  "midas:v1:settings",
  useSettings,
  (state) => ({ settings: state.settings }),
  { shared: true },
);
