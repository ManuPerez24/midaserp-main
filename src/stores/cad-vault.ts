import { create } from "zustand";
import { registerServerStore } from "@/lib/server-store-sync";

export interface CadFileVersion {
  id: string;
  shortId?: string;
  version: number;
  description: string;
  url: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  folderId?: string;
  weight?: number;
  printTimeMinutes?: number;
  originalProjectId?: string;
}

export interface CadFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CadProject {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  versions: CadFileVersion[];
  folders?: CadFolder[];
}

interface CadVaultState {
  projects: CadProject[];
  addProject: (project: CadProject) => void;
  updateProject: (id: string, data: Partial<CadProject>) => void;
  removeProject: (id: string) => void;
  addVersion: (projectId: string, version: CadFileVersion) => void;
  updateVersion: (projectId: string, versionId: string, data: Partial<CadFileVersion>) => void;
  removeVersion: (projectId: string, versionId: string) => void;
  addFolder: (projectId: string, folder: CadFolder) => void;
  updateFolder: (projectId: string, folderId: string, data: Partial<CadFolder>) => void;
  removeFolder: (projectId: string, folderId: string) => void;
  moveItems: (projectId: string, fileIds: string[], targetFolderId?: string) => void;
  removeMultipleItems: (projectId: string, fileIds: string[], folderIds: string[]) => void;
}

export const useCadVault = create<CadVaultState>()((set) => ({
      projects: [] as CadProject[],
      addProject: (project) => set((state) => {
        return { projects: [project, ...state.projects] };
      }),
      updateProject: (id, data) => set((state) => {
        return { projects: state.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p) };
      }),
      removeProject: (id) => set((state) => {
        return { projects: state.projects.filter(p => p.id !== id) };
      }),
      addVersion: (projectId, version) => set((state) => {
        return {
          projects: state.projects.map(p => {
            if (p.id === projectId) {
              return { ...p, versions: [version, ...p.versions], updatedAt: new Date().toISOString() };
            }
            return p;
          })
        };
      }),
      updateVersion: (projectId, versionId, data) => set((state) => {
        return {
          projects: state.projects.map(p => {
            if (p.id === projectId) {
              return { 
                ...p, 
                versions: p.versions.map(v => v.id === versionId ? { ...v, ...data } : v),
                updatedAt: new Date().toISOString() 
              };
            }
            return p;
          })
        };
      }),
      removeVersion: (projectId, versionId) => set((state) => {
        return {
          projects: state.projects.map(p => {
            if (p.id === projectId) {
              return { ...p, versions: p.versions.filter(v => v.id !== versionId), updatedAt: new Date().toISOString() };
            }
            return p;
          })
        };
      }),
      addFolder: (projectId, folder) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, folders: [...(p.folders || []), folder], updatedAt: new Date().toISOString() } : p)
      })),
      updateFolder: (projectId, folderId, data) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, folders: (p.folders || []).map(f => f.id === folderId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f), updatedAt: new Date().toISOString() } : p)
      })),
      removeFolder: (projectId, folderId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, folders: (p.folders || []).filter(f => f.id !== folderId), updatedAt: new Date().toISOString() } : p)
      })),
      moveItems: (projectId, fileIds, targetFolderId) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? {
          ...p,
          versions: p.versions.map(v => fileIds.includes(v.id) ? { ...v, folderId: targetFolderId } : v),
          updatedAt: new Date().toISOString()
        } : p)
      })),
      removeMultipleItems: (projectId, fileIds, folderIds) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? {
          ...p,
          versions: p.versions.filter(v => !fileIds.includes(v.id)),
          folders: (p.folders || []).filter(f => !folderIds.includes(f.id)),
          updatedAt: new Date().toISOString()
        } : p)
      })),
}));

registerServerStore("midas:v1:cadVault", useCadVault, (state) => ({ projects: state.projects }), { shared: true });