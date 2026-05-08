import {
  LayoutDashboard,
  Package,
  Boxes,
  FileText,
  Users,
  Settings,
  Folder,
  Star,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { MenuIconName } from "@/lib/types";

export const ICON_MAP: Record<MenuIconName, LucideIcon> = {
  LayoutDashboard,
  Package,
  Boxes,
  FileText,
  Users,
  Settings,
  Folder,
  Star,
  Tag,
  Wrench,
};

export const ICON_OPTIONS: MenuIconName[] = [
  "LayoutDashboard",
  "Package",
  "Boxes",
  "FileText",
  "Users",
  "Folder",
  "Star",
  "Tag",
  "Wrench",
  "Settings",
];

export const ROUTE_FOR_ID: Record<string, string> = {
  dashboard: "/",
  inventario: "/inventario",
  kits: "/kits",
  cotizaciones: "/cotizaciones",
  "cotizaciones-proveedores": "/cotizaciones-proveedores",
  clientes: "/clientes",
  recordatorios: "/recordatorios",
  usuarios: "/usuarios",
};
