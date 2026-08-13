"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxNotification,
} from "@/utils";

function formatWhen(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const previousUnread = useRef<number | null>(null);

  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await listNotifications({ limit: 25 });
      if (!response?.success) return;
      const rows = Array.isArray(response.data) ? response.data : [];
      const count = Number(response.unread_count || 0);
      setItems(rows);
      setUnread(count);

      if (
        previousUnread.current != null &&
        count > previousUnread.current
      ) {
        const newest = rows.find((row) => !row.is_read);
        toast({
          title: newest?.title || "New message",
          description: newest?.body || "You have a new notification.",
          variant: "success",
        });
      }
      previousUnread.current = count;
    } catch {
      // Keep last known inbox if the API is briefly unavailable.
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadInbox();
    const timer = window.setInterval(() => {
      void loadInbox(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

  useEffect(() => {
    if (open) void loadInbox(true);
  }, [open, loadInbox]);

  const handleOpenItem = async (item: InboxNotification) => {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, is_read: true } : row,
          ),
        );
        setUnread((count) => Math.max(0, count - 1));
        previousUnread.current = Math.max(0, (previousUnread.current || 1) - 1);
      } catch {
        // Still allow navigation if mark-read fails.
      }
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((row) => ({ ...row, is_read: true })));
      setUnread(0);
      previousUnread.current = 0;
    } catch {
      toast({
        title: "Could not update messages",
        variant: "destructive",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 text-slate-700 hover:bg-slate-100"
          aria-label={unread ? `${unread} unread messages` : "Messages"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Messages</p>
            <p className="text-xs text-slate-500">
              {unread ? `${unread} unread` : "You are up to date"}
            </p>
          </div>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleMarkAll}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="h-80">
          {loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Loading messages…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No messages yet. Scan alerts will appear here when you are logged in.
            </p>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleOpenItem(item)}
                  className={`w-full px-3 py-3 text-left hover:bg-slate-50 ${
                    item.is_read ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!item.is_read ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    ) : (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      {item.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {item.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatWhen(item.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
