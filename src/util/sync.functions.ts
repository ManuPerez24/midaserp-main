import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { userData } from "../server/db.server";
import { getAppSession } from "../server/session.server";

const SHARED_USER_ID = "__shared__";

async function requireUserId(): Promise<string> {
  const session = await getAppSession();
  if (!session.data.userId) throw new Error("No autenticado");
  return session.data.userId;
}

export const loadAllUserData = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const col = await userData();
  // Load both: per-user docs and shared docs. Shared overrides per-user for same store.
  const docs = await col.find({ userId: { $in: [userId, SHARED_USER_ID] } }).toArray();
  const perUser: Record<string, any> = {};
  const shared: Record<string, any> = {};
  for (const d of docs) {
    if (d.userId === SHARED_USER_ID) shared[d.store] = d.data;
    else perUser[d.store] = d.data;
  }
  return { ...perUser, ...shared };
});

export const saveUserData = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      store: z.string().min(1).max(80).regex(/^[a-zA-Z0-9:_-]+$/),
      data: z.any(),
      shared: z.boolean().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const userId = data.shared ? SHARED_USER_ID : await requireUserId();
    // If shared, must still be authenticated
    if (data.shared) await requireUserId();
    const col = await userData();
    await col.updateOne(
      { userId, store: data.store },
      { $set: { userId, store: data.store, data: data.data, updatedAt: new Date() } },
      { upsert: true },
    );
    return { ok: true };
  });
