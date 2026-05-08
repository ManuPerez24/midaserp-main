import { Link, useRouterState } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
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

const ADMIN_ONLY_IDS = new Set(["usuarios"]);

export function AppSidebar() {
  const branding = useSettings((s) => s.settings.branding);
  const logoDataUrl = useSettings((s) => s.settings.issuer.logoDataUrl);
  const menuGroups = useSettings((s) => s.settings.menuGroups) ?? defaultMenuGroups;
  const user = useAuth((s) => s.user);
  const isAdmin = !!user?.isAdmin;
  const pathname = useRouterState({ select: (r) => r.location.pathname });

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
        <div className="flex items-center gap-2 px-2 py-1.5">
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt={branding.siteName}
              className="h-12 w-12 object-contain group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-primary-foreground font-bold group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.siteName.charAt(0)}
            </div>
          )}
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">{branding.siteName}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              ERP Lite
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((it) => !it.hidden)
                  .filter((it) => canSeeItem(it.id))
                  .map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? ICON_MAP.Folder;
                  const url = ROUTE_FOR_ID[item.id];
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
