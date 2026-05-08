import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/stores/auth";
import {
  hydrateServerStores,
  resetServerStores,
  setServerSyncUser,
  type HydrateProgress,
} from "@/lib/server-store-sync";

export type BootstrapProgress = HydrateProgress & {
  elapsedMs: number;
  etaMs: number | null;
};

export function useAuthBootstrap() {
  const { user, loaded, refresh } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<BootstrapProgress | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;

    if (!user) {
      setServerSyncUser(null);
      resetServerStores();
      setHydrated(true);
      setProgress(null);
      return;
    }

    setHydrated(false);
    setProgress({ step: "Iniciando…", current: 0, total: 1, elapsedMs: 0, etaMs: null });
    startRef.current = Date.now();
    setServerSyncUser(user.userId);

    (async () => {
      try {
        await hydrateServerStores((p) => {
          if (cancelled) return;
          const elapsedMs = Date.now() - startRef.current;
          const etaMs =
            p.current > 0 && p.current < p.total
              ? Math.max(0, (elapsedMs / p.current) * (p.total - p.current))
              : 0;
          setProgress({ ...p, elapsedMs, etaMs });
        });
      } catch (e) {
        console.warn("[cloud-sync] hydrate failed", e);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setProgress(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded, user]);

  return { user, loaded, hydrated, progress };
}
