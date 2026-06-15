"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode, TouchEvent } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Plus, Search, UserRound } from "lucide-react";
import type { AvatarSettingsDialogProps } from "./avatar-settings-dialog";
import { useUserSession } from "@/components/user-session-provider";
import { userApi, type PublicUser } from "@/lib/user-system";
import type { MeAuthDialogProps, SharedAuthMode } from "./me-auth-dialog";
import type { MobileMeDrawerProps } from "./mobile-me-drawer";
import type { MobileSearchDrawerProps } from "./mobile-search-drawer";
import { mobileFloatingSurfaceStyle } from "@/components/mobile-surface-styles";
import { openCreatorSupportModal } from "@/components/support-creator-modal";

const loadMobileMeDrawer = () => import("./mobile-me-drawer").then((mod) => mod.MobileMeDrawer);
const loadMeAuthDialog = () => import("./me-auth-dialog").then((mod) => mod.MeAuthDialog);
const loadAvatarSettingsDialog = () => import("./avatar-settings-dialog").then((mod) => mod.AvatarSettingsDialog);
const loadMobileSearchDrawer = () => import("./mobile-search-drawer").then((mod) => mod.MobileSearchDrawer);

const MobileMeDrawer = dynamic<MobileMeDrawerProps>(
  loadMobileMeDrawer,
  { ssr: false }
);

const MeAuthDialog = dynamic<MeAuthDialogProps>(
  loadMeAuthDialog,
  { ssr: false }
);

const AvatarSettingsDialog = dynamic<AvatarSettingsDialogProps>(
  loadAvatarSettingsDialog,
  { ssr: false }
);

const MobileSearchDrawer = dynamic<MobileSearchDrawerProps>(
  loadMobileSearchDrawer,
  { ssr: false }
);

export type MobileTopRightAction = {
  ariaLabel: string;
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
};

type MobileMeEntryProps = {
  topRightAction?: MobileTopRightAction;
};

const PRIMARY_PAGES = new Set(["/", "/news", "/articles", "/data", "/matches", "/favorites", "/favorites/matches", "/players", "/me", "/teams", "/live", "/predict"]);
const CREATOR_SUPPORT_PAGES = new Set(["/matches", "/players", "/teams", "/predict"]);
const PRIMARY_PAGE_WORDMARK_LABELS: Record<string, string> = {
  "/favorites": "FAVORITES",
  "/favorites/matches": "FAVORITES",
  "/players": "PLAYERS",
  "/teams": "TEAMS",
  "/predict": "PREDICT",
};

export function MobileMeEntry({ topRightAction }: MobileMeEntryProps = {}) {
  const pathname = usePathname();
  const normalizedPathname = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarSettingsOpen, setAvatarSettingsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<SharedAuthMode | null>(null);
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [avatarSettingsLoaded, setAvatarSettingsLoaded] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const { home, avatarUrl, loading, refreshSession } = useUserSession();
  const showHomeWordmark = normalizedPathname === "/";
  const isArticlePage = normalizedPathname === "/articles" || normalizedPathname.startsWith("/articles/");
  const showFifaWordmark = normalizedPathname === "/news" || isArticlePage || normalizedPathname === "/matches" || normalizedPathname === "/data" || normalizedPathname === "/live";
  const primaryPageWordmarkLabel = PRIMARY_PAGE_WORDMARK_LABELS[normalizedPathname];
  const showSearchEntry = pathname === "/" || pathname.startsWith("/news") || pathname.startsWith("/articles");
  const favoritesTopRightAction: MobileTopRightAction | undefined =
    normalizedPathname === "/favorites" || normalizedPathname === "/favorites/matches"
      ? {
          ariaLabel: "添加收藏",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            window.location.href = "/matches";
          },
        }
      : undefined;
  const matchesTopRightAction: MobileTopRightAction | undefined =
    CREATOR_SUPPORT_PAGES.has(normalizedPathname)
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
    if (drawerOpen) setDrawerLoaded(true);
  }, [drawerOpen]);

  useEffect(() => {
    if (searchOpen) setSearchLoaded(true);
  }, [searchOpen]);

  useEffect(() => {
    if (authMode) setAuthLoaded(true);
  }, [authMode]);

  useEffect(() => {
    if (avatarSettingsOpen) setAvatarSettingsLoaded(true);
  }, [avatarSettingsOpen]);

  const openDrawer = () => {
    setDrawerLoaded(true);
    void loadMobileMeDrawer();
    setDrawerOpen(true);
  };

  const openSearch = () => {
    setSearchLoaded(true);
    void loadMobileSearchDrawer();
    setSearchOpen(true);
  };

  const openAuth = (mode: SharedAuthMode) => {
    setAuthLoaded(true);
    void loadMeAuthDialog();
    setAuthMode(mode);
  };

  const openAvatarSettings = () => {
    setAvatarSettingsLoaded(true);
    void loadAvatarSettingsDialog();
    setAvatarSettingsOpen(true);
  };

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
      openDrawer();
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

  if (!PRIMARY_PAGES.has(normalizedPathname) && !isArticlePage) return null;

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
        className="mobile-top-blur-mask pointer-events-none fixed inset-x-0 top-0 z-[80] h-[calc(env(safe-area-inset-top)+3.5rem)] bg-black/72 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_0%,black_68%,rgba(0,0,0,0)_100%)] lg:hidden"
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[calc(env(safe-area-inset-top)+4.125rem)] lg:hidden">
        <button
          type="button"
          aria-label="打开我的世界杯"
          onPointerDown={() => {
            setDrawerLoaded(true);
            void loadMobileMeDrawer();
          }}
          onClick={openDrawer}
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
        {primaryPageWordmarkLabel ? <MobileHomeWordmark label={primaryPageWordmarkLabel} /> : null}
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
            onPointerDown={() => {
              setSearchLoaded(true);
              void loadMobileSearchDrawer();
            }}
            onClick={openSearch}
            className={`mobile-floating-surface pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition ${
              searchOpen ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
            }`}
            style={mobileFloatingSurfaceStyle}
          >
            <Search className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {drawerLoaded ? (
        <MobileMeDrawer
          open={drawerOpen}
          home={home}
          loading={loading}
          avatarUrl={avatarUrl}
          onLogin={() => openAuth("login")}
          onRegister={() => openAuth("register")}
          onOpenAvatarSettings={openAvatarSettings}
          onResendVerification={resendEmailVerification}
          onLogout={logout}
          onClose={() => setDrawerOpen(false)}
          emailNotice={emailNotice}
          emailBusy={emailBusy}
        />
      ) : null}
      {authLoaded ? <MeAuthDialog mode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={refreshHome} /> : null}
      {avatarSettingsLoaded ? <AvatarSettingsDialog open={avatarSettingsOpen} home={home} onClose={() => setAvatarSettingsOpen(false)} onSaved={refreshHome} /> : null}
      {showSearchEntry && searchLoaded ? <MobileSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}

function MobileHomeWordmark({ label = "CYBERBALL" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+1.18rem)] flex h-8 w-[min(60vw,236px)] -translate-x-1/2 items-center justify-center whitespace-nowrap text-center">
      <span className="text-[19px] font-normal leading-none tracking-[0.26em] text-volt drop-shadow-[0_0_16px_rgba(216,255,62,.5)]" style={{ fontFamily: "CyberballBrand, ScreenMatrix, sans-serif" }}>
        {label}
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
