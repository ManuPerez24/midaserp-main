import { useAuth } from "@/stores/auth";
import { can, type PermissionKey } from "@/lib/permissions";

export function useCan(key: PermissionKey): boolean {
  const user = useAuth((s) => s.user);
  return can(user, key);
}

export function useUserPermissions() {
  const user = useAuth((s) => s.user);
  return {
    user,
    can: (key: PermissionKey) => can(user, key),
    isAdmin: !!user?.isAdmin,
  };
}
