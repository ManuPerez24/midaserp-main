import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  activeWorkspace: "erp" | "3d";
  setWorkspace: (ws: "erp" | "3d") => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({ activeWorkspace: "erp", setWorkspace: (ws) => set({ activeWorkspace: ws }) }),
    { name: "midas-workspace" }
  )
);