"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getSiteAnalyticsSessionId, sendSiteAnalytics, type SiteAnalyticsStats } from "@/lib/site-analytics";

const SiteAnalyticsContext = createContext<SiteAnalyticsStats | null>(null);
const HEARTBEAT_INTERVAL_MS = 90_000;

export function SiteAnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [stats, setStats] = useState<SiteAnalyticsStats | null>(null);

  useEffect(() => {
    let active = true;
    let sessionId: string;

    try {
      sessionId = getSiteAnalyticsSessionId();
    } catch (error) {
      console.warn("[SiteAnalytics] session unavailable:", error);
      return () => {
        active = false;
      };
    }

    const syncStats = (action: "view" | "heartbeat") => {
      if (action === "heartbeat" && (document.hidden || !navigator.onLine)) return;
      sendSiteAnalytics(action, sessionId)
        .then((nextStats) => {
          if (active && nextStats) setStats(nextStats);
        })
        .catch((error) => {
          console.warn("[SiteAnalytics] unavailable:", error);
        });
    };

    syncStats("view");
    const interval = window.setInterval(() => syncStats("heartbeat"), HEARTBEAT_INTERVAL_MS);
    const syncVisibleHeartbeat = () => syncStats("heartbeat");
    document.addEventListener("visibilitychange", syncVisibleHeartbeat);
    window.addEventListener("online", syncVisibleHeartbeat);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncVisibleHeartbeat);
      window.removeEventListener("online", syncVisibleHeartbeat);
    };
  }, [pathname]);

  const value = useMemo(() => stats, [stats]);

  return <SiteAnalyticsContext.Provider value={value}>{children}</SiteAnalyticsContext.Provider>;
}

export function useSiteAnalyticsStats() {
  return useContext(SiteAnalyticsContext);
}
