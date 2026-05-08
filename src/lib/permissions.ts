// Catálogo central de permisos por página y acción.
// Si user.permissions es null/undefined => acceso total (compat).
// Si es array => solo lo listado (admin siempre todo).

export type PermissionKey =
  // páginas (acceso a la ruta y enlace en el menú)
  | "page:dashboard"
  | "page:inventario"
  | "page:kits"
  | "page:cotizaciones"
  | "page:cotizaciones-proveedores"
  | "page:clientes"
  | "page:recordatorios"
  // acciones inventario
  | "inventario:create"
  | "inventario:edit"
  | "inventario:delete"
  | "inventario:bulk"
  | "inventario:analyze"
  // acciones kits
  | "kits:create"
  | "kits:edit"
  | "kits:delete"
  // acciones cotizaciones
  | "cotizaciones:create"
  | "cotizaciones:edit"
  | "cotizaciones:delete"
  | "cotizaciones:status"
  // cotizaciones proveedores
  | "cotizaciones-proveedores:create"
  | "cotizaciones-proveedores:apply"
  | "cotizaciones-proveedores:delete"
  // clientes
  | "clientes:create"
  | "clientes:edit"
  | "clientes:delete"
  // recordatorios
  | "recordatorios:create"
  | "recordatorios:edit"
  | "recordatorios:delete";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "pages",
    label: "Acceso a páginas",
    permissions: [
      { key: "page:dashboard", label: "Dashboard" },
      { key: "page:inventario", label: "Inventario" },
      { key: "page:kits", label: "Kits" },
      { key: "page:cotizaciones", label: "Cotizaciones" },
      { key: "page:cotizaciones-proveedores", label: "Cot. Proveedores" },
      { key: "page:clientes", label: "Clientes" },
      { key: "page:recordatorios", label: "Recordatorios" },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    permissions: [
      { key: "inventario:create", label: "Crear productos" },
      { key: "inventario:edit", label: "Editar productos" },
      { key: "inventario:delete", label: "Eliminar productos" },
      { key: "inventario:bulk", label: "Carga masiva" },
      { key: "inventario:analyze", label: "Analizar con IA" },
    ],
  },
  {
    id: "kits",
    label: "Kits",
    permissions: [
      { key: "kits:create", label: "Crear kits" },
      { key: "kits:edit", label: "Editar kits" },
      { key: "kits:delete", label: "Eliminar kits" },
    ],
  },
  {
    id: "cotizaciones",
    label: "Cotizaciones",
    permissions: [
      { key: "cotizaciones:create", label: "Crear cotizaciones" },
      { key: "cotizaciones:edit", label: "Editar cotizaciones" },
      { key: "cotizaciones:delete", label: "Eliminar cotizaciones" },
      { key: "cotizaciones:status", label: "Cambiar estado" },
    ],
  },
  {
    id: "cotizaciones-proveedores",
    label: "Cot. Proveedores",
    permissions: [
      { key: "cotizaciones-proveedores:create", label: "Crear / analizar" },
      { key: "cotizaciones-proveedores:apply", label: "Aplicar a inventario" },
      { key: "cotizaciones-proveedores:delete", label: "Eliminar" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    permissions: [
      { key: "clientes:create", label: "Crear clientes" },
      { key: "clientes:edit", label: "Editar clientes" },
      { key: "clientes:delete", label: "Eliminar clientes" },
    ],
  },
  {
    id: "recordatorios",
    label: "Recordatorios",
    permissions: [
      { key: "recordatorios:create", label: "Crear" },
      { key: "recordatorios:edit", label: "Editar" },
      { key: "recordatorios:delete", label: "Eliminar" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions.map((p) => p.key),
);

export interface PermissionUserLike {
  isAdmin?: boolean;
  permissions?: PermissionKey[] | null;
}

/** Devuelve true si el usuario tiene el permiso. Admin o permissions=null => true. */
export function can(user: PermissionUserLike | null | undefined, key: PermissionKey): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (user.permissions == null) return true; // compatibilidad: sin restricciones
  return user.permissions.includes(key);
}

export function isValidPermission(k: string): k is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(k);
}

export const PAGE_PERMISSION_FOR_ID: Record<string, PermissionKey> = {
  dashboard: "page:dashboard",
  inventario: "page:inventario",
  kits: "page:kits",
  cotizaciones: "page:cotizaciones",
  "cotizaciones-proveedores": "page:cotizaciones-proveedores",
  clientes: "page:clientes",
  recordatorios: "page:recordatorios",
};
