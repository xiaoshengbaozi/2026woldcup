"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, TouchEvent, UIEvent } from "react";
import { Bell, Bookmark, CalendarDays, ChevronRight, Flag, LogIn, LogOut, Settings, Star, UserPlus, UserRound, UsersRound, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserHomePayload } from "@/lib/user-system";

type MobileMeDrawerProps = {
  open: boolean;
  home: UserHomePayload | null;
  loading?: boolean;
  avatarUrl?: string | null;
  onLogin: () => void;
  onRegister: () => void;
  onOpenAvatarSettings: () => void;
  onLogout: () => void;
  onClose: () => void;
};

const emptySummary = {
  followedPlayerCount: 0,
  followedTeamCount: 0,
  favoriteMatchCount: 0,
};

export function MobileMeDrawer({ open, home, loading, avatarUrl, onLogin, onRegister, onOpenAvatarSettings, onLogout, onClose }: MobileMeDrawerProps) {
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const [followOpen, setFollowOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const summary = home?.summary ?? emptySummary;
  const unreadCount = home?.summary.unreadNotificationCount ?? 0;
  const displayName = home?.user.profile.displayName ?? "赛博世界波";
  const signedIn = Boolean(home);

  useEffect(() => {
    if (!open) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    const preventScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && asideRef.current?.contains(target)) return;
      event.preventDefault();
    };

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true });
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true });

    return () => {
      window.removeEventListener("wheel", preventScroll, { capture: true });
      window.removeEventListener("touchmove", preventScroll, { capture: true });
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFollowOpen(true);
      setSettingsOpen(true);
    }
  }, [open]);

  const stopBackgroundScroll = (event: UIEvent | TouchEvent) => {
    event.preventDefault();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="关闭个人菜单"
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onWheel={stopBackgroundScroll}
            onTouchMove={stopBackgroundScroll}
          />
          <motion.aside
            ref={asideRef}
            role="dialog"
            aria-modal="true"
            aria-label="个人中心"
            className="fixed left-0 top-0 z-[90] flex h-[100dvh] w-[66.666vw] min-w-[250px] max-w-[340px] flex-col overflow-hidden bg-ink-950/88 px-5 pb-5 pt-[calc(1rem+env(safe-area-inset-top))] shadow-[26px_0_90px_rgba(0,0,0,.62)] backdrop-blur-3xl lg:hidden"
            initial={{ x: "-104%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-104%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 28, stiffness: 270 }}
          >
            <div className="pointer-events-none absolute -left-20 top-16 h-44 w-44 rounded-full bg-volt/12 blur-[70px]" />
            <div className="pointer-events-none absolute bottom-16 right-0 h-40 w-24 rounded-full bg-flare/10 blur-[56px]" />

            <div className="relative flex items-center justify-between">
              <Link
                href="/me"
                onClick={(event) => {
                  if (!signedIn) {
                    event.preventDefault();
                    onClose();
                    onLogin();
                    return;
                  }
                  onClose();
                }}
                className="flex min-w-0 items-center gap-3 rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-volt/60"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
                  {signedIn && avatarUrl ? (
                    <Image src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
                  ) : (
                    <UserRound className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-volt" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/90">{displayName}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
                    {signedIn ? "已同步" : loading ? "同步中" : "未登录"}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label="关闭"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center text-white/58 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <section className="relative mt-5 border-y border-white/[0.08] py-4">
              <h2 className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-volt/80">
                赛波 CYBERBALL | 足球 × AI × 数据
              </h2>
              {!signedIn && !loading && (
                <div className="mt-4 grid grid-cols-2 divide-x divide-black/20 overflow-hidden rounded-full border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogin();
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 bg-volt text-xs font-bold text-black shadow-[0_0_28px_rgba(216,255,62,.18)]"
                  >
                    <LogIn className="h-4 w-4" />
                    登录
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRegister();
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 text-xs font-semibold text-white/80"
                  >
                    <UserPlus className="h-4 w-4" />
                    注册
                  </button>
                </div>
              )}
            </section>

            <nav className="relative grid divide-y divide-white/[0.08] border-b border-white/[0.08]">
              <div>
                <button type="button" onClick={() => setFollowOpen((value) => !value)} className="flex h-[3.25rem] w-full items-center justify-between px-1 text-left text-sm font-semibold text-white/62 transition hover:text-white">
                  <span className="flex items-center gap-3">
                    <Star className="h-4 w-4" />
                    我的关注
                  </span>
                  <ChevronRight className={`h-4 w-4 text-white/34 transition ${followOpen ? "rotate-90 text-volt" : ""}`} />
                </button>
                {followOpen ? (
                  <div className="grid border-t border-white/[0.07] py-1">
                    <FollowSubMetric href="/players" icon={<UsersRound className="h-3.5 w-3.5" />} label="关注球员" value={summary.followedPlayerCount} onClose={onClose} />
                    <FollowSubMetric href="/teams" icon={<Flag className="h-3.5 w-3.5" />} label="关注球队" value={summary.followedTeamCount} onClose={onClose} />
                    <FollowSubMetric icon={<Bookmark className="h-3.5 w-3.5" />} label="收藏比赛" value={summary.favoriteMatchCount} />
                  </div>
                ) : null}
              </div>
              <DrawerLink
                href="/matches?layout=calendar"
                active={pathname.startsWith("/matches")}
                icon={<CalendarDays className="h-4 w-4" />}
                label="比赛日历"
                onClose={onClose}
              />
              <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="flex h-[3.25rem] items-center justify-between px-1 text-left text-white/62 transition hover:text-white">
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <Settings className="h-4 w-4" />
                  设置
                </span>
                <ChevronRight className={`h-4 w-4 text-white/34 transition ${settingsOpen ? "rotate-90 text-volt" : ""}`} />
              </button>
              {settingsOpen ? (
                <div className="grid border-t border-white/[0.07] py-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!signedIn) {
                        onClose();
                        onLogin();
                        return;
                      }
                      onClose();
                      onOpenAvatarSettings();
                    }}
                    className="flex h-10 items-center justify-between px-1 pl-7 text-left text-xs font-semibold text-white/58 transition hover:text-volt"
                  >
                    <span className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5" />
                      修改头像
                    </span>
                  </button>
                  {signedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLogout();
                      }}
                      className="flex h-10 items-center justify-between px-1 pl-7 text-left text-xs font-semibold text-white/58 transition hover:text-volt"
                    >
                      <span className="flex items-center gap-2">
                        <LogOut className="h-3.5 w-3.5" />
                        退出登录
                      </span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </nav>

            <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.08] pt-4">
              <ThemeToggle />
              <Link
                href="/me"
                onClick={onClose}
                aria-label="通知"
                className="relative grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/62 ring-1 ring-white/[0.08] transition hover:bg-white/[0.1] hover:text-white"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-flare px-1 text-[10px] font-black text-black ring-2 ring-ink-950">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function FollowSubMetric({ href, icon, label, value, onClose }: { href?: string; icon: ReactNode; label: string; value: number; onClose?: () => void }) {
  const content = (
    <>
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <div className="text-xl font-semibold leading-none text-white/86" style={{ fontFamily: "ScreenMatrix, monospace" }}>
        {value}
      </div>
    </>
  );

  const className = "flex h-10 items-center justify-between px-1 pl-7 text-left text-xs font-semibold text-white/58 transition hover:text-volt";

  return href ? (
    <Link href={href} onClick={onClose} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function DrawerLink({
  href,
  active,
  icon,
  label,
  onClose,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex h-[3.25rem] items-center justify-between px-1 text-sm font-semibold transition ${
        active ? "text-volt" : "text-white/72 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-white/34" />
    </Link>
  );
}
