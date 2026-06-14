"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { useUserSession } from "@/components/user-session-provider";
import { userApi, type UserSessionPayload } from "@/lib/user-system";

type NotificationItem = UserSessionPayload["user"]["notifications"][number];

export function UserNotificationToast() {
  const { home, refreshSession } = useUserSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNotifications(
      home?.user.notifications.filter((item) => !item.read && (item.type === "match_reminder" || item.type === "follow_update")).slice(0, 3) ?? []
    );
    setVisible(true);
  }, [home]);

  const active = useMemo(() => notifications[0] ?? null, [notifications]);
  if (!mounted || !active) return null;

  async function closeAll() {
    setVisible(false);
    const ids = notifications.map((item) => item.id);
    setNotifications([]);
    try {
      await userApi("/api/me/notifications/read", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      void refreshSession();
    } catch {
      // The next session read will recover the unread state.
    }
  }

  return createPortal(
    visible ? (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[1000] flex justify-center px-4">
          <div
            className="pointer-events-auto w-full max-w-[min(92vw,440px)] overflow-visible rounded-[1.75rem] bg-ink-950/92 p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,.58),0_0_44px_rgba(216,255,62,.14)] ring-1 ring-volt/25 backdrop-blur-2xl transition duration-200 ease-out sm:p-5"
          >
            <NotificationContent item={active} count={notifications.length} onClose={closeAll} />
          </div>
        </div>
      ) : null,
    document.body
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
          <div className="min-w-0 pr-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-volt/80">
              {count > 1 ? `${count} 条比赛提醒` : "比赛提醒"}
            </p>
            <h3 className={`${compact ? "mt-0.5 text-sm" : "mt-1 text-base"} break-words font-black leading-snug text-white`}>{item.title}</h3>
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
        <p className={`${compact ? "mt-1 text-xs" : "mt-2 text-sm"} whitespace-normal break-words leading-relaxed text-white/62`}>{item.body}</p>
      </div>
    </div>
  );
}
