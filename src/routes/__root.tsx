import { Outlet, createRootRoute, HeadContent, Scripts, Link, useLocation } from "@tanstack/react-router";
import { Cloud, Settings as SettingsIcon } from "lucide-react";
import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ActiveTaskBadge } from "@/components/active-task-badge";
import { ThemeApplier } from "@/components/theme-applier";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsPopover } from "@/components/notifications-popover";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { DecoBackground } from "@/components/deco-background";
import { useSettings } from "@/stores/settings";
import { useAuth } from "@/stores/auth";
import { AuthGate } from "@/components/auth-gate";
import { UserMenu } from "@/components/user-menu";



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MIDAS ERP Lite" },
      { name: "description", content: "ERP ligero: cotizaciones, inventario, kits y clientes." },
      { property: "og:title", content: "MIDAS ERP Lite" },
      { name: "twitter:title", content: "MIDAS ERP Lite" },
      { property: "og:description", content: "ERP ligero: cotizaciones, inventario, kits y clientes." },
      { name: "twitter:description", content: "ERP ligero: cotizaciones, inventario, kits y clientes." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0e67375f-e630-4c83-9985-cb3c04bcafc0/id-preview-4c978d5f--27a74fb8-f89d-43d0-ac81-5ad8db188bee.lovable.app-1777764763264.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0e67375f-e630-4c83-9985-cb3c04bcafc0/id-preview-4c978d5f--27a74fb8-f89d-43d0-ac81-5ad8db188bee.lovable.app-1777764763264.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const isPublic = /\/publica$/.test(pathname);
  const isLogin = pathname === "/login";
  if (isPublic) {
    return (
      <>
        <ThemeApplier />
        <Outlet />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }
  if (isLogin) {
    return (
      <>
        <ThemeApplier />
        <Outlet />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }
  return (
    <AuthGate>
      <SidebarProvider>
        <ThemeApplier />
        <KeyboardShortcuts />
        <RootLayout />
      </SidebarProvider>
    </AuthGate>
  );
}

function RootLayout() {
  const branding = useSettings((s) => s.settings.branding);
  const user = useAuth((s) => s.user);
  const isAdmin = !!user?.isAdmin;
  const showDeco = branding.showDecoBackground !== false;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-5">
          <SidebarTrigger />
          <div className="flex-1" />
          <ActiveTaskBadge />
          <div className="hidden items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground sm:flex">
            <Cloud className="h-3.5 w-3.5 text-emerald-500" />
            Local Sync
          </div>
          <GlobalSearch />
          <NotificationsPopover />
          <ThemeToggle />
          {isAdmin && (
            <Button asChild variant="ghost" size="icon" title="Ajustes">
              <Link to="/ajustes">
                <SettingsIcon className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <UserMenu />
        </header>
        <main className="relative flex-1 p-4 sm:p-6">
          <div className="relative z-10">
            <Outlet />
          </div>
          {showDeco ? <DecoBackground /> : null}
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

