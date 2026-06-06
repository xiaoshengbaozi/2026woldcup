"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronRight,
  Flag,
  Home,
  LogIn,
  LogOut,
  Newspaper,
  Settings,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { AvatarSettingsDialog } from "./avatar-settings-dialog";
import { GlobalSearch } from "./global-search";
import { MeAuthDialog, type SharedAuthMode } from "./me-auth-dialog";
import { ThemeToggle } from "./theme-toggle";
import { getPlayerAvatar } from "@/lib/user-preferences";
import { userApi, type UserHomePayload } from "@/lib/user-system";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "新闻", href: "/news", icon: Newspaper },
  { label: "赛程", href: "/matches", icon: Calendar },
  { label: "球队", href: "/teams", icon: Flag },
  { label: "球员", href: "/players", icon: UsersRound },
  { label: "数据", href: "/data", icon: BarChart3 },
];

export function NavBar() {
  const pathname = usePathname();
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [home, setHome] = useState<UserHomePayload | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarSettingsOpen, setAvatarSettingsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<SharedAuthMode | null>(null);

  const refreshHome = useCallback(() => {
    userApi<UserHomePayload>("/api/me/home", { cache: "no-store" })
      .then((payload) => {
        const playerId = payload.user.profile.avatarPlayerId ?? null;
        const followedPlayer = payload.user.followedPlayers.find((player) => player.id === playerId);
        setHome(payload);
        setAvatarUrl(payload.user.profile.avatarUrl || followedPlayer?.photo || getPlayerAvatar(playerId, payload.catalog?.players));
        setIsSignedIn(true);
        setUnreadCount(payload.summary.unreadNotificationCount);
      })
      .catch(() => {
        setHome(null);
        setAvatarUrl(null);
        setIsSignedIn(false);
        setUnreadCount(0);
      });
  }, []);

  useEffect(() => {
    refreshHome();
  }, [pathname, refreshHome]);

  useEffect(() => {
    if (!popoverOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [popoverOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const meActive = pathname.startsWith("/me");
  const recentNotifications = home?.user.notifications.slice(0, 12) ?? [];
  const upcomingReminders =
    home?.user.reminders
      .filter((reminder) => reminder.enabled)
      .sort((a, b) => (new Date(a.startsAt ?? 0).getTime() || 0) - (new Date(b.startsAt ?? 0).getTime() || 0))
      .slice(0, 12) ?? [];

  const openPopover = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setPopoverOpen(true);
  };

  const scheduleClosePopover = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setPopoverOpen(false), 140);
  };

  const openAuth = (mode: SharedAuthMode) => {
    setPopoverOpen(false);
    setAuthMode(mode);
  };

  const logout = async () => {
    await userApi("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    setPopoverOpen(false);
    refreshHome();
  };

  const openAvatarSettings = () => {
    setPopoverOpen(false);
    setAvatarSettingsOpen(true);
  };

  return (
    <>
      <nav className="hero-shell relative z-[300] hidden min-h-20 items-center justify-between gap-4 px-5 py-4 sm:px-7 lg:flex" style={{ borderRadius: "1.2rem" }}>
        <Link href="/" className="group flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/world-cup-2026-inverted.svg"
            alt="FIFA World Cup 2026"
            className="site-logo-dark h-12 w-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.5)] transition duration-300 group-hover:drop-shadow-[0_0_18px_rgba(216,255,62,.32)]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/world-cup-2026-alternate.svg"
            alt="FIFA World Cup 2026"
            className="site-logo-light h-12 w-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.18)] transition duration-300 group-hover:drop-shadow-[0_0_18px_rgba(216,255,62,.24)]"
          />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-1.5 text-sm font-medium uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "text-volt drop-shadow-[0_0_12px_rgba(216,255,62,.8)]"
                    : "text-white/45 hover:text-white/82"
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <GlobalSearch />
          <ThemeToggle />
          <div ref={popoverRef} className="relative" onMouseEnter={openPopover} onMouseLeave={scheduleClosePopover}>
            <button
              type="button"
              aria-label="我的世界杯"
              aria-expanded={popoverOpen}
              onClick={() => setPopoverOpen((value) => !value)}
              className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-white/60 ring-1 transition-all duration-200 hover:bg-white/[0.1] hover:text-white ${
                meActive || popoverOpen ? "ring-volt/55" : "ring-white/[0.08] hover:ring-volt/35"
              }`}
            >
              {isSignedIn && avatarUrl ? (
                <Image src={avatarUrl} alt="我的世界杯" fill sizes="32px" className="object-cover" />
              ) : (
                <UserRound className="h-4 w-4 text-volt" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-flare px-1 text-[10px] font-black text-black ring-2 ring-ink-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {popoverOpen && (
              <div className="absolute right-0 top-[calc(100%+0.65rem)] w-[224px] overflow-hidden rounded-[1.6rem] border border-white/[0.18] bg-[#070a11] text-white shadow-[0_30px_90px_rgba(0,0,0,.78),0_0_58px_rgba(216,255,62,.16)]">
                <div className="divide-y divide-white/[0.08] px-2 py-1 pb-4">
                  {isSignedIn ? (
                    <div>
                      <Link href="/me" onClick={() => setPopoverOpen(false)} className="group flex min-h-12 items-center justify-between px-2.5 py-3 text-sm font-medium text-white/66 transition hover:text-volt">
                        <span className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-volt/80" />
                          个人主页
                        </span>
                        <ChevronRight className="h-4 w-4 text-white/34 transition group-hover:translate-x-0.5 group-hover:text-volt" />
                      </Link>
                      <button type="button" onClick={openAvatarSettings} className="group flex min-h-12 w-full items-center justify-between px-2.5 py-3 text-left text-sm font-medium text-white/66 transition hover:text-volt">
                        <span className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-volt/80" />
                          设置
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/38 transition group-hover:text-volt/80">修改头像</span>
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => openAuth("register")} className="group flex min-h-12 w-full items-center justify-between px-2.5 py-3 text-left text-sm font-medium text-white/66 transition hover:text-volt">
                      <span className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-volt/80" />
                        个人主页
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-volt/70">登录后进入</span>
                    </button>
                  )}

                  <section className="px-2.5 py-3">
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen((value) => !value)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                      aria-expanded={notificationsOpen}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-white/68">
                        <Bell className="h-4 w-4 text-volt/80" />
                        通知消息
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.055] px-2 py-1 text-[10px] font-medium text-white/42">
                        {isSignedIn ? `${unreadCount} 未读` : "比赛提醒"}
                        <ChevronRight className={`h-3 w-3 transition ${notificationsOpen ? "rotate-90 text-volt" : ""}`} />
                      </span>
                    </button>
                    {notificationsOpen ? (
                      <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto pr-1">
                        {isSignedIn && recentNotifications.length
                          ? recentNotifications.map((item) => (
                              <Link key={item.id} href="/me" onClick={() => setPopoverOpen(false)} className="block px-0 py-2 text-left transition hover:text-volt">
                                <p className="truncate text-xs font-medium text-white/66">{item.title}</p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/38">{item.body}</p>
                              </Link>
                            ))
                          : null}
                        {isSignedIn && !recentNotifications.length && upcomingReminders.length
                          ? upcomingReminders.map((item) => (
                              <Link key={item.id} href="/me" onClick={() => setPopoverOpen(false)} className="block px-0 py-2 text-left transition hover:text-volt">
                                <p className="truncate text-xs font-medium text-white/66">{item.title}</p>
                                <p className="mt-0.5 text-[11px] text-white/38">{formatReminderTime(item.startsAt)}</p>
                              </Link>
                            ))
                          : null}
                        {!isSignedIn || (!recentNotifications.length && !upcomingReminders.length) ? (
                          <button type="button" onClick={() => (isSignedIn ? setPopoverOpen(false) : openAuth("login"))} className="w-full px-0 py-3 text-left transition hover:text-volt">
                            <p className="text-xs font-medium text-white/66">比赛提醒</p>
                            <p className="mt-1 text-[11px] leading-4 text-white/38">
                              {isSignedIn ? "暂时没有新的比赛提醒。" : "登录后同步收藏比赛、提醒和站内通知。"}
                            </p>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                </div>

                {isSignedIn ? (
                  <div className="px-2 pb-4">
                    <button type="button" onClick={logout} className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-white/[0.055] px-3 text-[11px] font-medium text-white/66 ring-1 ring-white/[0.1] transition hover:text-volt">
                      <LogOut className="h-3 w-3" />
                      退出登录
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 px-2 pb-4">
                    <button type="button" onClick={() => openAuth("login")} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white/[0.055] px-3 text-[11px] font-medium text-white/66 ring-1 ring-white/[0.1] transition hover:text-volt">
                      <LogIn className="h-3 w-3" />
                      登录
                    </button>
                    <button type="button" onClick={() => openAuth("register")} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-volt px-3 text-[11px] font-semibold text-black shadow-[0_0_24px_rgba(216,255,62,.18)] transition hover:shadow-[0_0_20px_rgba(216,255,62,.26)]">
                      <UserPlus className="h-3 w-3" />
                      注册
                    </button>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-white/[0.035] backdrop-blur-xl [mask-image:linear-gradient(to_top,black,transparent)]" />
              </div>
            )}
          </div>
        </div>
      </nav>
      <MeAuthDialog mode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={refreshHome} />
      <AvatarSettingsDialog open={avatarSettingsOpen} home={home} onClose={() => setAvatarSettingsOpen(false)} onSaved={refreshHome} />
    </>
  );
}

function formatReminderTime(startsAt?: string) {
  if (!startsAt) return "时间待定";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startsAt));
  } catch {
    return startsAt;
  }
}
