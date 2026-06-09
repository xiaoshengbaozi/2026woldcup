"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, TouchEvent } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Plus, Search, UserRound } from "lucide-react";
import { AvatarSettingsDialog } from "./avatar-settings-dialog";
import { useUserSession } from "@/components/user-session-provider";
import { userApi, type PublicUser } from "@/lib/user-system";
import { MeAuthDialog, type SharedAuthMode } from "./me-auth-dialog";
import { MobileMeDrawer } from "./mobile-me-drawer";
import { MobileSearchDrawer } from "./mobile-search-drawer";
import { mobileFloatingSurfaceStyle } from "@/components/mobile-surface-styles";
import { openCreatorSupportModal } from "@/components/support-creator-modal";

export type MobileTopRightAction = {
  ariaLabel: string;
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
};

type MobileMeEntryProps = {
  topRightAction?: MobileTopRightAction;
};

const PRIMARY_PAGES = new Set(["/", "/news", "/data", "/matches", "/favorites", "/players", "/me", "/teams", "/live"]);

export function MobileMeEntry({ topRightAction }: MobileMeEntryProps = {}) {
  const pathname = usePathname();
  const normalizedPathname = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarSettingsOpen, setAvatarSettingsOpen] = useState(false);
  const [topRailExpanded, setTopRailExpanded] = useState(false);
  const [topRailHeight, setTopRailHeight] = useState(88);
  const [authMode, setAuthMode] = useState<SharedAuthMode | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const { home, avatarUrl, loading, refreshSession } = useUserSession();
  const showHomeWordmark = normalizedPathname === "/";
  const showFifaWordmark = normalizedPathname === "/news" || normalizedPathname === "/matches" || normalizedPathname === "/data" || normalizedPathname === "/live";
  const showSearchEntry = pathname === "/" || pathname.startsWith("/news");
  const favoritesTopRightAction: MobileTopRightAction | undefined =
    normalizedPathname === "/favorites"
      ? {
          ariaLabel: "添加收藏",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            window.location.href = "/matches";
          },
        }
      : undefined;
  const matchesTopRightAction: MobileTopRightAction | undefined =
    normalizedPathname === "/matches"
      ? {
          ariaLabel: "打赏作者",
          icon: (
            <span className="relative block h-7 w-7 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/support/beer-glass.webp" alt="" className="h-full w-full object-contain p-0.5" />
            </span>
          ),
          onClick: openCreatorSupportModal,
        }
      : undefined;
  const resolvedTopRightAction = topRightAction ?? favoritesTopRightAction ?? matchesTopRightAction;

  const refreshHome = refreshSession;

  useEffect(() => {
    if (home?.user.emailVerifiedAt) setEmailNotice("");
  }, [home?.user.emailVerifiedAt]);

  useEffect(() => {
    const handleTopRailChange = (event: Event) => {
      const detail = (event as CustomEvent<{ pinned?: boolean; height?: number }>).detail;
      setTopRailExpanded(Boolean(detail?.pinned));
      if (typeof detail?.height === "number" && detail.height > 0) setTopRailHeight(detail.height);
    };

    window.addEventListener("mobile-top-rail-change", handleTopRailChange);
    return () => {
      window.removeEventListener("mobile-top-rail-change", handleTopRailChange);
      setTopRailExpanded(false);
    };
  }, []);

  const startEdgeGesture = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    gestureStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const moveEdgeGesture = (event: TouchEvent<HTMLDivElement>) => {
    const start = gestureStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch || drawerOpen) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (deltaX > 48 && Math.abs(deltaY) < 36) {
      event.preventDefault();
      gestureStartRef.current = null;
      setDrawerOpen(true);
    }
  };

  const endEdgeGesture = () => {
    gestureStartRef.current = null;
  };

  const logout = async () => {
    await userApi("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    setEmailNotice("");
    refreshHome();
  };

  const resendEmailVerification = async () => {
    setEmailBusy(true);
    setEmailNotice("");
    try {
      const result = await userApi<{ user: PublicUser; emailVerificationSent?: boolean; alreadyVerified?: boolean }>("/api/auth/resend-verification", {
        method: "POST",
        body: "{}",
      });
      setEmailNotice(result.alreadyVerified ? "\u90ae\u7bb1\u5df2\u9a8c\u8bc1" : result.emailVerificationSent ? "\u9a8c\u8bc1\u90ae\u4ef6\u5df2\u53d1\u9001" : "\u90ae\u4ef6\u670d\u52a1\u6682\u672a\u914d\u7f6e");
      await refreshHome();
    } catch {
      setEmailNotice("\u53d1\u9001\u5931\u8d25\uff0c\u7a0d\u540e\u518d\u8bd5");
    } finally {
      setEmailBusy(false);
    }
  };

  if (!PRIMARY_PAGES.has(normalizedPathname)) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed bottom-0 left-0 top-0 z-[65] w-6 touch-none lg:hidden"
        onTouchStart={startEdgeGesture}
        onTouchMove={moveEdgeGesture}
        onTouchEnd={endEdgeGesture}
        onTouchCancel={endEdgeGesture}
      />
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-[60] bg-black/72 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_0%,black_68%,rgba(0,0,0,0)_100%)] lg:hidden ${
          topRailExpanded ? "" : "h-[calc(env(safe-area-inset-top)+4.125rem)]"
        }`}
        style={topRailExpanded ? { height: `calc(env(safe-area-inset-top) + 4.125rem + ${topRailHeight}px)` } : undefined}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[calc(env(safe-area-inset-top)+4.125rem)] lg:hidden">
        <button
          type="button"
          aria-label="打开我的世界杯"
          onClick={() => setDrawerOpen(true)}
          className={`mobile-floating-surface pointer-events-auto absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-full bg-white/[0.08] shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
            drawerOpen || pathname.startsWith("/me") ? "ring-volt/55" : "ring-white/12"
          }`}
          style={mobileFloatingSurfaceStyle}
        >
          {home && avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="34px" className="object-cover" />
          ) : (
            <UserRound className="h-4 w-4 text-volt" />
          )}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/18 via-transparent to-black/18" />
          {loading && <span className="absolute inset-0 bg-black/20" />}
        </button>
        {showHomeWordmark ? <MobileHomeWordmark /> : null}
        {showFifaWordmark ? <MobileFifaWordmark /> : null}
        {resolvedTopRightAction ? (
          <button
            type="button"
            aria-label={resolvedTopRightAction.ariaLabel}
            onClick={resolvedTopRightAction.onClick}
            className={`mobile-floating-surface pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
              resolvedTopRightAction.active ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
            }`}
            style={mobileFloatingSurfaceStyle}
          >
            {resolvedTopRightAction.icon}
          </button>
        ) : showSearchEntry ? (
          <button
            type="button"
            aria-label="打开全局搜索"
            onClick={() => setSearchOpen(true)}
            className={`mobile-floating-surface pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
              searchOpen ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
            }`}
            style={mobileFloatingSurfaceStyle}
          >
            <Search className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <MobileMeDrawer
        open={drawerOpen}
        home={home}
        loading={loading}
        avatarUrl={avatarUrl}
        onLogin={() => setAuthMode("login")}
        onRegister={() => setAuthMode("register")}
        onOpenAvatarSettings={() => setAvatarSettingsOpen(true)}
        onResendVerification={resendEmailVerification}
        onLogout={logout}
        onClose={() => setDrawerOpen(false)}
        emailNotice={emailNotice}
        emailBusy={emailBusy}
      />
      <MeAuthDialog mode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={refreshHome} />
      <AvatarSettingsDialog open={avatarSettingsOpen} home={home} onClose={() => setAvatarSettingsOpen(false)} onSaved={refreshHome} />
      {showSearchEntry ? <MobileSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}

function MobileHomeWordmark() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+1.18rem)] flex h-8 w-[min(60vw,236px)] -translate-x-1/2 items-center justify-center whitespace-nowrap text-center">
      <span className="text-[19px] font-normal leading-none tracking-[0.26em] text-volt drop-shadow-[0_0_16px_rgba(216,255,62,.5)]" style={{ fontFamily: "CyberballBrand, ScreenMatrix, sans-serif" }}>
        CYBERBALL
      </span>
    </div>
  );
}

function MobileFifaWordmark() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+1.24rem)] flex h-7 w-[min(58vw,236px)] -translate-x-1/2 items-center justify-center">
      <Image
        src="/logos/world-cup-2026-wordmark-dark.svg"
        alt="FIFA World Cup 2026"
        width={1366}
        height={97}
        className="site-logo-dark h-[22px] w-full object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,.5)]"
        priority
      />
      <Image
        src="/logos/world-cup-2026-wordmark-light.svg"
        alt="FIFA World Cup 2026"
        width={1366}
        height={97}
        className="site-logo-light h-[22px] w-full object-contain drop-shadow-[0_10px_18px_rgba(255,255,255,.16)]"
        priority
      />
    </div>
  );
}
