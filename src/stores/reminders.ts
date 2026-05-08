import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";
import type { Reminder } from "@/lib/types";

interface RemindersState {
  reminders: Reminder[];
  add: (clientId: string, dueDate: string, note: string) => Reminder;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  forClient: (clientId: string) => Reminder[];
}

export const useReminders = create<RemindersState>((set, get) => ({
  reminders: [],
  add: (clientId, dueDate, note) => {
    const r: Reminder = {
      id: uuid(),
      clientId,
      dueDate,
      note,
      done: false,
      createdAt: new Date().toISOString(),
    };
    set({ reminders: [r, ...get().reminders] });
    return r;
  },
  toggle: (id) => set({ reminders: get().reminders.map((r) => (r.id === id ? { ...r, done: !r.done } : r)) }),
  remove: (id) => set({ reminders: get().reminders.filter((r) => r.id !== id) }),
  forClient: (clientId) => get().reminders.filter((r) => r.clientId === clientId),
}));

registerServerStore("midas:v1:reminders", useReminders, (state) => ({ reminders: state.reminders }));
