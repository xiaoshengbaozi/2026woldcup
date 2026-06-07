"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, TouchEvent } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { AvatarSettingsDialog } from "./avatar-settings-dialog";
import { getPlayerAvatar } from "@/lib/user-preferences";
import { userApi, type UserSessionPayload } from "@/lib/user-system";
import { MeAuthDialog, type SharedAuthMode } from "./me-auth-dialog";
import { MobileMeDrawer } from "./mobile-me-drawer";
import { MobileSearchDrawer } from "./mobile-search-drawer";

type MobileMeEntryProps = {
  topRightAction?: {
    ariaLabel: string;
    active?: boolean;
    icon: ReactNode;
    onClick: () => void;
  };
};

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
  const [home, setHome] = useState<UserSessionPayload | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const showHomeWordmark = normalizedPathname === "/";
  const showFifaWordmark = normalizedPathname === "/news" || normalizedPathname === "/matches" || normalizedPathname === "/data" || normalizedPathname === "/live";
  const showSearchEntry = pathname === "/" || pathname.startsWith("/news");

  const refreshHome = useCallback(() => {
    setLoading(true);
    userApi<UserSessionPayload>("/api/me/session", { cache: "no-store" })
      .then((payload) => {
        const playerId = payload.user.profile.avatarPlayerId ?? null;
        const followedPlayer = payload.user.followedPlayers.find((player) => player.id === playerId);
        setHome(payload);
        setAvatarUrl(payload.user.profile.avatarUrl || followedPlayer?.photo || getPlayerAvatar(playerId));
      })
      .catch(() => {
        setHome(null);
        setAvatarUrl(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refreshHome();
  }, [pathname, refreshHome]);

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
    refreshHome();
  };

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
          className={`pointer-events-auto absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-full bg-white/[0.08] shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
            drawerOpen || pathname.startsWith("/me") ? "ring-volt/55" : "ring-white/12"
          }`}
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
        {topRightAction ? (
          <button
            type="button"
            aria-label={topRightAction.ariaLabel}
            onClick={topRightAction.onClick}
            className={`pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
              topRightAction.active ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
            }`}
          >
            {topRightAction.icon}
          </button>
        ) : showSearchEntry ? (
          <button
            type="button"
            aria-label="打开全局搜索"
            onClick={() => setSearchOpen(true)}
            className={`pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
              searchOpen ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
            }`}
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
        onLogout={logout}
        onClose={() => setDrawerOpen(false)}
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
