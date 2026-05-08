import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Shield, KeyRound, UserPlus, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/stores/auth";
import {
  listUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  changeMyPassword,
} from "@/util/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PermissionsEditor } from "@/components/permissions-editor";
import { PageGuard } from "@/components/page-guard";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios · MIDAS ERP" }] }),
  component: () => (
    <PageGuard adminOnly>
      <UsersPage />
    </PageGuard>
  ),
});

interface UserRow {
  userId: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  permissions: PermissionKey[] | null;
  createdAt: string | null;
}

function UsersPage() {
  const navigate = useNavigate();
  const { user, loaded } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (loaded && !user) navigate({ to: "/login" });
  }, [loaded, user, navigate]);

  const reload = async () => {
    if (!user?.isAdmin) return;
    setLoading(true);
    try {
      const data = await listUsers();
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) reload();
  }, [user?.isAdmin]);

  if (!loaded || !user) return null;

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "email",
      header: "Email",
      sortable: true,
      accessor: (r) => r.email,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.email}</span>
          {r.name && <span className="text-xs text-muted-foreground">{r.name}</span>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      sortable: true,
      accessor: (r) => (r.isAdmin ? "Admin" : "Usuario"),
      cell: (r) =>
        r.isAdmin ? (
          <Badge className="gap-1">
            <Shield className="h-3 w-3" /> Admin
          </Badge>
        ) : (
          <Badge variant="secondary">Usuario</Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Creado",
      sortable: true,
      accessor: (r) => r.createdAt ?? "",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32 text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Editar"
            onClick={() => setEditTarget(r)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Eliminar"
            onClick={() => setDeleteTarget(r)}
            disabled={r.userId === user.userId}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {user.isAdmin
              ? "Administra cuentas, roles y contraseñas."
              : "Gestiona tu cuenta y contraseña."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPwOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" /> Cambiar mi contraseña
          </Button>
          {user.isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo usuario
            </Button>
          )}
        </div>
      </div>

      {user.isAdmin ? (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.userId}
          searchAccessor={(r) => `${r.email} ${r.name ?? ""}`}
          searchPlaceholder="Buscar por email o nombre..."
          emptyState={
            <span className="text-sm text-muted-foreground">
              {loading ? "Cargando..." : "Sin usuarios"}
            </span>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Tu cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{user.email}</span>
            </div>
            {user.name && (
              <div>
                <span className="text-muted-foreground">Nombre:</span>{" "}
                <span className="font-medium">{user.name}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Rol:</span>{" "}
              <Badge variant="secondary">Usuario</Badge>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              Solo un administrador puede crear nuevos usuarios o cambiar roles.
            </p>
          </CardContent>
        </Card>
      )}

      {user.isAdmin && (
        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={reload}
        />
      )}
      {user.isAdmin && editTarget && (
        <EditUserDialog
          target={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          onSaved={reload}
        />
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar definitivamente a <b>{deleteTarget?.email}</b>? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await adminDeleteUser({ data: { userId: deleteTarget.userId } });
                  toast.success("Usuario eliminado");
                  setDeleteTarget(null);
                  reload();
                } catch (e: any) {
                  toast.error(e?.message || "No se pudo eliminar");
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<PermissionKey[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setName("");
      setPassword("");
      setIsAdmin(false);
      setPermissions(null);
    }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await adminCreateUser({
        data: {
          email,
          password,
          name: name || undefined,
          isAdmin,
          permissions: isAdmin ? undefined : permissions ?? undefined,
        },
      });
      toast.success("Usuario creado");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>Crea una cuenta nueva.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
            />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña *</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
            <span>Es administrador</span>
          </label>
          {!isAdmin && (
            <>
              <Separator />
              <div>
                <Label className="text-sm">Permisos</Label>
                <div className="mt-2">
                  <PermissionsEditor value={permissions} onChange={setPermissions} />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !email || password.length < 4}
          >
            <Plus className="mr-2 h-4 w-4" /> Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: UserRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(target.email);
  const [name, setName] = useState(target.name ?? "");
  const [isAdmin, setIsAdmin] = useState(target.isAdmin);
  const [permissions, setPermissions] = useState<PermissionKey[] | null>(target.permissions);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(target.email);
    setName(target.name ?? "");
    setIsAdmin(target.isAdmin);
    setPermissions(target.permissions);
    setNewPassword("");
  }, [target]);

  const submit = async () => {
    setBusy(true);
    try {
      await adminUpdateUser({
        data: {
          userId: target.userId,
          email,
          name: name || null,
          isAdmin,
          permissions: isAdmin ? null : permissions,
          newPassword: newPassword || undefined,
        },
      });
      toast.success("Usuario actualizado");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Restablecer contraseña (opcional)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Dejar vacío para no cambiar"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
            <span>Es administrador</span>
          </label>
          {!isAdmin && (
            <>
              <Separator />
              <div>
                <Label className="text-sm">Permisos</Label>
                <div className="mt-2">
                  <PermissionsEditor value={permissions} onChange={setPermissions} />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !email}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [open]);

  const submit = async () => {
    if (next !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (next.length < 4) {
      toast.error("Mínimo 4 caracteres");
      return;
    }
    setBusy(true);
    try {
      await changeMyPassword({
        data: { currentPassword: current, newPassword: next },
      });
      toast.success("Contraseña actualizada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cambiar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar mi contraseña</DialogTitle>
          <DialogDescription>
            Necesitas confirmar tu contraseña actual.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Contraseña actual</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <Label>Nueva contraseña</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div>
            <Label>Confirmar nueva contraseña</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !current || !next}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
