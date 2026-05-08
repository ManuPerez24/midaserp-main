import { LogOut, Users, KeyRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/util/auth.functions";
import { useAuth } from "@/stores/auth";
import { releaseAllMine } from "@/stores/locks";
import { toast } from "sonner";

export function UserMenu() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  if (!user) return null;
  async function handleLogout() {
    try {
      await releaseAllMine();
      await logout();
      setUser(null);
      window.location.href = "/login";
    } catch {
      toast.error("Error al cerrar sesión");
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent">
          <div className="hidden sm:flex flex-col items-end leading-tight pr-1">
            <span className="text-xs font-medium">{user.name || user.email}</span>
            {user.isAdmin && <span className="text-[10px] text-primary">Admin</span>}
          </div>
          {user.picture ? (
            <img src={user.picture} alt="" className="h-7 w-7 rounded-full border" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name || "Sin nombre"}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/usuarios" className="flex items-center">
            {user.isAdmin ? (
              <>
                <Users className="mr-2 h-4 w-4" /> Gestionar usuarios
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" /> Mi cuenta
              </>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
