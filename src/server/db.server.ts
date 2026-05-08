import { MongoClient, Db, Collection } from "mongodb";
import bcrypt from "bcryptjs";

let client: MongoClient | null = null;
let db: Db | null = null;

export interface UserDoc {
  _id?: any;
  email: string;
  passwordHash?: string | null;
  name?: string | null;
  picture?: string | null;
  googleId?: string | null;
  isAdmin?: boolean;
  permissions?: string[] | null;
  createdAt: Date;
}

export interface UserDataDoc {
  _id?: any;
  userId: string;
  store: string;
  data: any;
  updatedAt: Date;
}

export interface LockDoc {
  _id?: any;
  resource: string; // e.g. "quote:123" or "kit:abc"
  userId: string;
  userName: string | null;
  userEmail: string;
  acquiredAt: Date;
  refreshedAt: Date;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not configured");
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("midas_erp");
  await db.collection<UserDoc>("users").createIndex({ email: 1 }, { unique: true });
  await db.collection<UserDoc>("users").createIndex({ googleId: 1 }, { sparse: true });
  await db
    .collection<UserDataDoc>("user_data")
    .createIndex({ userId: 1, store: 1 }, { unique: true });
  const locksCol = db.collection<LockDoc>("locks");
  await locksCol.createIndex({ resource: 1 }, { unique: true });
  await locksCol.createIndex({ refreshedAt: 1 });
  await migrateAndSeed(db);
  await migrateSharedStores(db);
  return db;
}

async function migrateAndSeed(database: Db) {
  const col = database.collection<UserDoc>("users");
  const NEW_ADMIN = "admin@admin.com";
  const OLD_ADMIN = "elyuyo8@gmail.com";

  // Migración: si existe el viejo admin y no existe el nuevo, renombrar
  const oldUser = await col.findOne({ email: OLD_ADMIN });
  const newUser = await col.findOne({ email: NEW_ADMIN });
  if (oldUser && !newUser) {
    await col.updateOne(
      { _id: oldUser._id },
      {
        $set: {
          email: NEW_ADMIN,
          passwordHash: await bcrypt.hash("admin", 10),
          isAdmin: true,
          name: oldUser.name ?? "Administrador",
        },
      },
    );
    console.log("[migrate] Admin user renamed:", OLD_ADMIN, "->", NEW_ADMIN);
    return;
  }

  // Seed: crear admin si no existe
  if (!newUser) {
    await col.insertOne({
      email: NEW_ADMIN,
      passwordHash: await bcrypt.hash("admin", 10),
      name: "Administrador",
      isAdmin: true,
      createdAt: new Date(),
    });
    console.log("[seed] Default admin user created:", NEW_ADMIN);
  } else if (!newUser.isAdmin) {
    // Asegurar que tenga rol admin
    await col.updateOne({ _id: newUser._id }, { $set: { isAdmin: true } });
  }
}

const SHARED_USER_ID = "__shared__";
const SHARED_STORES = ["midas:v1:quotes", "midas:v1:kits"];

async function migrateSharedStores(database: Db) {
  const col = database.collection<UserDataDoc>("user_data");
  for (const store of SHARED_STORES) {
    const existingShared = await col.findOne({ userId: SHARED_USER_ID, store });
    if (existingShared) continue;
    // Find the per-user doc with the most content (first non-empty)
    const candidates = await col.find({ store, userId: { $ne: SHARED_USER_ID } }).toArray();
    const best = candidates
      .map((d) => ({ d, count: countItems(d.data) }))
      .sort((a, b) => b.count - a.count)[0];
    if (!best || best.count === 0) continue;
    await col.insertOne({
      userId: SHARED_USER_ID,
      store,
      data: best.d.data,
      updatedAt: new Date(),
    });
    console.log(`[migrate] Promoted ${store} to shared from user ${best.d.userId} (${best.count} items)`);
  }
}

function countItems(data: any): number {
  if (!data || typeof data !== "object") return 0;
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) return v.length;
  }
  return 0;
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export async function userData(): Promise<Collection<UserDataDoc>> {
  return (await getDb()).collection<UserDataDoc>("user_data");
}

export async function locks(): Promise<Collection<LockDoc>> {
  return (await getDb()).collection<LockDoc>("locks");
}
