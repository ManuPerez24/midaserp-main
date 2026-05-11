export type Currency = "MXN" | "USD";

export type QuoteStatus = "Pendiente" | "En Proceso" | "Aceptada" | "Rechazada" | "Cerrada";

export interface PriceHistoryEntry {
  at: string; // ISO
  price: number;
  currency: Currency;
}

export interface VolumePrice {
  minQty: number;
  price: number;
}

export interface Product {
  id: string;
  sku: string;
  partNumber: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  unit: string;
  category: string;
  categories?: string[];
  supplier: string;
  website?: string;
  imageDataUrl?: string | null;
  stock?: number;
  minStock?: number;
  volumePrices?: VolumePrice[];
  createdAt: string;
  priceHistory?: PriceHistoryEntry[];
}

export function getProductCategories(p: Product): string[] {
  if (p.categories && p.categories.length > 0) return p.categories;
  return p.category ? [p.category] : [];
}

export interface KitItem {
  productId: string;
  quantity: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  createdAt: string;
}

export interface Kit {
  id: string;
  name: string;
  description: string;
  items: KitItem[];
  createdAt: string;
}

export interface Client {
  id: string;
  receiver: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface QuoteLine {
  productId: string;
  sku: string;
  partNumber?: string;
  name: string;
  description: string;
  unit: string;
  unitPrice: number;
  currency: Currency;
  quantity: number;
  discountPercent?: number;
  poStatus?: "Pendiente" | "Pedida" | "Recibida";
  poReceivedQty?: number;
}

export type QuoteEventKind =
  | "created"
  | "status"
  | "line_added"
  | "line_removed"
  | "line_qty"
  | "notes"
  | "client";

export interface QuoteEvent {
  id: string;
  at: string; // ISO
  kind: QuoteEventKind;
  message: string;
  meta?: Record<string, string | number | undefined>;
}

export interface Quote {
  id: string;
  folio: string;
  clientId: string;
  status: QuoteStatus;
  lines: QuoteLine[];
  notes: string;
  commentary?: string;
  createdAt: string;
  updatedAt: string;
  events?: QuoteEvent[];
  validUntil?: string | null;
  globalDiscountPercent?: number;
  attachments?: Attachment[];
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  commentary?: string;
  globalDiscountPercent?: number;
  validityDays?: number;
  lines: QuoteLine[];
  createdAt: string;
}

export interface IssuerSettings {
  companyName: string;
  address: string;
  phone: string;
  rfc: string;
  ivaPercent: number;
  logoDataUrl: string | null;
}

export type ThemeMode = "claro" | "oscuro" | "sistema";

export interface BrandingSettings {
  siteName: string;
  siteTagline?: string;
  primaryColor: string; // hex
  accentColor?: string;
  sidebarVariant?: "claro" | "oscuro";
  density?: "compacto" | "comodo";
  showDecoBackground?: boolean;
  defaultCurrency?: Currency;
  dateFormat?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  theme?: ThemeMode;
}

export interface PdfSettings {
  headerColor: string;
  accentColor: string;
  showLogo: boolean;
  zebra: boolean;
  footerText: string;
  pageSize?: "LETTER" | "A4";
  showQr?: boolean;
  paymentTerms?: string;
  template?: "modern" | "minimalist" | "classic";
  showPhotos?: boolean;
  showSku?: boolean;
  showDiscount?: boolean;
  showNotes?: boolean;
  layout?: string[];
}

export interface FolioSettings {
  prefix: string; // e.g. "COT-"
  nextNumber: number;
  pad: number; // e.g. 4 -> 0001
}

export type MenuIconName =
  | "LayoutDashboard"
  | "Package"
  | "Boxes"
  | "FileText"
  | "Users"
  | "Settings"
  | "Folder"
  | "Star"
  | "Tag"
  | "Wrench"
  | "Kanban"
  | "ShoppingCart"
  | "History"
  | "ShieldCheck"
  | "HardHat";

export interface MenuItem {
  id: string; // route id like "dashboard", "inventario", etc.
  label: string;
  icon: MenuIconName;
  hidden?: boolean;
}

export interface MenuGroup {
  id: string;
  label: string;
  icon?: MenuIconName;
  items: MenuItem[];
}

export interface SecuritySettings {
  pinHash?: string | null;
}

export type AiProvider = "lovable" | "openai" | "custom";

export interface AiSettings {
  provider: AiProvider;
  /** Override key. Si vacío con provider="lovable", se usa LOVABLE_API_KEY del servidor. */
  apiKey?: string;
  model: string;
  /** Solo para provider="custom" (endpoint compatible con OpenAI). */
  baseUrl?: string;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface AppSettings {
  issuer: IssuerSettings;
  branding: BrandingSettings;
  pdf: PdfSettings;
  folio: FolioSettings;
  units: string[];
  categories: string[];
  suppliers: string[];
  menuGroups?: MenuGroup[];
  security?: SecuritySettings;
  ai?: AiSettings;
}

export interface ExtractedQuoteItem {
  partNumber: string;
  name: string;
  description?: string;
  price: number;
  currency: Currency;
  unit?: string;
  quantity?: number;
}

export interface SupplierQuote {
  id: string;
  supplier: string;
  reference?: string; // folio del proveedor
  notes?: string;
  source: "image" | "text" | "pdf";
  rawText?: string;
  imageDataUrl?: string | null;
  items: ExtractedQuoteItem[];
  /** Índices de `items` ya aplicados al inventario (para reanudar). */
  appliedItemIndexes?: number[];
  createdAt: string;
  appliedAt?: string | null;
}

export interface Reminder {
  id: string;
  clientId: string;
  dueDate: string; // ISO
  note: string;
  done: boolean;
  createdAt: string;
}

export type ActiveTask =
  | { kind: "quote"; id: string }
  | { kind: "kit"; id: string }
  | null;
