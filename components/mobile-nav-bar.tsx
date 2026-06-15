"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Calendar, Home, Newspaper, Radio } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { mobileFloatingSurfaceBlur, mobileFloatingSurfaceShadow } from "@/components/mobile-surface-styles";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "新闻", href: "/news", icon: Newspaper },
  { label: "赛程", href: "/matches", icon: Calendar },
  { label: "数据", href: "/data", icon: BarChart3 },
];

const HIDE_MOBILE_NAV_PAGES = new Set(["/matches/calendar"]);
const NEWS_API = process.env.NEXT_PUBLIC_NEWS_API_URL || "https://news.20250114.xyz";
const warmedTargets = new Set<string>();

export function MobileNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPathname = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  const isLivePage = normalizedPathname === "/live";
  const [liveReturnHref, setLiveReturnHref] = useState("/matches");
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const isActive = (href: string) => {
    const pathActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return pathActive || pendingHref === href;
  };

  useEffect(() => {
    if (!isLivePage) return;
    setLiveReturnHref(window.sessionStorage.getItem("mobile-live-return-url") || "/matches");
  }, [isLivePage]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (isLivePage) return;

    const prefetchNavTargets = () => {
      for (const item of navItems) router.prefetch(item.href);
      router.prefetch("/live");
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetchNavTargets, { timeout: 1_500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prefetchNavTargets, 600);
    return () => window.clearTimeout(timeoutId);
  }, [isLivePage, router]);

  const prewarmHref = (href: string) => {
    router.prefetch(href);
    if (warmedTargets.has(href)) return;
    warmedTargets.add(href);

    if (href === "/news") {
      const endpoint = `${NEWS_API}/api/news?${new URLSearchParams({ limit: "72" }).toString()}`;
      void fetch(endpoint, { cache: "force-cache" }).catch(() => undefined);
    }

    if (href === "/matches" || href === "/live") {
      void fetch("/calendar.ics", { cache: "force-cache" }).catch(() => undefined);
    }

    if (href === "/data") {
      void import("@/components/market-dashboard/market-dashboard");
    }
  };

  const handleLiveNavClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isLivePage) {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("mobile-live-close"));
      return;
    }
    window.sessionStorage.setItem(
      "mobile-live-return-url",
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    setPendingHref("/live");
  };

  if (HIDE_MOBILE_NAV_PAGES.has(normalizedPathname)) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 lg:hidden ${isLivePage ? "pointer-events-none z-[80]" : "z-50"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
    >
      <div className="mx-3 mb-3 flex items-stretch gap-3">
        <div
          className={`mobile-nav-bar mobile-floating-surface relative flex flex-1 items-center justify-around rounded-full px-2 py-2 ${
            isLivePage ? "pointer-events-none z-0 opacity-0" : ""
          }`}
          style={mobileNavSurfaceStyle}
        >
          <NavTopLine />

          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onPointerDown={() => {
                  setPendingHref(item.href);
                  prewarmHref(item.href);
                }}
                onClick={() => setPendingHref(item.href)}
                className="relative flex flex-col items-center gap-1 px-1.5 py-1.5 transition-colors sm:px-3"
              >
                {active && (
                  <span
                    className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full"
                    style={{
                      background:
                        "linear-gradient(0deg, rgba(216,255,62,0.6), rgba(216,255,62,0))",
                      filter: "blur(3px)",
                    }}
                  />
                )}

                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active
                      ? "text-volt drop-shadow-[0_0_10px_rgba(216,255,62,0.7)]"
                      : "text-white/35"
                  }`}
                  strokeWidth={active ? 2.5 : 1.75}
                />

                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    active ? "text-volt" : "text-white/40"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <Link
          href={isLivePage ? liveReturnHref : "/live"}
          onClick={handleLiveNavClick}
          onPointerDown={() => {
            if (!isLivePage) {
              setPendingHref("/live");
              prewarmHref("/live");
            }
          }}
          className="mobile-floating-surface pointer-events-auto relative z-[90] flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-full text-black transition-transform hover:scale-[1.02]"
          style={liveNavSurfaceStyle}
          aria-label="直播"
        >
          <Radio className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">直播</span>
        </Link>
      </div>
    </nav>
  );
}

const mobileNavSurfaceStyle = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), rgba(5,8,8,0.92)",
  boxShadow: mobileFloatingSurfaceShadow,
  backdropFilter: mobileFloatingSurfaceBlur,
  WebkitBackdropFilter: mobileFloatingSurfaceBlur,
};

const liveNavSurfaceStyle = {
  background:
    "linear-gradient(135deg, rgba(216,255,62,0.98), rgba(184,214,65,0.92)), rgba(216,255,62,0.96)",
  boxShadow: mobileFloatingSurfaceShadow,
  backdropFilter: mobileFloatingSurfaceBlur,
  WebkitBackdropFilter: mobileFloatingSurfaceBlur,
};

function NavTopLine({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute top-0 h-px rounded-full ${compact ? "inset-x-2" : "inset-x-3"}`}
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(216,255,62,0.15), rgba(255,255,255,0.06), rgba(216,255,62,0.15), transparent)",
      }}
    />
  );
}
