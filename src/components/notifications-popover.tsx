import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications, type NotificationKind } from "@/stores/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const COLORS: Record<NotificationKind, string> = {
  info: "text-sky-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-rose-500",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function NotificationsPopover() {
  const items = useNotifications((s) => s.items);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const markRead = useNotifications((s) => s.markRead);
  const clear = useNotifications((s) => s.clear);
  const [open, setOpen] = useState(false);

  const unread = items.filter((i) => !i.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notificaciones">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificaciones</p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Marcar todas como leídas"
              onClick={markAllRead}
              disabled={unread === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Borrar todas"
              onClick={clear}
              disabled={items.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Sin notificaciones.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = ICONS[n.kind];
                const content = (
                  <div className="flex items-start gap-2.5">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", COLORS[n.kind])} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          !n.read && "font-medium",
                        )}
                      >
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {timeAgo(n.at)}
                      </p>
                    </div>
                    {!n.read && (
                      <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px]">
                        nuevo
                      </Badge>
                    )}
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "px-3 py-2.5 transition-colors hover:bg-muted/50",
                      !n.read && "bg-muted/30",
                    )}
                    onClick={() => markRead(n.id)}
                  >
                    {n.link ? (
                      <Link to={n.link} onClick={() => setOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
