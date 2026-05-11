import { create } from "zustand";
import { registerServerStore } from "@/lib/server-store-sync";

export type ProjectStatus =
  | "Levantamiento"
  | "Cotizando"
  | "Aprobado"
  | "En Progreso"
  | "Completado"
  | "Cancelado";

export type ProjectType = "Maquinado" | "Mantenimiento" | "Automatización" | "Consultoría" | "Otro";

export interface ProjectTask {
  id: string;
  title: string;
  assignedTo: string;
  status: "Pendiente" | "En Progreso" | "Bloqueado" | "Completado";
  startDate: string;
  endDate: string;
  dependencies: string[];
}

export interface MaterialConsumption {
  id: string;
  productId: string;
  quantity: number;
  consumedAt: string;
  consumedBy: string;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt?: string;
  size?: number;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  type: ProjectType;
  status: ProjectStatus;

  // Levantamiento
  location?: string;
  requirements: string;
  attachments: (ProjectAttachment | string)[];

  // Conexiones
  quoteIds: string[];

  // Ejecución
  tasks: ProjectTask[];
  consumedMaterials: MaterialConsumption[];

  createdAt: string;
  updatedAt: string;
}

interface ProjectsState {
  projects: Project[];
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

export const useProjects = create<ProjectsState>()(
  (set) => ({
    projects: [],
    addProject: (project) =>
      set((state) => ({ projects: [...state.projects, project] })),
    updateProject: (id, projectUpdates) =>
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id
            ? { ...p, ...projectUpdates, updatedAt: new Date().toISOString() }
            : p
        ),
      })),
    deleteProject: (id) =>
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
      })),
  })
);

registerServerStore("midas:v1:projects", useProjects, (state) => ({ projects: state.projects }), { shared: true });