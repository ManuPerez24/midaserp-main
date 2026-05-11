import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { registerServerStore } from "@/lib/server-store-sync";

export type NotificationKind = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  at: string;
  kind: NotificationKind;
  message: string;
  link?: string;
  read: boolean;
}

const MAX_ENTRIES = 50;

interface NotificationsState {
  items: AppNotification[];
  push: (kind: NotificationKind, message: string, link?: string) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
  remove: (id: string) => void;
  unreadCount: () => number;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  items: [],
  push: (kind, message, link) => {
    const item: AppNotification = {
      id: uuid(),
      at: new Date().toISOString(),
      kind,
      message,
      link,
      read: false,
    };
    const items = [item, ...get().items].slice(0, MAX_ENTRIES);
    set({ items });
  },
  markAllRead: () => set({ items: get().items.map((i) => ({ ...i, read: true })) }),
  markRead: (id) => set({ items: get().items.map((i) => (i.id === id ? { ...i, read: true } : i)) }),
  clear: () => set({ items: [] }),
  remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
  unreadCount: () => get().items.filter((i) => !i.read).length,
}));

registerServerStore("midas:v1:notifications", useNotifications, (state) => ({ items: state.items }), { shared: true });

export function notify(kind: NotificationKind, message: string, link?: string) {
  useNotifications.getState().push(kind, message, link);
  // Fire-and-forget email broadcast
  if (typeof window !== "undefined") {
    import("@/util/notifications.functions")
      .then(({ sendNotificationEmail }) =>
        sendNotificationEmail({ data: { kind, message, link } }),
      )
      .catch(() => {});
  }
}
