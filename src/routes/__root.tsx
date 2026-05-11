import { Outlet, createRootRoute, HeadContent, Scripts, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Cloud, Settings as SettingsIcon, Bell } from "lucide-react";
import { useEffect } from "react";
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
import { useQuotes } from "@/stores/quotes";
import { useInventory } from "@/stores/inventory";
import { useReminders } from "@/stores/reminders";
import { notify } from "@/stores/notifications";
import { GlobalChat } from "@/components/global-chat";



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
  head: () => {
    const siteName = useSettings.getState().settings.branding.siteName || "MIDAS ERP";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: siteName },
        { name: "description", content: `ERP ligero: cotizaciones, inventario, kits y clientes de ${siteName}.` },
        { property: "og:title", content: siteName },
        { name: "twitter:title", content: siteName },
        { property: "og:description", content: `ERP ligero: cotizaciones, inventario, kits y clientes de ${siteName}.` },
        { name: "twitter:description", content: `ERP ligero: cotizaciones, inventario, kits y clientes de ${siteName}.` },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "stylesheet", href: appCss }],
    };
  },
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

function ProactiveNotifications() {
  const quotes = useQuotes((s) => s.quotes);
  const reminders = useReminders((s) => s.reminders);
  const products = useInventory((s) => s.products);
  const settings = useSettings((s) => s.settings);

  useEffect(() => {
    const notified = new Set(JSON.parse(sessionStorage.getItem("notified") || "[]"));
    const now = Date.now();
    let changed = false;

    reminders.forEach((r) => {
      if (!r.done) {
        const due = new Date(r.dueDate).getTime();
        if (due < now && !notified.has("rem_overdue_" + r.id)) {
          notify("error", `Recordatorio vencido: ${r.note}`, "/recordatorios");
          notified.add("rem_overdue_" + r.id);
          changed = true;
        } else if (due - now > 0 && due - now < 86400000 * 2 && !notified.has("rem_soon_" + r.id)) {
          notify("warning", `Recordatorio próximo: ${r.note}`, "/recordatorios");
          notified.add("rem_soon_" + r.id);
          changed = true;
        }
      }
    });

    quotes.forEach((q) => {
      if ((q.status === "Pendiente" || q.status === "En Proceso") && q.validUntil) {
        const due = new Date(q.validUntil).getTime();
        if (due < now && !notified.has("q_exp_" + q.id)) {
          notify("error", `Cotización ${q.folio} vencida`, `/cotizaciones/${q.id}`);
          notified.add("q_exp_" + q.id);
          changed = true;
        } else if (due - now > 0 && due - now < 86400000 * 3 && !notified.has("q_soon_" + q.id)) {
          notify("warning", `Cotización ${q.folio} por vencer pronto`, `/cotizaciones/${q.id}`);
          notified.add("q_soon_" + q.id);
          changed = true;
        }
      }
    });

    if ((settings as any).inventory?.enableStock) {
      products.forEach((p) => {
        if (p.minStock !== undefined && (p.stock ?? 0) <= p.minStock && !notified.has("stock_low_" + p.id)) {
          notify("warning", `Stock bajo: ${p.name} (${p.stock}/${p.minStock})`, "/inventario");
          notified.add("stock_low_" + p.id);
          changed = true;
        }
      });
    }

    if (changed) sessionStorage.setItem("notified", JSON.stringify([...notified]));
  }, [quotes, reminders, products, settings]);

  return null;
}

function RootLayout() {
  const branding = useSettings((s) => s.settings.branding);
  const user = useAuth((s) => s.user);
  const isAdmin = !!user?.isAdmin;
  const showDeco = branding.showDecoBackground !== false;
  const pathname = useLocation({ select: (l) => l.pathname });

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
        <main className="relative flex-1 p-4 sm:p-6 overflow-x-hidden">
          <div key={pathname} className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
            <Outlet />
          </div>
          {showDeco ? <DecoBackground /> : null}
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
      <ProactiveNotifications />
      <GlobalChat />
    </div>
  );
}
