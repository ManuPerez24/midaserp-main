import { Navigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth } from "@/stores/auth";
import { can, type PermissionKey } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface Props {
  /** Permiso requerido. Si no se pasa, sólo se valida adminOnly/sesión. */
  permission?: PermissionKey;
  /** Si es true, sólo administradores pueden ver. */
  adminOnly?: boolean;
  /** Si está, redirige a esta ruta cuando no hay permiso. */
  redirectTo?: string;
  children: ReactNode;
}

function NoAccess() {
  return (
    <div className="container mx-auto max-w-xl p-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Sin acceso
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No tienes permiso para acceder a esta sección. Contacta a un
          administrador si necesitas acceso.
        </CardContent>
      </Card>
    </div>
  );
}

export function PageGuard({ permission, adminOnly, children, redirectTo }: Props) {
  const user = useAuth((s) => s.user);
  const loaded = useAuth((s) => s.loaded);
  if (!loaded) return null;
  if (!user) {
    if (redirectTo) return <Navigate to={redirectTo} />;
    return <NoAccess />;
  }
  if (adminOnly && !user.isAdmin) {
    if (redirectTo) return <Navigate to={redirectTo} />;
    return <NoAccess />;
  }
  if (permission && !can(user, permission)) {
    if (redirectTo) return <Navigate to={redirectTo} />;
    return <NoAccess />;
  }
  return <>{children}</>;
}
