import { create } from "zustand";
import { registerServerStore } from "@/lib/server-store-sync";
import type { ActiveTask } from "@/lib/types";
import { release, tryAcquire, useLocksStore } from "@/stores/locks";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

interface ActiveTaskState {
  active: any;
  setQuote: (id: string) => void;
  setKit: (id: string) => void;
  setProject: (id: string) => void;
  clear: () => void;
}

export const useActiveTask = create<ActiveTaskState>((set) => ({
  active: null,
  setQuote: (id) => set({ active: { kind: "quote", id } }),
  setKit: (id) => set({ active: { kind: "kit", id } }),
  setProject: (id) => set({ active: { kind: "project", id } }),
  clear: () => set({ active: null }),
}));

registerServerStore("midas:v1:active-task", useActiveTask, (state) => ({ active: state.active }));

function resourceFor(kind: "quote" | "kit" | "project", id: string) {
  return `${kind}:${id}`;
}

async function maybeReleasePrevious(next: any) {
  const prev = useActiveTask.getState().active;
  if (!prev) return;
  if (next && prev.kind === next.kind && prev.id === next.id) return;
  if (prev.kind !== "project") {
    await release(resourceFor(prev.kind, prev.id), false);
  }
}

async function activate(kind: "quote" | "kit" | "project", id: string): Promise<boolean> {
  const user = useAuth.getState().user;
  if (!user) {
    toast.error("Sesión expirada");
    return false;
  }
  
  // Liberamos lock previo (si era distinto)
  await maybeReleasePrevious({ kind, id });

  if (kind === "project") {
    useActiveTask.getState().setProject(id);
    return true;
  }

  const resource = resourceFor(kind, id);
  const res = await tryAcquire(resource);
  if (!res.ok) {
    const who = res.holder.userName ?? res.holder.userEmail;
    toast.error(`Bloqueado por ${who}. Solo lectura mientras edita.`);
    return false;
  }
  if (kind === "quote") useActiveTask.getState().setQuote(id);
  else if (kind === "kit") useActiveTask.getState().setKit(id);
  return true;
}

/**
 * Solicita activar una cotización para edición.
 * Adquiere lock en el servidor; si está tomado por otro usuario,
 * muestra aviso y devuelve false.
 */
export async function requestActivateQuote(id: string): Promise<boolean> {
  return activate("quote", id);
}

/**
 * Solicita activar un kit para edición.
 */
export async function requestActivateKit(id: string): Promise<boolean> {
  return activate("kit", id);
}

/**
 * Solicita activar un proyecto para consumo de materiales.
 */
export async function requestActivateProject(id: string): Promise<boolean> {
  return activate("project", id);
}

/** Cierra el modo edición y libera el lock. */
export async function clearActiveTask() {
  const prev = useActiveTask.getState().active;
  useActiveTask.getState().clear();
  if (prev && prev.kind !== "project") {
    await release(resourceFor(prev.kind, prev.id), false);
  }
  await useLocksStore.getState().refresh();
}
