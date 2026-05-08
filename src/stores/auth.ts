import { create } from "zustand";
import { me } from "@/util/auth.functions";
import type { PermissionKey } from "@/lib/permissions";

export interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  picture: string | null;
  isAdmin: boolean;
  permissions: PermissionKey[] | null;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  loaded: boolean;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  loaded: false,
  setUser: (u) => set({ user: u, loaded: true }),
  refresh: async () => {
    set({ loading: true });
    try {
      const u = await me();
      set({ user: u as AuthUser | null, loading: false, loaded: true });
    } catch {
      set({ user: null, loading: false, loaded: true });
    }
  },
}));
