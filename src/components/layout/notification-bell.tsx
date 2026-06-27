"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getHeaderNotifications, markNotificationRead } from "@/actions/notifications";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

type HeaderNotification = Prisma.NotificationGetPayload<{
  select: {
    id: true;
    type: true;
    title: true;
    body: true;
    read: true;
    createdAt: true;
    providerId: true;
    userId: true;
    provider: { select: { businessName: true } };
    user: { select: { name: true; email: true } };
  };
}>;

const POLL_MS = 30_000;

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await getHeaderNotifications();
      if (result.success && result.data) {
        setItems(result.data.items);
        setUnreadCount(result.data.unreadCount);
        setTotal(result.data.total);
      }
    });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const recipientLabel = (n: HeaderNotification) =>
    n.provider?.businessName ?? n.user?.name ?? n.user?.email ?? "System";

  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0 rounded-lg"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#22C55E] px-1 text-[10px] font-bold text-white ring-2 ring-background"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread · {total} total
            </p>
          </div>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <>
              {unread.length > 0 && (
                <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  New
                </p>
              )}
              {unread.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  recipientLabel={recipientLabel(n)}
                  onMarkRead={handleMarkRead}
                />
              ))}
              {read.length > 0 && unread.length > 0 && (
                <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Earlier
                </p>
              )}
              {read.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  recipientLabel={recipientLabel(n)}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="cursor-pointer rounded-none py-3">
          <Link
            href="/notifications"
            className="flex w-full items-center justify-center text-sm font-medium text-primary"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  notification: n,
  recipientLabel,
  onMarkRead,
}: {
  notification: HeaderNotification;
  recipientLabel: string;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/30 px-4 py-3 transition-colors last:border-0",
        !n.read && "bg-primary/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "font-medium text-muted-foreground")}>
            {n.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {recipientLabel} · {timeAgo(new Date(n.createdAt))}
          </p>
        </div>
        {!n.read && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-lg"
            aria-label="Mark as read"
            onClick={() => onMarkRead(n.id)}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
