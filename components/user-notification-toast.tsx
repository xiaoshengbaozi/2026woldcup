"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { userApi, type UserHomePayload } from "@/lib/user-system";

type NotificationItem = UserHomePayload["user"]["notifications"][number];

export function UserNotificationToast() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    userApi<UserHomePayload>("/api/me/home", { cache: "no-store" })
      .then((payload) => {
        if (!mounted) return;
        setNotifications(payload.user.notifications.filter((item) => !item.read && item.type === "match_reminder").slice(0, 3));
        setVisible(true);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const active = useMemo(() => notifications[0] ?? null, [notifications]);
  if (!active) return null;

  async function closeAll() {
    setVisible(false);
    const ids = notifications.map((item) => item.id);
    setNotifications([]);
    try {
      await userApi("/api/me/notifications/read", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
    } catch {
      // The next /api/me/home read will recover the unread state.
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className="fixed right-6 top-6 z-[260] hidden w-[360px] overflow-hidden rounded-[1.5rem] bg-ink-950/88 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,.46)] ring-1 ring-volt/20 backdrop-blur-2xl lg:block"
          >
            <NotificationContent item={active} count={notifications.length} onClose={closeAll} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[260] overflow-hidden rounded-[1.25rem] bg-ink-950/92 p-3 text-white shadow-[0_18px_56px_rgba(0,0,0,.44)] ring-1 ring-volt/20 backdrop-blur-2xl lg:hidden"
          >
            <NotificationContent item={active} count={notifications.length} onClose={closeAll} compact />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NotificationContent({ item, count, compact, onClose }: { item: NotificationItem; count: number; compact?: boolean; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-volt/12 text-volt ring-1 ring-volt/20">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-volt/80">
              {count > 1 ? `${count} 条比赛提醒` : "比赛提醒"}
            </p>
            <h3 className={`${compact ? "mt-0.5 text-sm" : "mt-1 text-base"} truncate font-black text-white`}>{item.title}</h3>
          </div>
          <button
            type="button"
            aria-label="关闭提醒"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/54 transition hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className={`${compact ? "mt-1 line-clamp-1 text-xs" : "mt-2 text-sm"} text-white/56`}>{item.body}</p>
      </div>
    </div>
  );
}
