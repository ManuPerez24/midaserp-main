import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { HelpCircle, ChevronDown, Factory, Briefcase, Printer, ListChecks, BarChartHorizontal, Box, Award, Folder } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSettings, defaultMenuGroups } from "@/stores/settings";
import { useAuth } from "@/stores/auth";
import { ICON_MAP, ROUTE_FOR_ID } from "@/lib/menu-icons";
import { can, PAGE_PERMISSION_FOR_ID } from "@/lib/permissions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/stores/workspace";

const ADMIN_ONLY_IDS = new Set(["usuarios"]);

const EXTRA_ICONS: Record<string, any> = {
  Printer,
  ListChecks,
  BarChartHorizontal,
  Box,
  Award,
  Folder
};

const getIconColor = (id: string) => {
  switch (id) {
    case 'impresion-3d': return 'text-orange-500';
    case 'ordenes-3d': return 'text-amber-500';
    case 'estadisticas-3d': return 'text-blue-500';
    case 'boveda-3d': return 'text-indigo-500';
    case 'logros-3d': return 'text-violet-500';
    default: return '';
  }
};

export function AppSidebar() {
  const branding = useSettings((s) => s.settings.branding);
  const logoDataUrl = useSettings((s) => s.settings.issuer.logoDataUrl);
  const storedMenuGroups = useSettings((s) => s.settings.menuGroups) ?? defaultMenuGroups;
  const user = useAuth((s) => s.user);
  const isAdmin = !!user?.isAdmin;
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  
  const workspace = useWorkspace((s) => s.activeWorkspace);
  const setWorkspace = useWorkspace((s) => s.setWorkspace);

  const menuGroups = useMemo(() => {
    const missingGroups = defaultMenuGroups.filter(dg => !storedMenuGroups.some(g => g.id === dg.id));
    return [...storedMenuGroups, ...missingGroups];
  }, [storedMenuGroups]);

  const erpGroups = menuGroups.filter(g => g.id !== "fabrica-3d");
  const farmGroups = menuGroups.filter(g => g.id === "fabrica-3d");

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  const canSeeItem = (id: string) => {
    if (ADMIN_ONLY_IDS.has(id)) return isAdmin;
    const pageKey = PAGE_PERMISSION_FOR_ID[id];
    if (!pageKey) return true;
    return can(user, pageKey);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-muted/50 rounded-md transition-colors w-full group/switcher">
              {logoDataUrl ? (
                <img
                  src={logoDataUrl}
                  alt={branding.siteName}
                  className="h-12 w-12 object-contain group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-primary-foreground font-bold group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 shrink-0 shadow-sm"
                  style={{ backgroundColor: workspace === "erp" ? branding.primaryColor : "#f97316" }}
                >
                  {workspace === "erp" ? branding.siteName.charAt(0) : "3D"}
                </div>
              )}
              <div className="flex flex-col leading-tight flex-1 group-data-[collapsible=icon]:hidden min-w-0">
                <span className="text-sm font-semibold truncate">{branding.siteName}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  {workspace === "erp" ? <Briefcase className="h-3 w-3 text-primary" /> : <Factory className="h-3 w-3 text-orange-500" />}
                  <span className={workspace === "erp" ? "text-primary" : "text-orange-500"}>
                    {workspace === "erp" ? "Midas ERP" : "Midas 3D"}
                  </span>
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden group-hover/switcher:text-foreground transition-colors" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Espacios de Trabajo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setWorkspace("erp")} className="flex items-center gap-3 cursor-pointer py-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Midas ERP</span>
                <span className="text-[10px] text-muted-foreground">Ventas, Inventario y Proyectos</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setWorkspace("3d")} className="flex items-center gap-3 cursor-pointer py-2">
              <Factory className="h-4 w-4 text-orange-500" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Midas 3D</span>
                <span className="text-[10px] text-muted-foreground">Granja y Control de Producción</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        {workspace === "erp" ? (
          <>
          {erpGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((it) => !it.hidden)
                  .filter((it) => canSeeItem(it.id))
                  .map((item) => {
                  const Icon = ICON_MAP?.[item.icon] ?? EXTRA_ICONS[item.icon] ?? Folder;
                  const url = ROUTE_FOR_ID?.[item.id] ?? `/${item.id}`;
                  if (!url) return null;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(url)}
                        tooltip={item.label}
                      >
                        <Link to={url} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
          </>
        ) : (
          <>
          {farmGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((it) => !it.hidden)
                  .filter((it) => canSeeItem(it.id))
                  .map((item) => {
                  const Icon = ICON_MAP?.[item.icon] ?? EXTRA_ICONS[item.icon] ?? Folder;
                  const url = ROUTE_FOR_ID?.[item.id] ?? `/${item.id}`;
                  if (!url) return null;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(url)}
                        tooltip={item.label}
                      >
                        <Link to={url as any} className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${getIconColor(item.id)}`} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
          </>
        )}
        
        <SidebarGroup>
          <SidebarGroupLabel>Soporte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/ayuda")} tooltip="Ayuda">
                  <Link to="/ayuda" className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Ayuda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
