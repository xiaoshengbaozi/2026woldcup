"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactNode, TouchEvent, UIEvent } from "react";
import { CalendarDays, ChevronRight, LogIn, Settings, Star, UserPlus, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPlayerAvatar } from "@/lib/user-preferences";
import type { UserHomePayload } from "@/lib/user-system";

type MobileMeDrawerProps = {
  open: boolean;
  home: UserHomePayload | null;
  loading?: boolean;
  avatarUrl?: string | null;
  onClose: () => void;
};

const emptySummary = {
  followedPlayerCount: 0,
  followedTeamCount: 0,
  favoriteMatchCount: 0,
};

export function MobileMeDrawer({ open, home, loading, avatarUrl, onClose }: MobileMeDrawerProps) {
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const summary = home?.summary ?? emptySummary;
  const displayName = home?.user.profile.displayName ?? "我的世界杯";
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
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full bg-white/[0.08]">
                  <Image src={avatarUrl || getPlayerAvatar(null)} alt={displayName} fill sizes="44px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
                    {signedIn ? "已同步" : loading ? "同步中" : "未登录"}
                  </p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-volt/80">Account</p>
              <h2 className="mt-2 text-lg font-semibold leading-tight text-white">
                {signedIn ? "管理你的关注宇宙" : "登录后同步关注与收藏"}
              </h2>
              <div className="mt-4 grid grid-cols-2 divide-x divide-black/20 border border-white/[0.08]">
                <Link
                  href="/me"
                  onClick={onClose}
                  className="inline-flex h-11 items-center justify-center gap-1.5 bg-volt text-sm font-bold text-black shadow-[0_0_28px_rgba(216,255,62,.18)]"
                >
                  <LogIn className="h-4 w-4" />
                  登录
                </Link>
                <Link
                  href="/me"
                  onClick={onClose}
                  className="inline-flex h-11 items-center justify-center gap-1.5 text-sm font-semibold text-white/80"
                >
                  <UserPlus className="h-4 w-4" />
                  注册
                </Link>
              </div>
            </section>

            <nav className="relative grid divide-y divide-white/[0.08] border-b border-white/[0.08]">
              <div>
                <DrawerLink
                  href="/me"
                  active={pathname.startsWith("/me")}
                  icon={<Star className="h-4 w-4" />}
                  label="我的关注"
                  onClose={onClose}
                />
                <div className="grid divide-y divide-white/[0.07] border-t border-white/[0.08] pl-7">
                  <FollowSubMetric label="关注球员" value={summary.followedPlayerCount} />
                  <FollowSubMetric label="关注球队" value={summary.followedTeamCount} />
                  <FollowSubMetric label="收藏比赛" value={summary.favoriteMatchCount} />
                </div>
              </div>
              <DrawerLink
                href="/matches?layout=calendar"
                active={pathname.startsWith("/matches")}
                icon={<CalendarDays className="h-4 w-4" />}
                label="比赛日历"
                onClose={onClose}
              />
              <button type="button" className="flex h-[3.25rem] items-center justify-between px-1 text-left text-white/46">
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <Settings className="h-4 w-4" />
                  设置
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/28">Soon</span>
              </button>
            </nav>

            <div className="relative mt-auto flex items-center justify-start border-t border-white/[0.08] pt-4">
              <ThemeToggle />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function FollowSubMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-10 items-center justify-between pr-1">
      <div className="text-xs font-medium text-white/42">{label}</div>
      <div className="text-xl font-semibold leading-none text-white/86" style={{ fontFamily: "ScreenMatrix, monospace" }}>
        {value}
      </div>
    </div>
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
