import { v4 as uuid } from "uuid";
import type { Product, Client, Currency } from "@/lib/types";

export const demoProducts: Omit<Product, "id" | "sku" | "createdAt">[] = [
  {
    partNumber: "HDMI-4K-2M",
    name: "Cable HDMI 4K 2 metros",
    description: "Cable HDMI alta velocidad 4K@60Hz, 2 metros, blindado.",
    price: 189,
    currency: "MXN",
    unit: "PIEZA",
    category: "Cables",
    categories: ["Cables", "Audio/Video"],
    supplier: "TechMX",
  },
  {
    partNumber: "RJ45-CAT6",
    name: "Conector RJ45 CAT6",
    description: "Conector blindado para cable de red CAT6.",
    price: 8.5,
    currency: "MXN",
    unit: "PIEZA",
    category: "Conectividad",
    categories: ["Conectividad", "Conectores"],
    supplier: "TechMX",
  },
];

export const demoClients: Omit<Client, "id" | "createdAt">[] = [
  {
    receiver: "María González",
    company: "Constructora Aurora",
    email: "compras@aurora.mx",
    phone: "+52 55 1234 5678",
    address: "Av. Insurgentes 1234, CDMX",
  },
  {
    receiver: "Carlos Méndez",
    company: "Logística del Bajío",
    email: "carlos@logbajio.mx",
    phone: "+52 477 234 5678",
    address: "Blvd. Adolfo López Mateos 800, León",
  },
];

// kept for future use
export const _demoUuid = uuid;

// ===========================================================================
// 200 productos demo: generador determinístico (mismo input → misma salida)
// ===========================================================================

interface Family {
  prefix: string;
  base: string;
  cats: string[];
  units: string[];
  suppliers: string[];
  priceRange: [number, number];
  currency?: Currency;
  descriptors: string[];
  variants: string[];
}

