import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/util/auth.functions";
import { getPublicBranding } from "@/util/branding.functions";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";
import { Package, Boxes, Wrench, ClipboardList, Truck, Users, BarChart3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  loader: async () => await getPublicBranding(),
  component: LoginPage,
});

const FLOATING_ICONS = [
  { Icon: Package, x: 12, y: 18, depth: 30, size: 56, rotate: -8 },
  { Icon: Boxes, x: 78, y: 22, depth: 50, size: 72, rotate: 12 },
  { Icon: Wrench, x: 18, y: 72, depth: 40, size: 48, rotate: 18 },
  { Icon: ClipboardList, x: 82, y: 75, depth: 35, size: 60, rotate: -14 },
  { Icon: Truck, x: 8, y: 45, depth: 60, size: 64, rotate: 6 },
  { Icon: Users, x: 88, y: 50, depth: 55, size: 52, rotate: -10 },
  { Icon: BarChart3, x: 30, y: 12, depth: 25, size: 44, rotate: 22 },
  { Icon: Sparkles, x: 68, y: 88, depth: 45, size: 40, rotate: -20 },
];

function LoginPage() {
  const branding = Route.useLoaderData();
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Range -1 .. 1 from center
      setMouse({ x: (e.clientX / w) * 2 - 1, y: (e.clientY / h) * 2 - 1 });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await login({ data: { email: loginEmail, password: loginPassword } });
      setUser(result.user);
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted"
      style={{ perspective: "1200px" }}
    >
      {/* Animated gradient blobs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl"
        style={{ transform: `translate(${mouse.x * 30}px, ${mouse.y * 30}px)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-accent/30 blur-3xl"
        style={{ transform: `translate(${mouse.x * -40}px, ${mouse.y * -40}px)` }}
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 rounded-full bg-secondary/30 blur-3xl"
        style={{ transform: `translate(${mouse.x * 20}px, ${mouse.y * -20}px)` }}
      />

      {/* Grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: `translate(${mouse.x * 8}px, ${mouse.y * 8}px)`,
        }}
      />

      {/* Floating parallax icons */}
      {FLOATING_ICONS.map(({ Icon, x, y, depth, size, rotate }, i) => (
        <div
          key={i}
          className="pointer-events-none absolute text-primary/20"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0) rotate(${rotate + mouse.x * 6}deg)`,
            transition: "transform 120ms ease-out",
          }}
        >
          <Icon style={{ width: size, height: size }} strokeWidth={1.25} />
        </div>
      ))}

      {/* Floating part numbers from inventory */}
      {branding.partNumbers?.map((pn: string, i: number) => {
        // deterministic pseudo-random positions
        const seed = (i * 9301 + 49297) % 233280;
        const x = (seed % 100);
        const y = ((seed * 7) % 100);
        const depth = 20 + ((seed * 3) % 50);
        const rotate = ((seed * 11) % 30) - 15;
        const fontSize = 11 + ((seed * 13) % 8);
        return (
          <div
            key={`pn-${i}`}
            className="pointer-events-none absolute font-mono text-primary/25 whitespace-nowrap"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: `${fontSize}px`,
              transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0) rotate(${rotate + mouse.x * 4}deg)`,
              transition: "transform 140ms ease-out",
            }}
          >
            {pn}
          </div>
        );
      })}

      {/* Login card with subtle 3D tilt */}
      <div
        className="relative z-10 w-full max-w-md"
        style={{
          transform: `rotateY(${mouse.x * 4}deg) rotateX(${mouse.y * -4}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 200ms ease-out",
        }}
      >
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/10 p-8">
          <div className="text-center mb-6">
            {branding.logoDataUrl ? (
              <img
                src={branding.logoDataUrl}
                alt={branding.siteName}
                className="mx-auto mb-4 h-36 w-auto max-w-[260px] object-contain drop-shadow-xl"
              />
            ) : (
              <div className="inline-flex items-center justify-center mb-4">
                <Package className="w-24 h-24 text-primary drop-shadow-xl" strokeWidth={1.5} />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              {branding.siteName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {branding.siteTagline || "Inicia sesión para continuar"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="li-email">Email</Label>
              <Input
                id="li-email"
                type="email"
                required
                autoFocus
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="bg-background/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="li-pass">Contraseña</Label>
              <Input
                id="li-pass"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background/60"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={busy}
            >
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            <Link to="/" className="hover:underline">← Volver al inicio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
