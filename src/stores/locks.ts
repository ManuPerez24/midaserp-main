import { create } from "zustand";
import {
  acquireLock,
  listLocks,
  refreshLock,
  releaseLock,
  releaseAllMyLocks,
  type LockInfo,
} from "@/util/locks.functions";

type LocksMap = Record<string, LockInfo>;

interface LocksStore {
  locks: LocksMap;
  loaded: boolean;
  refresh: () => Promise<void>;
  applyList: (list: LockInfo[]) => void;
}

export const useLocksStore = create<LocksStore>((set) => ({
  locks: {},
  loaded: false,
  refresh: async () => {
    try {
      const list = await listLocks();
      const map: LocksMap = {};
      list.forEach((l) => (map[l.resource] = l));
      set({ locks: map, loaded: true });
    } catch {
      // ignore
    }
  },
  applyList: (list) => {
    const map: LocksMap = {};
    list.forEach((l) => (map[l.resource] = l));
    set({ locks: map, loaded: true });
  },
}));

let pollTimer: ReturnType<typeof setInterval> | null = null;
export function startLocksPolling() {
  if (pollTimer || typeof window === "undefined") return;
  void useLocksStore.getState().refresh();
  pollTimer = setInterval(() => useLocksStore.getState().refresh(), 15000);
}
export function stopLocksPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export async function tryAcquire(resource: string) {
  const res = await acquireLock({ data: { resource } });
  await useLocksStore.getState().refresh();
  return res;
}

export async function heartbeat(resource: string) {
  try {
    await refreshLock({ data: { resource } });
  } catch {
    // ignore
  }
}

export async function release(resource: string, force = false) {
  try {
    await releaseLock({ data: { resource, force } });
  } catch {
    // ignore
  }
  await useLocksStore.getState().refresh();
}

export async function releaseAllMine() {
  try {
    await releaseAllMyLocks();
  } catch {
    // ignore
  }
}
