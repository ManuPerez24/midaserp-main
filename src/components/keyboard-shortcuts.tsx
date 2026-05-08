import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "?", desc: "Mostrar esta ayuda" },
  { keys: "/", desc: "Enfocar búsqueda" },
  { keys: "Ctrl/⌘ + K", desc: "Búsqueda global" },
  { keys: "g i", desc: "Ir a Inventario" },
  { keys: "g c", desc: "Ir a Cotizaciones" },
  { keys: "g k", desc: "Ir a Kits" },
  { keys: "g l", desc: "Ir a Clientes" },
  { keys: "g d", desc: "Ir al Dashboard" },
  { keys: "g r", desc: "Ir a Recordatorios" },
  { keys: "g s", desc: "Ir a Ajustes" },
  { keys: "n", desc: "Nuevo (en la página actual)" },
  { keys: "Esc", desc: "Cerrar diálogos" },
];

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let gPending = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const goto = (path: string) => navigate({ to: path });

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping()) return;

      // ? help
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // / focus search input (the search button in header opens dialog via Cmd+K, here we trigger that)
      if (e.key === "/") {
        e.preventDefault();
        // Synthesize Ctrl+K
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
        );
        return;
      }

      // n -> "new" - dispatch a custom event pages can listen to
      if (e.key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("app:new"));
        return;
      }

      // g + letter sequence
      if (gPending) {
        gPending = false;
        if (gTimer) clearTimeout(gTimer);
        const map: Record<string, string> = {
          i: "/inventario",
          c: "/cotizaciones",
          k: "/kits",
          l: "/clientes",
          d: "/",
          r: "/recordatorios",
          s: "/ajustes",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          goto(dest);
        }
        return;
      }
      if (e.key === "g") {
        gPending = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPending = false;
        }, 800);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [navigate]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" /> Atajos de teclado
          </DialogTitle>
          <DialogDescription>
            Funcionan en cualquier pantalla, salvo cuando estás escribiendo en un campo.
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y rounded-md border">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
