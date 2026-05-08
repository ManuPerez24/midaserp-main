import { Link } from "@tanstack/react-router";
import { X, FileText, Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActiveTask } from "@/stores/active-task";
import { useQuotes } from "@/stores/quotes";
import { useKits } from "@/stores/kits";

export function ActiveTaskBadge() {
  const active = useActiveTask((s) => s.active);
  const clear = useActiveTask((s) => s.clear);
  const quotes = useQuotes((s) => s.quotes);
  const kits = useKits((s) => s.kits);

  if (!active) return null;

  if (active.kind === "quote") {
    const q = quotes.find((x) => x.id === active.id);
    if (!q) return null;
    return (
      <div className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <Link
          to="/cotizaciones/$id"
          params={{ id: q.id }}
          className="text-xs font-medium text-primary hover:underline"
        >
          Cargando: {q.folio}
        </Link>
        <Badge variant="secondary" className="ml-1 text-[10px]">
          activo
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={clear}
          title="Salir de modo edición"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  const k = kits.find((x) => x.id === active.id);
  if (!k) return null;
  return (
    <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1">
      <Boxes className="h-3.5 w-3.5 text-amber-700" />
      <span className="text-xs font-medium text-amber-800">Editando kit: {k.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={clear}
        title="Salir de modo edición"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
