"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, TouchEvent, UIEvent } from "react";
import { Bell, Bookmark, CalendarDays, ChevronRight, Coffee, Flag, LogIn, LogOut, Send, Settings, Star, UserPlus, UserRound, UsersRound, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { openCreatorSupportModal } from "@/components/support-creator-modal";
import type { UserSessionPayload } from "@/lib/user-system";

type MobileMeDrawerProps = {
  open: boolean;
  home: UserSessionPayload | null;
  loading?: boolean;
  avatarUrl?: string | null;
  onLogin: () => void;
  onRegister: () => void;
  onOpenAvatarSettings: () => void;
  onResendVerification: () => void;
  onLogout: () => void;
  onClose: () => void;
  emailNotice?: string;
  emailBusy?: boolean;
};

const emptySummary = {
  followedPlayerCount: 0,
  followedTeamCount: 0,
  favoriteMatchCount: 0,
};

export function MobileMeDrawer({
  open,
  home,
  loading,
  avatarUrl,
  onLogin,
  onRegister,
  onOpenAvatarSettings,
  onResendVerification,
  onLogout,
  onClose,
  emailNotice,
  emailBusy,
}: MobileMeDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const asideRef = useRef<HTMLElement>(null);
  const [followOpen, setFollowOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const summary = home?.summary ?? emptySummary;
  const unreadCount = home?.summary.unreadNotificationCount ?? 0;
  const signature = home?.user.profile.signature?.trim() || "\u4e00\u811a\u4e16\u754c\u6ce2";
  const displayName = home?.user.profile.displayName ?? "赛博世界波";
  const signedIn = Boolean(home);
  const needsEmailVerification = signedIn && !home?.user.emailVerifiedAt;

  useEffect(() => {
    if (!open) return;

    const preventScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && asideRef.current?.contains(target)) return;
      event.preventDefault();
    };

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true });
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true });

    return () => {
      window.removeEventListener("wheel", preventScroll, { capture: true });
      window.removeEventListener("touchmove", preventScroll, { capture: true });
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

  const handleOpenSupport = () => {
    onClose();
    window.requestAnimationFrame(() => openCreatorSupportModal());
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="关闭个人菜单"
            className="mobile-me-drawer-backdrop fixed inset-0 z-[80] bg-black/58 will-change-opacity lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={onClose}
            onWheel={stopBackgroundScroll}
            onTouchMove={stopBackgroundScroll}
          />
          <motion.aside
            ref={asideRef}
            role="dialog"
            aria-modal="true"
            aria-label="个人中心"
            className="mobile-me-drawer fixed left-0 top-0 z-[90] flex h-[100dvh] w-[66.666vw] min-w-[250px] max-w-[340px] transform-gpu flex-col overflow-hidden bg-ink-950/94 px-5 pb-5 pt-[calc(1rem+env(safe-area-inset-top))] shadow-[26px_0_90px_rgba(0,0,0,.62)] backdrop-blur-xl will-change-transform lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 320, mass: 0.9 }}
            style={{ touchAction: "auto" }}
          >
            <div className="pointer-events-none absolute -left-20 top-16 h-44 w-44 rounded-full bg-volt/12 blur-[70px]" />
            <div className="pointer-events-none absolute bottom-16 right-0 h-40 w-24 rounded-full bg-flare/10 blur-[56px]" />

            <div className="relative flex items-center justify-between">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!signedIn) {
                    onClose();
                    onLogin();
                    return;
                  }
                  onClose();
                  router.push("/me");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (!signedIn) {
                    onClose();
                    onLogin();
                    return;
                  }
                  onClose();
                  router.push("/me");
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
                  {needsEmailVerification ? (
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 text-[10px] font-semibold leading-none text-white/45">{"\u90ae\u7bb1\u5f85\u9a8c\u8bc1"}</span>
                      <button
                        type="button"
                        disabled={emailBusy}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onResendVerification();
                        }}
                        className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-volt px-2 text-[10px] font-bold leading-none text-black shadow-[0_0_18px_rgba(216,255,62,.2)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-2.5 w-2.5" />
                        {emailBusy ? "\u53d1\u9001\u4e2d" : "\u91cd\u53d1"}
                      </button>
                      {emailNotice ? <span className="min-w-0 truncate text-[10px] font-semibold leading-none text-white/48">{emailNotice}</span> : null}
                    </div>
                  ) : signedIn ? (
                    <p className="truncate text-[10px] font-semibold leading-5 text-white/40">{signature}</p>
                  ) : loading ? (
                    <p className="truncate text-[10px] font-semibold leading-5 text-white/34">{"\u540c\u6b65\u4e2d"}</p>
                  ) : (
                    <p className="truncate text-[10px] font-semibold leading-5 text-white/34">{"\u672a\u767b\u5f55"}</p>
                  )}
                </div>
              </div>
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
                    <FollowSubMetric href="/favorites" icon={<Bookmark className="h-3.5 w-3.5" />} label="收藏比赛" value={summary.favoriteMatchCount} onClose={onClose} />
                  </div>
                ) : null}
              </div>
              <DrawerLink
                href="/matches/calendar"
                active={pathname.startsWith("/matches/calendar")}
                icon={<CalendarDays className="h-4 w-4" />}
                label="比赛日历"
                onClose={onClose}
              />
              <DrawerAction
                icon={<Coffee className="h-4 w-4" />}
                label="打赏作者"
                onClick={handleOpenSupport}
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

function DrawerAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[3.25rem] items-center justify-between px-1 text-left text-sm font-semibold text-white/72 transition hover:text-white"
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-white/34" />
    </button>
  );
}
