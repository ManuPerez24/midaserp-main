import { useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { useAuthBootstrap } from "@/lib/use-auth-bootstrap";
import { startLocksPolling, stopLocksPolling } from "@/stores/locks";
import { useSettings } from "@/stores/settings";
import { Progress } from "@/components/ui/progress";

function formatEta(ms: number | null): string {
  if (ms == null) return "calculando…";
  if (ms < 1000) return "menos de 1 s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `~${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `~${m} min ${r} s`;
}

function LoadingScreen({
  title,
  step,
  current,
  total,
  elapsedMs,
  etaMs,
}: {
  title: string;
  step?: string;
  current?: number;
  total?: number;
  elapsedMs?: number;
  etaMs?: number | null;
}) {
  const logoDataUrl = useSettings((s) => s.settings.issuer.logoDataUrl);
  const pct =
    typeof current === "number" && typeof total === "number" && total > 0
      ? Math.min(100, Math.round((current / total) * 100))
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt="Logo"
              className="h-14 w-auto object-contain mb-4"
            />
          ) : (
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Cloud className="h-7 w-7 text-primary" />
            </div>
          )}
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          {step ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {step}
            </p>
          ) : null}
        </div>

        {pct !== null ? (
          <div className="mt-5 space-y-2">
            <Progress value={pct} />
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>
                {current}/{total} · {pct}%
              </span>
              <span>
                {typeof elapsedMs === "number"
                  ? `${(elapsedMs / 1000).toFixed(1)} s`
                  : ""}
                {typeof etaMs !== "undefined"
                  ? ` · queda ${formatEta(etaMs ?? null)}`
                  : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loaded, hydrated, progress } = useAuthBootstrap();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });

  const isPublicRoute = pathname === "/login" || /\/publica$/.test(pathname);

  useEffect(() => {
    if (loaded && !user && !isPublicRoute) {
      navigate({ to: "/login" });
    }
  }, [loaded, user, isPublicRoute, navigate]);

  useEffect(() => {
    if (user) {
      startLocksPolling();
      return () => stopLocksPolling();
    }
  }, [user]);

  if (isPublicRoute) return <>{children}</>;

  if (!loaded) {
    return <LoadingScreen title="Iniciando sesión" step="Verificando credenciales…" />;
  }

  if (user && !hydrated) {
    return (
      <LoadingScreen
        title="Sincronizando tu información"
        step={progress?.step ?? "Preparando datos…"}
        current={progress?.current}
        total={progress?.total}
        elapsedMs={progress?.elapsedMs}
        etaMs={progress?.etaMs}
      />
    );
  }

  if (!user) {
    return <LoadingScreen title="Redirigiendo…" step="Llevándote al inicio de sesión" />;
  }

  return <>{children}</>;
}
