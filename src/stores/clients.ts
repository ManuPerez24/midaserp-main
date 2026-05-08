import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { Client } from "@/lib/types";

interface ClientsState {
  clients: Client[];
  add: (c: Omit<Client, "id" | "createdAt">) => Client;
  update: (id: string, patch: Partial<Client>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
}

export const useClients = create<ClientsState>((set, get) => ({
  clients: [],
  add: (c) => {
    const client: Client = { ...c, id: uuid(), createdAt: new Date().toISOString() };
    set({ clients: [client, ...get().clients] });
    return client;
  },
  update: (id, patch) =>
    set({ clients: get().clients.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
  remove: (id) => set({ clients: get().clients.filter((x) => x.id !== id) }),
  removeMany: (ids) => {
    const s = new Set(ids);
    set({ clients: get().clients.filter((x) => !s.has(x.id)) });
  },
}));

registerServerStore("midas:v1:clients", useClients, (state) => ({ clients: state.clients }));
