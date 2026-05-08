import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions";

interface Props {
  /** null = sin restricción (acceso a todo) */
  value: PermissionKey[] | null;
  onChange: (next: PermissionKey[] | null) => void;
  disabled?: boolean;
}

export function PermissionsEditor({ value, onChange, disabled }: Props) {
  const unrestricted = value === null;
  const set = new Set(value ?? []);

  const toggle = (key: PermissionKey) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next) as PermissionKey[]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label className="text-sm">Sin restricciones</Label>
          <p className="text-xs text-muted-foreground">
            Si está activo, el usuario tiene acceso a todo (igual que antes).
          </p>
        </div>
        <Switch
          checked={unrestricted}
          disabled={disabled}
          onCheckedChange={(v) => onChange(v ? null : [])}
        />
      </div>

      {!unrestricted && (
        <>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange([...ALL_PERMISSION_KEYS])}
            >
              Seleccionar todo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange([])}
            >
              Quitar todo
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border p-3 space-y-4">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.id}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {group.permissions.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={set.has(p.key)}
                        disabled={disabled}
                        onCheckedChange={() => toggle(p.key)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
