import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  heartbeat,
  release,
  tryAcquire,
  useLocksStore,
} from "@/stores/locks";
import { useAuth } from "@/stores/auth";
import type { LockInfo } from "@/util/locks.functions";

const HEARTBEAT_MS = 60 * 1000; // 1 min

export interface LockState {
  /** El recurso está libre o lo tienes tú. */
  canEdit: boolean;
  /** Lock vigente (si lo hay) — propio o ajeno. */
  holder: LockInfo | null;
  /** ¿Soy yo el dueño? */
  isMine: boolean;
  /** Solicita el lock; muestra toast si está bloqueado. */
  acquire: () => Promise<boolean>;
  /** Libera el lock si es mío. */
  releaseMine: () => Promise<void>;
  /** Solo admins: libera el lock de otro usuario. */
  forceRelease: () => Promise<void>;
}

/**
 * Observa el estado de bloqueo de un recurso. No adquiere el lock
 * automáticamente, pero hace heartbeat mientras el componente esté
 * montado y el lock sea propio.
 */
export function useResourceLock(resource: string | null): LockState {
  const user = useAuth((s) => s.user);
  const lockMap = useLocksStore((s) => s.locks);
  const holder = resource ? lockMap[resource] ?? null : null;
  const isMine = !!holder && !!user && holder.userId === user.userId;

  // Heartbeat cuando el lock es nuestro
  useEffect(() => {
    if (!resource || !isMine) return;
    const t = setInterval(() => heartbeat(resource), HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [resource, isMine]);

  // Liberar al desmontar si era nuestro
  // (NO lo hacemos automáticamente: el usuario decide cerrar modo edición.
  // En logout limpiamos todo via releaseAllMine.)

  const [, force] = useState(0);

  const acquire = async (): Promise<boolean> => {
    if (!resource) return false;
    const res = await tryAcquire(resource);
    force((n) => n + 1);
    if (!res.ok) {
      const who = res.holder.userName ?? res.holder.userEmail;
      toast.error(`Bloqueado por ${who}. Solo lectura.`);
      return false;
    }
    return true;
  };

  const releaseMine = async () => {
    if (!resource || !isMine) return;
    await release(resource, false);
  };

  const forceRelease = async () => {
    if (!resource) return;
    if (!user?.isAdmin) {
      toast.error("Solo admins pueden forzar el desbloqueo");
      return;
    }
    await release(resource, true);
    toast.success("Bloqueo liberado");
  };

  return {
    canEdit: !holder || isMine,
    holder,
    isMine,
    acquire,
    releaseMine,
    forceRelease,
  };
}
