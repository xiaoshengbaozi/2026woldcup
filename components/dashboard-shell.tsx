"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BackToTopButton } from "./back-to-top-button";
import { NavBar } from "./nav-bar";
import { MobileMeEntry } from "./mobile-me-entry";
import { SiteFooter } from "./site-footer";
import { UserNotificationToast } from "./user-notification-toast";

const PRIMARY_PAGES = new Set(["/", "/news", "/data", "/matches", "/favorites", "/players", "/me", "/teams", "/live"]);

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const hasMobileMeEntry = PRIMARY_PAGES.has(normalizedPathname);
  const favoritesTopRightAction = normalizedPathname === "/favorites"
    ? {
        ariaLabel: "添加收藏",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => {
          window.location.href = "/matches";
        },
      }
    : undefined;

  return (
    <div
      className={`relative flex min-h-screen flex-col overflow-x-hidden px-3 pb-28 sm:px-6 lg:px-8 lg:pb-5 lg:pt-5 ${
        hasMobileMeEntry ? "pt-[calc(env(safe-area-inset-top)+4.125rem)]" : "pt-4 sm:pt-5"
      }`}
    >
      <div className="pointer-events-none fixed left-1/2 top-0 h-[360px] w-[min(720px,100vw)] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px] sm:h-[520px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[320px] w-[min(420px,80vw)] rounded-full bg-flare/10 blur-[110px] sm:h-[420px]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5">
        <NavBar />
        {children}
        <SiteFooter />
      </div>
      {hasMobileMeEntry && <MobileMeEntry topRightAction={favoritesTopRightAction} />}
      <UserNotificationToast />
      <BackToTopButton />
    </div>
  );
}