const FAMILIES: Family[] = [
  {
    prefix: "CAB-HDMI",
    base: "Cable HDMI",
    cats: ["Cables", "Audio/Video"],
    units: ["PIEZA"],
    suppliers: ["TechMX", "ElectroSur"],
    priceRange: [120, 850],
    descriptors: ["1m", "2m", "3m", "5m", "10m", "15m"],
    variants: ["Estándar", "4K", "8K", "Premium", "Trenzado"],
  },
  {
    prefix: "CAB-USB",
    base: "Cable USB",
    cats: ["Cables", "Conectividad"],
    units: ["PIEZA"],
    suppliers: ["TechMX", "GlobalImport"],
    priceRange: [40, 480],
    descriptors: ["A-C", "C-C", "A-B", "Micro", "Lightning"],
    variants: ["1m", "2m", "Reforzado", "Magnético"],
  },
  {
    prefix: "CAB-UTP",
    base: "Cable UTP",
    cats: ["Conectividad", "Redes"],
    units: ["METRO", "ROLLO"],
    suppliers: ["RedesPro", "TechMX"],
    priceRange: [12, 4500],
    descriptors: ["CAT5e", "CAT6", "CAT6A", "CAT7"],
    variants: ["Interior", "Exterior", "Blindado", "Plenum"],
  },
  {
    prefix: "RJ45",
    base: "Conector RJ45",
    cats: ["Conectividad", "Conectores"],
    units: ["PIEZA", "PAQUETE"],
    suppliers: ["RedesPro"],
    priceRange: [4, 220],
    descriptors: ["CAT5e", "CAT6", "CAT6A"],
    variants: ["Estándar", "Blindado", "Pass-Through"],
  },
  {
    prefix: "ROU-WIFI",
    base: "Router WiFi",
    cats: ["Redes", "WiFi"],
    units: ["PIEZA"],
    suppliers: ["RedesPro", "ElectroSur"],
    priceRange: [780, 9800],
    descriptors: ["AC1200", "AC1900", "AX1500", "AX3000", "AX5400", "BE9300"],
    variants: ["Doméstico", "Empresarial", "Mesh", "Gaming"],
  },
  {
    prefix: "SW-NET",
    base: "Switch de red",
    cats: ["Redes", "Infraestructura"],
    units: ["PIEZA"],
    suppliers: ["RedesPro"],
    priceRange: [690, 28000],
    descriptors: ["8P", "16P", "24P", "48P"],
    variants: ["Gigabit", "PoE", "Administrable", "Capa 3"],
  },
  {
    prefix: "AP-WIFI",
    base: "Access Point",
    cats: ["Redes", "WiFi"],
    units: ["PIEZA"],
    suppliers: ["RedesPro"],
    priceRange: [1100, 12500],
    descriptors: ["AC1200", "AC1750", "AX1800", "AX3000"],
    variants: ["Interior", "Exterior", "Techo", "Pared"],
  },
  {
    prefix: "FIB-OPT",
    base: "Fibra óptica",
    cats: ["Conectividad", "Redes", "Infraestructura"],
    units: ["PIEZA", "METRO"],
    suppliers: ["RedesPro"],
    priceRange: [180, 6500],
    descriptors: ["LC-LC", "SC-SC", "LC-SC", "MTP-MTP"],
    variants: ["OM3", "OM4", "OS2", "Armada"],
  },
  {
    prefix: "MNT-TV",
    base: "Soporte de TV",
    cats: ["Accesorios", "Audio/Video", "Instalación"],
    units: ["PIEZA"],
    suppliers: ["MountIt", "GlobalImport"],
    priceRange: [220, 2800],
    descriptors: ['23"-43"', '32"-55"', '40"-75"', '55"-90"'],
    variants: ["Fijo", "Inclinable", "Articulado", "Motorizado"],
  },
  {
    prefix: "CAM-IP",
    base: "Cámara IP",
    cats: ["Seguridad", "Video", "CCTV"],
    units: ["PIEZA"],
    suppliers: ["SecureMX", "ElectroSur"],
    priceRange: [890, 8900],
    descriptors: ["2MP", "4MP", "5MP", "8MP"],
    variants: ["Bullet", "Domo", "PTZ", "Fisheye"],
  },
  {
    prefix: "DVR-NVR",
    base: "Grabador NVR",
    cats: ["Seguridad", "CCTV", "Almacenamiento"],
    units: ["PIEZA"],
    suppliers: ["SecureMX"],
    priceRange: [1990, 22000],
    descriptors: ["4ch", "8ch", "16ch", "32ch"],
    variants: ["1TB", "2TB", "4TB", "Sin disco"],
  },
  {
    prefix: "RACK",
    base: "Rack",
    cats: ["Infraestructura", "Instalación"],
    units: ["PIEZA"],
    suppliers: ["MountIt", "RedesPro"],
    priceRange: [950, 18500],
    descriptors: ["6U", "9U", "12U", "18U", "24U", "42U"],
    variants: ["Pared", "Piso", "Abierto", "Cerrado"],
  },
  {
    prefix: "UPS",
    base: "UPS",
    cats: ["Energía", "Infraestructura", "Protección"],
    units: ["PIEZA"],
    suppliers: ["ElectroSur"],
    priceRange: [890, 19500],
    descriptors: ["500VA", "750VA", "1000VA", "1500VA", "3000VA"],
    variants: ["Línea Interactiva", "Online", "Standby"],
  },
  {
    prefix: "PRJ",
    base: "Proyector",
    cats: ["Audio/Video", "Presentación"],
    units: ["PIEZA"],
    suppliers: ["GlobalImport", "ElectroSur"],
    priceRange: [4800, 38000],
    descriptors: ["3000lm", "4000lm", "5000lm", "6500lm"],
    variants: ["HD", "Full HD", "4K", "Láser"],
  },
  {
    prefix: "MIC",
    base: "Micrófono",
    cats: ["Audio/Video", "Audio", "Conferencia"],
    units: ["PIEZA"],
    suppliers: ["GlobalImport"],
    priceRange: [320, 6800],
    descriptors: ["Lavalier", "Mano", "Diadema", "Gooseneck"],
    variants: ["Inalámbrico", "Cableado", "USB", "XLR"],
  },
  {
    prefix: "BOC",
    base: "Bocinas",
    cats: ["Audio/Video", "Audio"],
    units: ["PIEZA", "PAQUETE"],
    suppliers: ["GlobalImport"],
    priceRange: [490, 12500],
    descriptors: ["6.5\"", "8\"", "10\""],
    variants: ["Pared", "Techo", "Bookshelf", "Activas"],
  },
  {
    prefix: "TEC",
    base: "Teclado",
    cats: ["Periféricos", "Cómputo"],
    units: ["PIEZA"],
    suppliers: ["TechMX"],
    priceRange: [180, 3800],
    descriptors: ["USB", "Inalámbrico", "Bluetooth"],
    variants: ["Mecánico", "Membrana", "Ergonómico", "Compacto"],
  },
  {
    prefix: "MOU",
    base: "Mouse",
    cats: ["Periféricos", "Cómputo"],
    units: ["PIEZA"],
    suppliers: ["TechMX"],
    priceRange: [120, 2800],
    descriptors: ["USB", "Inalámbrico", "Bluetooth"],
    variants: ["Óptico", "Láser", "Gaming", "Ergonómico"],
  },
  {
    prefix: "MON",
    base: "Monitor",
    cats: ["Cómputo", "Audio/Video"],
    units: ["PIEZA"],
    suppliers: ["TechMX", "GlobalImport"],
    priceRange: [2400, 24000],
    descriptors: ["21.5\"", "24\"", "27\"", "32\"", "34\"", "43\""],
    variants: ["Full HD", "QHD", "4K", "Curvo", "Ultrawide"],
  },
  {
    prefix: "DSC",
    base: "Disco",
    cats: ["Almacenamiento", "Cómputo"],
    units: ["PIEZA"],
    suppliers: ["TechMX"],
    priceRange: [690, 8900],
    descriptors: ["500GB", "1TB", "2TB", "4TB", "8TB"],
    variants: ["HDD", "SSD", "NVMe", "Externo"],
  },
];

