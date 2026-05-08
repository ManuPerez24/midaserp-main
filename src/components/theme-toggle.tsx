import { Sun, Moon, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/stores/settings";
import type { ThemeMode } from "@/lib/types";

export function ThemeToggle() {
  const theme = useSettings((s) => s.settings.branding.theme ?? "sistema");
  const updateBranding = useSettings((s) => s.updateBranding);

  const setTheme = (t: ThemeMode) => updateBranding({ theme: t });

  const Icon = theme === "oscuro" ? Moon : theme === "claro" ? Sun : Laptop;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Tema">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("claro")}>
          <Sun className="mr-2 h-4 w-4" />
          Claro
          {theme === "claro" && <span className="ml-auto text-xs">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("oscuro")}>
          <Moon className="mr-2 h-4 w-4" />
          Oscuro
          {theme === "oscuro" && <span className="ml-auto text-xs">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("sistema")}>
          <Laptop className="mr-2 h-4 w-4" />
          Sistema
          {theme === "sistema" && <span className="ml-auto text-xs">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
