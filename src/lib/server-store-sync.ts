import { loadAllUserData, saveUserData } from "@/util/sync.functions";

type StoreApi<T> = {
  getState: () => T;
  setState: (partial: Partial<T>) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
};

type RegistryEntry<TState> = {
  name: string;
  shared: boolean;
  getSnapshot: () => unknown;
  applySnapshot: (snapshot: unknown) => void;
  reset: () => void;
  ensureSubscription: () => void;
};

const registry = new Map<string, RegistryEntry<any>>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

let activeUserId: string | null = null;
let suppressSaves = false;

function cloneData<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function parseStoredValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function scheduleSave(name: string, snapshot: unknown, shared: boolean) {
  if (!activeUserId || suppressSaves) return;
  const prev = debounceTimers.get(name);
  if (prev) clearTimeout(prev);
  const timer = setTimeout(async () => {
    try {
      await saveUserData({ data: { store: name, data: cloneData(snapshot), shared } });
    } catch (error) {
      console.warn("[cloud-sync] failed to save", name, error);
    }
  }, 400);
  debounceTimers.set(name, timer);
}

export function registerServerStore<TState>(
  name: string,
  store: StoreApi<TState>,
  selectSnapshot: (state: TState) => unknown,
  options: { shared?: boolean } = {},
) {
  const shared = !!options.shared;
  const initialSnapshot = cloneData(selectSnapshot(store.getState()));
  let unsubscribe: (() => void) | null = null;

  const entry: RegistryEntry<TState> = {
    name,
    shared,
    getSnapshot: () => cloneData(selectSnapshot(store.getState())),
    applySnapshot: (snapshot) => {
      const next = parseStoredValue(snapshot);
      if (next && typeof next === "object") {
        store.setState(next as Partial<TState>);
      }
    },
    reset: () => {
      store.setState(cloneData(initialSnapshot) as Partial<TState>);
    },
    ensureSubscription: () => {
      if (unsubscribe || typeof window === "undefined") return;
      unsubscribe = store.subscribe((state) => {
        scheduleSave(name, selectSnapshot(state), shared);
      });
    },
  };

  registry.set(name, entry);
  entry.ensureSubscription();
}

export function setServerSyncUser(userId: string | null) {
  activeUserId = userId;
  if (!userId) {
    for (const timer of debounceTimers.values()) clearTimeout(timer);
    debounceTimers.clear();
  }
}

export function resetServerStores() {
  suppressSaves = true;
  try {
    for (const entry of registry.values()) {
      entry.reset();
    }
  } finally {
    suppressSaves = false;
  }
}

export type HydrateProgress = {
  step: string;
  current: number;
  total: number;
};

export async function hydrateServerStores(
  onProgress?: (p: HydrateProgress) => void,
) {
  if (!activeUserId) {
    resetServerStores();
    onProgress?.({ step: "Listo", current: 1, total: 1 });
    return;
  }

  const entries = Array.from(registry.entries());
  const total = entries.length + 2;
  let current = 0;
  const tick = (step: string) => {
    current += 1;
    onProgress?.({ step, current, total });
  };

  tick("Conectando con la nube…");
  const cloud = await loadAllUserData();
  tick("Descargando datos…");

  suppressSaves = true;
  try {
    resetServerStores();
    for (const [name, entry] of entries) {
      const snapshot = (cloud as Record<string, unknown>)[name];
      if (snapshot !== undefined) {
        entry.applySnapshot(snapshot);
      }
      tick(`Cargando ${prettyName(name)}…`);
    }
  } finally {
    suppressSaves = false;
  }
}

function prettyName(name: string): string {
  const map: Record<string, string> = {
    quotes: "cotizaciones",
    clients: "clientes",
    inventory: "inventario",
    kits: "kits",
    reminders: "recordatorios",
    notifications: "notificaciones",
    settings: "ajustes",
    "supplier-quotes": "cotizaciones de proveedores",
    "quote-templates": "plantillas",
    "active-task": "tarea activa",
  };
  return map[name] ?? name;
}
