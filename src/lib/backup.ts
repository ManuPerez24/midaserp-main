import { useInventory } from "@/stores/inventory";
import { useClients } from "@/stores/clients";
import { useKits } from "@/stores/kits";
import { useQuotes } from "@/stores/quotes";
import { useSettings } from "@/stores/settings";

export interface BackupFile {
  version: 1;
  exportedAt: string;
  app: "MIDAS";
  data: {
    products: ReturnType<typeof useInventory.getState>["products"];
    clients: ReturnType<typeof useClients.getState>["clients"];
    kits: ReturnType<typeof useKits.getState>["kits"];
    quotes: ReturnType<typeof useQuotes.getState>["quotes"];
    settings: ReturnType<typeof useSettings.getState>["settings"];
  };
}

export function exportBackup(): BackupFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "MIDAS",
    data: {
      products: useInventory.getState().products,
      clients: useClients.getState().clients,
      kits: useKits.getState().kits,
      quotes: useQuotes.getState().quotes,
      settings: useSettings.getState().settings,
    },
  };
}

export function downloadBackup() {
  const backup = exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `midas-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateBackup(raw: unknown): raw is BackupFile {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Partial<BackupFile>;
  if (b.app !== "MIDAS") return false;
  if (b.version !== 1) return false;
  if (!b.data || typeof b.data !== "object") return false;
  const d = b.data;
  return (
    Array.isArray(d.products) &&
    Array.isArray(d.clients) &&
    Array.isArray(d.kits) &&
    Array.isArray(d.quotes) &&
    !!d.settings
  );
}

export function restoreBackup(backup: BackupFile) {
  // Replace state in each store directly
  useInventory.setState({ products: backup.data.products });
  useClients.setState({ clients: backup.data.clients });
  useKits.setState({ kits: backup.data.kits });
  useQuotes.setState({ quotes: backup.data.quotes });
  useSettings.setState({ settings: backup.data.settings });
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!validateBackup(parsed)) {
    throw new Error("Archivo de backup inválido");
  }
  return parsed;
}
