import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { locks } from "../server/db.server";
import { getAppSession } from "../server/session.server";

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 min de inactividad

interface SessionUser {
  userId: string;
  email: string;
  name: string | null;
}

async function requireUser(): Promise<SessionUser> {
  const session = await getAppSession();
  if (!session.data.userId || !session.data.email) {
    throw new Error("No autenticado");
  }
  return {
    userId: session.data.userId,
    email: session.data.email,
    name: session.data.name ?? null,
  };
}

function isExpired(refreshedAt: Date): boolean {
  return Date.now() - new Date(refreshedAt).getTime() > LOCK_TTL_MS;
}

const resourceSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^(quote|kit):[a-zA-Z0-9_-]+$/);

export interface LockInfo {
  resource: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  acquiredAt: string;
  refreshedAt: string;
}

/** Lista todos los locks activos (no expirados) */
export const listLocks = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser();
  const col = await locks();
  const cutoff = new Date(Date.now() - LOCK_TTL_MS);
  // Limpia los expirados
  await col.deleteMany({ refreshedAt: { $lt: cutoff } });
  const docs = await col.find({}).toArray();
  return docs.map<LockInfo>((d) => ({
    resource: d.resource,
    userId: d.userId,
    userName: d.userName,
    userEmail: d.userEmail,
    acquiredAt: d.acquiredAt.toISOString(),
    refreshedAt: d.refreshedAt.toISOString(),
  }));
});

/**
 * Intenta adquirir el lock. Si ya lo tiene otro usuario activo,
 * devuelve { ok: false, holder }.
 */
export const acquireLock = createServerFn({ method: "POST" })
  .inputValidator(z.object({ resource: resourceSchema }).parse)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const col = await locks();
    const existing = await col.findOne({ resource: data.resource });
    const now = new Date();

    if (existing) {
      if (existing.userId === user.userId) {
        await col.updateOne(
          { resource: data.resource },
          { $set: { refreshedAt: now } },
        );
        return {
          ok: true as const,
          lock: serialize({ ...existing, refreshedAt: now }),
        };
      }
      if (!isExpired(existing.refreshedAt)) {
        return {
          ok: false as const,
          holder: serialize(existing),
        };
      }
      // expirado: tomamos el lock
      await col.updateOne(
        { resource: data.resource },
        {
          $set: {
            userId: user.userId,
            userName: user.name,
            userEmail: user.email,
            acquiredAt: now,
            refreshedAt: now,
          },
        },
      );
      const fresh = await col.findOne({ resource: data.resource });
      return { ok: true as const, lock: serialize(fresh!) };
    }

    await col.insertOne({
      resource: data.resource,
      userId: user.userId,
      userName: user.name,
      userEmail: user.email,
      acquiredAt: now,
      refreshedAt: now,
    });
    const fresh = await col.findOne({ resource: data.resource });
    return { ok: true as const, lock: serialize(fresh!) };
  });

/** Refresca el lock (heartbeat). Solo si el caller es el dueño. */
export const refreshLock = createServerFn({ method: "POST" })
  .inputValidator(z.object({ resource: resourceSchema }).parse)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const col = await locks();
    const res = await col.updateOne(
      { resource: data.resource, userId: user.userId },
      { $set: { refreshedAt: new Date() } },
    );
    return { ok: res.matchedCount > 0 };
  });

/** Libera el lock si el caller es el dueño (o admin via force). */
export const releaseLock = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ resource: resourceSchema, force: z.boolean().optional() }).parse,
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const col = await locks();
    const filter: any = { resource: data.resource };
    if (!data.force) filter.userId = user.userId;
    const res = await col.deleteOne(filter);
    return { ok: res.deletedCount > 0 };
  });

/** Libera todos los locks del usuario actual (al hacer logout). */
export const releaseAllMyLocks = createServerFn({ method: "POST" }).handler(
  async () => {
    const user = await requireUser();
    const col = await locks();
    await col.deleteMany({ userId: user.userId });
    return { ok: true };
  },
);

function serialize(d: {
  resource: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  acquiredAt: Date;
  refreshedAt: Date;
}): LockInfo {
  return {
    resource: d.resource,
    userId: d.userId,
    userName: d.userName,
    userEmail: d.userEmail,
    acquiredAt: d.acquiredAt.toISOString(),
    refreshedAt: d.refreshedAt.toISOString(),
  };
}
