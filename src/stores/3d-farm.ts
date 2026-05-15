import { create } from "zustand";
import { registerServerStore } from "@/lib/server-store-sync";
import { v4 as uuid } from "uuid";

export type PrinterState = "Inactiva" | "Imprimiendo" | "Pausada" | "Mantenimiento";

export interface Printer3D {
  id: string;
  name: string;
  model: string;
  state: PrinterState;
  material: string; // PLA, PETG, ABS, TPU...
  color: string;
  currentSpoolId?: string; // ID de la bobina cargada
  currentOrderId?: string; // ID de la orden que está imprimiendo actualmente
  currentFileId?: string; // ID del archivo CAD vinculado en impresión
  createdAt: string;
  posZ?: number;
  isTall?: boolean;
  rotation?: number;
  roomLocation?: string;
}

export interface ProductionFailure {
  id: string;
  reason: string;
  photoUrl?: string;
  date: string;
  amount: number;
  operator?: string;
}

export interface ProductionLog {
  id: string;
  date: string;
  amount: number;
  operator: string;
}

export type ProductionOrderStatus = "Pendiente" | "En Progreso" | "Pausada" | "Impreso (A Post-Proceso)" | "Quitando Soportes" | "Acabado (Lijado/Pintura)" | "Completada" | "Cancelada";

export interface ProductionOrder {
  id: string;
  name: string; // Nombre de la pieza
  description?: string; // Notas o especificaciones de la orden
  weightPerPiece?: number; // Peso en gramos de cada pieza
  printTimeMinutes?: number; // Tiempo de impresión por pieza en minutos
  material?: string; // Material requerido (ej. PLA, PETG)
  projectId?: string; // (Opcional) Si la orden viene de un proyecto del ERP
  cadProjectId?: string; // (Opcional) Vínculo con la Bóveda CAD 3D
  targetPieces: number; // Cuota objetivo
  printedPieces: number; // Piezas buenas
  failedPieces: number; // Mermas/Fallos
  deadline: string; // Fecha de entrega
  status: ProductionOrderStatus;
  assignedPrinters: string[]; // Lista de impresoras trabajando en esto
  productionLogs?: ProductionLog[]; // Historial de producción de piezas buenas
  failures?: ProductionFailure[]; // Historial fotográfico de mermas
  createdAt: string;
  updatedAt: string;
}

export interface FilamentSpool {
  id: string;
  shortId?: string; // Código de 5 caracteres (Ej. X9K2A)
  name: string; // Ej. Esun PLA+ Negro
  material: string;
  color: string;
  weightTotal: number; // Gramos totales (ej. 1000)
  weightRemaining: number; // Gramos restantes
  emptySpoolWeight?: number; // Peso del carrete vacío/tara (ej. 200g)
  createdAt: string;
}

export interface SpoolPreset {
  id: string;
  label: string;
  brand: string;
  material: string;
  color: string;
  weight: string;
  emptyWeight: string;
  lastUsed: string;
}

interface Farm3DState {
  printers: Printer3D[];
  orders: ProductionOrder[];
  spools: FilamentSpool[];
  operators: string[];
  activeOperator: string;
  setActiveOperator: (name: string) => void;
  addOperator: (name: string) => void;
  removeOperator: (name: string) => void;
  updateOperator: (oldName: string, newName: string) => void;
  workWeekMode: "working-week" | "full-week";
  setWorkWeekMode: (mode: "working-week" | "full-week") => void;
  recentSpoolPresets?: SpoolPreset[];
  addRecentSpoolPreset: (preset: Omit<SpoolPreset, "id" | "lastUsed">) => void;
  addPrinter: (printer: Printer3D) => void;
  updatePrinter: (id: string, updates: Partial<Printer3D>) => void;
  removePrinter: (id: string) => void;
  addOrder: (order: ProductionOrder) => void;
  updateOrder: (id: string, updates: Partial<ProductionOrder>) => void;
  removeOrder: (id: string) => void;
  addSpool: (spool: FilamentSpool) => void;
  updateSpool: (id: string, updates: Partial<FilamentSpool>) => void;
  removeSpool: (id: string) => void;
}

export const useFarm3D = create<Farm3DState>()((set) => ({
      printers: [] as Printer3D[],
      orders: [] as ProductionOrder[],
      spools: [] as FilamentSpool[],
      operators: ["Operario 1"],
      activeOperator: "Operario 1",
      setActiveOperator: (name) => set({ activeOperator: name }),
      addOperator: (name) => set((s) => ({ operators: [...new Set([...(s.operators || []), name])], activeOperator: name })),
      removeOperator: (name) => set((s) => {
        const newOps = (s.operators || []).filter(o => o !== name);
        return { operators: newOps, activeOperator: s.activeOperator === name ? (newOps[0] || "Desconocido") : s.activeOperator };
      }),
      updateOperator: (oldName, newName) => set((s) => {
        const newOperators = s.operators.map(o => o === oldName ? newName : o);
        const newActive = s.activeOperator === oldName ? newName : s.activeOperator;
        const newOrders = s.orders.map(o => {
          let changed = false;
          const newLogs = o.productionLogs?.map(l => {
            if (l.operator === oldName) { changed = true; return { ...l, operator: newName }; }
            return l;
          });
          const newFailures = o.failures?.map(f => {
            if (f.operator === oldName) { changed = true; return { ...f, operator: newName }; }
            return f;
          });
          if (changed) return { ...o, productionLogs: newLogs, failures: newFailures };
          return o;
        });
        return { operators: newOperators, activeOperator: newActive, orders: newOrders };
      }),
      workWeekMode: "working-week",
      setWorkWeekMode: (mode) => set({ workWeekMode: mode }),
      recentSpoolPresets: [],
      addRecentSpoolPreset: (preset) => set((s) => {
        const current = s.recentSpoolPresets || [];
        const filtered = current.filter(p => !(p.brand === preset.brand && p.material === preset.material && p.color === preset.color));
        const newPreset = { ...preset, id: uuid(), lastUsed: new Date().toISOString() };
        return { recentSpoolPresets: [newPreset, ...filtered].slice(0, 30) };
      }),
      addPrinter: (p) => set((s) => ({ printers: [...s.printers, p] })),
      updatePrinter: (id, updates) => set((s) => ({ printers: s.printers.map((p) => p.id === id ? { ...p, ...updates } : p) })),
      removePrinter: (id) => set((s) => ({ printers: s.printers.filter((p) => p.id !== id) })),
      addOrder: (o) => set((s) => ({ orders: [...s.orders, o] })),
      updateOrder: (id, updates) => set((s) => ({ orders: s.orders.map((o) => o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o) })),
      removeOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      addSpool: (sp) => set((s) => ({ spools: [...s.spools, sp] })),
      updateSpool: (id, updates) => set((s) => ({ spools: s.spools.map((sp) => sp.id === id ? { ...sp, ...updates } : sp) })),
      removeSpool: (id) => set((s) => ({ spools: s.spools.filter((sp) => sp.id !== id) })),
}));

registerServerStore("midas:v1:farm3d", useFarm3D, (state) => ({ printers: state.printers, orders: state.orders, spools: state.spools, operators: state.operators, activeOperator: state.activeOperator, recentSpoolPresets: state.recentSpoolPresets || [], workWeekMode: state.workWeekMode }), { shared: true });