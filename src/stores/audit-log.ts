import { create } from "zustand";
import { registerServerStore } from "@/lib/server-store-sync";
import { useAuth } from "./auth";

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO
  userId: string;
  userName: string;
  userEmail: string;
  action: string; // e.g., "product:create", "quote:status_change"
  details: string; // e.g., "Producto 'SKU-123' creado" or "Cotización 'COT-001' a 'Aceptada'"
}

interface AuditLogState {
  logs: AuditLogEntry[];
  add: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => void;
}

export const useAuditLog = create<AuditLogState>((set) => ({
  logs: [],
  add: (entry) => {
    const newLog: AuditLogEntry = { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    set((state) => ({ logs: [newLog, ...state.logs].slice(0, 2000) })); // Aumentamos el límite para histórico en BD
  },
}));

registerServerStore("midas:v1:audit-log", useAuditLog, (state) => ({ logs: state.logs }), { shared: true });

export function logAction(action: string, details: string) {
  const user = useAuth.getState().user;
  if (!user) return;
  useAuditLog.getState().add({ userId: user.userId, userName: user.name || "", userEmail: user.email, action, details });
}