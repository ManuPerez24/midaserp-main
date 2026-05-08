import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { users } from "../server/db.server";
import { getAppSession } from "../server/session.server";
import { ALL_PERMISSION_KEYS, isValidPermission, type PermissionKey } from "@/lib/permissions";

const permissionsSchema = z
  .array(z.string().refine(isValidPermission, "permiso inválido"))
  .max(ALL_PERMISSION_KEYS.length)
  .transform((arr) => Array.from(new Set(arr)) as PermissionKey[]);

async function requireSession() {
  const session = await getAppSession();
  if (!session.data.userId) throw new Error("No autenticado");
  return session;
}

async function requireAdmin() {
  const session = await requireSession();
  const col = await users();
  const me = await col.findOne({ _id: new ObjectId(session.data.userId) });
  if (!me?.isAdmin) throw new Error("Requiere permisos de administrador");
  return { session, me };
}

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAppSession();
  if (!session.data.userId) return null;
  try {
    const col = await users();
    const u = await col.findOne({ _id: new ObjectId(session.data.userId) });
    if (!u) return null;
    return {
      userId: u._id.toString(),
      email: u.email,
      name: u.name ?? null,
      picture: u.picture ?? null,
      isAdmin: !!u.isAdmin,
      permissions: Array.isArray(u.permissions) ? (u.permissions as PermissionKey[]) : null,
    };
  } catch {
    return null;
  }
});

export const signup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(4).max(200),
      name: z.string().min(1).max(100).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const col = await users();
    const existing = await col.findOne({ email: data.email });
    if (existing) throw new Error("Ese email ya está registrado");
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await col.insertOne({
      email: data.email,
      passwordHash,
      name: data.name ?? null,
      isAdmin: false,
      createdAt: new Date(),
    });
    const session = await getAppSession();
    await session.update({
      userId: result.insertedId.toString(),
      email: data.email,
      name: data.name ?? "",
    });
    return {
      ok: true,
      user: {
        userId: result.insertedId.toString(),
        email: data.email,
        name: data.name ?? null,
        picture: null,
        isAdmin: false,
      },
    };
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(1),
    }).parse,
  )
  .handler(async ({ data }) => {
    const col = await users();
    const user = await col.findOne({ email: data.email });
    if (!user || !user.passwordHash) throw new Error("Credenciales inválidas");
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new Error("Credenciales inválidas");
    const session = await getAppSession();
    await session.update({
      userId: user._id.toString(),
      email: user.email,
      name: user.name ?? "",
      picture: user.picture ?? "",
    });
    return {
      ok: true,
      user: {
        userId: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
        picture: user.picture ?? null,
        isAdmin: !!user.isAdmin,
        permissions: Array.isArray(user.permissions) ? (user.permissions as PermissionKey[]) : null,
      },
    };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  await session.clear();
  return { ok: true };
});

// ============ CRUD usuarios (admin) ============

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const col = await users();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map((u) => ({
    userId: u._id.toString(),
    email: u.email,
    name: u.name ?? null,
    isAdmin: !!u.isAdmin,
    permissions: Array.isArray(u.permissions) ? (u.permissions as PermissionKey[]) : null,
    createdAt: u.createdAt?.toISOString() ?? null,
  }));
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(4).max(200),
      name: z.string().min(1).max(100).optional(),
      isAdmin: z.boolean().optional().default(false),
      permissions: permissionsSchema.optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const col = await users();
    const existing = await col.findOne({ email: data.email });
    if (existing) throw new Error("Ese email ya está registrado");
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await col.insertOne({
      email: data.email,
      passwordHash,
      name: data.name ?? null,
      isAdmin: !!data.isAdmin,
      permissions: data.permissions ?? null,
      createdAt: new Date(),
    });
    return { ok: true, userId: result.insertedId.toString() };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      email: z.string().email().toLowerCase().optional(),
      name: z.string().min(1).max(100).nullable().optional(),
      isAdmin: z.boolean().optional(),
      newPassword: z.string().min(4).max(200).optional(),
      permissions: permissionsSchema.nullable().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { me: admin } = await requireAdmin();
    const col = await users();
    const target = await col.findOne({ _id: new ObjectId(data.userId) });
    if (!target) throw new Error("Usuario no encontrado");

    const update: Record<string, unknown> = {};
    if (data.email !== undefined && data.email !== target.email) {
      const dup = await col.findOne({ email: data.email });
      if (dup) throw new Error("Email ya en uso");
      update.email = data.email;
    }
    if (data.name !== undefined) update.name = data.name;
    if (data.isAdmin !== undefined) {
      // No permitir que el admin se quite a sí mismo el rol si es el último admin
      if (
        admin._id.toString() === data.userId &&
        data.isAdmin === false
      ) {
        const otherAdmins = await col.countDocuments({
          isAdmin: true,
          _id: { $ne: admin._id },
        });
        if (otherAdmins === 0) throw new Error("No puedes quitar el último admin");
      }
      update.isAdmin = data.isAdmin;
    }
    if (data.newPassword) {
      update.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }
    if (data.permissions !== undefined) {
      update.permissions = data.permissions; // null = sin restricción
    }

    if (Object.keys(update).length > 0) {
      await col.updateOne({ _id: target._id }, { $set: update });
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const { me: admin } = await requireAdmin();
    if (admin._id.toString() === data.userId) {
      throw new Error("No puedes eliminar tu propia cuenta");
    }
    const col = await users();
    const target = await col.findOne({ _id: new ObjectId(data.userId) });
    if (!target) throw new Error("Usuario no encontrado");
    if (target.isAdmin) {
      const otherAdmins = await col.countDocuments({
        isAdmin: true,
        _id: { $ne: target._id },
      });
      if (otherAdmins === 0) throw new Error("No puedes eliminar el último admin");
    }
    await col.deleteOne({ _id: target._id });
    return { ok: true };
  });

// ============ Cambio de contraseña propio ============

export const changeMyPassword = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(4).max(200),
    }).parse,
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const col = await users();
    const u = await col.findOne({ _id: new ObjectId(session.data.userId) });
    if (!u || !u.passwordHash) throw new Error("Usuario no encontrado");
    const ok = await bcrypt.compare(data.currentPassword, u.passwordHash);
    if (!ok) throw new Error("Contraseña actual incorrecta");
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await col.updateOne({ _id: u._id }, { $set: { passwordHash } });
    return { ok: true };
  });
