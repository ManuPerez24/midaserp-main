import { useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Cloud, Loader2, Cpu, Zap, Gauge, Plug, Cable, Factory, Server, Power } from "lucide-react";
import { useAuthBootstrap } from "@/lib/use-auth-bootstrap";
import { startLocksPolling, stopLocksPolling } from "@/stores/locks";
import { useSettings } from "@/stores/settings";
import { useInventory } from "@/stores/inventory";
import { Progress } from "@/components/ui/progress";

const FLOATING_ICONS = [
  { Icon: Cpu, x: 12, y: 18, depth: 30, size: 56, rotate: -8 },
  { Icon: Gauge, x: 78, y: 22, depth: 50, size: 72, rotate: 12 },
  { Icon: Cable, x: 18, y: 72, depth: 40, size: 48, rotate: 18 },
  { Icon: Plug, x: 82, y: 75, depth: 35, size: 60, rotate: -14 },
  { Icon: Zap, x: 8, y: 45, depth: 60, size: 64, rotate: 6 },
  { Icon: Factory, x: 88, y: 50, depth: 55, size: 52, rotate: -10 },
  { Icon: Server, x: 30, y: 12, depth: 25, size: 44, rotate: 22 },
  { Icon: Power, x: 68, y: 88, depth: 45, size: 40, rotate: -20 },
];

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
  const products = useInventory((s) => s.products);
  const pct =
    typeof current === "number" && typeof total === "number" && total > 0
      ? Math.min(100, Math.round((current / total) * 100))
      : null;

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setMouse({ x: (e.clientX / w) * 2 - 1, y: (e.clientY / h) * 2 - 1 });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const pns = products.map((p) => p.partNumber || p.sku).filter(Boolean).slice(0, 15);
  const partNumbers = pns.length > 0 ? pns : ["SKU-100", "CAB-HDMI", "SEN-M8", "PLC-S7", "PWR-24V"];

  return (
    <div ref={wrapRef} className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted" style={{ perspective: "1200px" }}>
      <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" style={{ transform: `translate(${mouse.x * 30}px, ${mouse.y * 30}px)` }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-accent/20 blur-3xl" style={{ transform: `translate(${mouse.x * -40}px, ${mouse.y * -40}px)` }} />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" style={{ transform: `translate(${mouse.x * 20}px, ${mouse.y * -20}px)` }} />

      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)", backgroundSize: "48px 48px", transform: `translate(${mouse.x * 8}px, ${mouse.y * 8}px)` }} />

      {FLOATING_ICONS.map(({ Icon, x, y, depth, size, rotate }, i) => (
        <div key={i} className="pointer-events-none absolute text-primary/10" style={{ left: `${x}%`, top: `${y}%`, transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0) rotate(${rotate + mouse.x * 6}deg)`, transition: "transform 120ms ease-out" }}>
          <Icon style={{ width: size, height: size }} strokeWidth={1.25} />
        </div>
      ))}

      {partNumbers.map((pn: string, i: number) => {
        const seed = (i * 9301 + 49297) % 233280;
        const x = (seed % 100);
        const y = ((seed * 7) % 100);
        const depth = 20 + ((seed * 3) % 50);
        const rotate = ((seed * 11) % 30) - 15;
        const fontSize = 11 + ((seed * 13) % 8);
        return (
          <div key={`pn-${i}`} className="pointer-events-none absolute font-mono text-primary/20 whitespace-nowrap" style={{ left: `${x}%`, top: `${y}%`, fontSize: `${fontSize}px`, transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0) rotate(${rotate + mouse.x * 4}deg)`, transition: "transform 140ms ease-out" }}>
            {pn}
          </div>
        );
      })}

      <div className="relative z-10 w-full max-w-md" style={{ transform: `rotateY(${mouse.x * 4}deg) rotateX(${mouse.y * -4}deg)`, transformStyle: "preserve-3d", transition: "transform 200ms ease-out" }}>
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/10 p-8">
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