// Mulberry32 PRNG → resultados estables
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXTRA_TAGS = [
  "Top ventas",
  "Promoción",
  "Nuevo",
  "Premium",
  "Stock limitado",
  "Profesional",
];

function pad(n: number, len = 4) {
  return n.toString().padStart(len, "0");
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function round(n: number, step = 5) {
  return Math.round(n / step) * step;
}

export function generateDemoProducts(
  count = 200,
  seed = 42,
): Product[] {
  const rnd = seeded(seed);
  const items: Product[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const fam = FAMILIES[i % FAMILIES.length];
    const desc = pick(fam.descriptors, rnd);
    const variant = pick(fam.variants, rnd);
    const supplier = pick(fam.suppliers, rnd);
    const unit = pick(fam.units, rnd);
    const partNum = `${fam.prefix}-${desc.replace(/[^A-Z0-9]/gi, "")}-${pad(i + 1)}`;
    const name = `${fam.base} ${variant} ${desc}`;
    const description = `${fam.base} variante ${variant} (${desc}). Categorías: ${fam.cats.join(", ")}.`;
    const [lo, hi] = fam.priceRange;
    const price = round(lo + rnd() * (hi - lo), price_step(lo));
    const currency: Currency = fam.currency ?? (rnd() < 0.85 ? "MXN" : "USD");
    // Multi-categoría: 60% lleva 2-3, 40% lleva 1
    const cats = [...fam.cats];
    let categories: string[];
    if (rnd() < 0.6 && cats.length >= 2) {
      const k = 2 + (rnd() < 0.4 ? 1 : 0);
      categories = cats.slice(0, Math.min(k, cats.length));
      // 30% probabilidad de añadir un tag transversal
      if (rnd() < 0.3) categories.push(pick(EXTRA_TAGS, rnd));
    } else {
      categories = [pick(cats, rnd)];
    }
    items.push({
      id: uuid(),
      sku: `${fam.prefix}-${pad(i + 1)}-${Math.floor(rnd() * 9000 + 1000)}`,
      partNumber: partNum,
      name,
      description,
      price,
      currency,
      unit,
      category: categories[0],
      categories,
      supplier,
      website: "",
      imageDataUrl: null,
      createdAt: new Date(now - i * 60_000).toISOString(),
    });
  }
  return items;
}

function price_step(low: number) {
  if (low < 50) return 1;
  if (low < 500) return 5;
  if (low < 5000) return 10;
  return 50;
}
