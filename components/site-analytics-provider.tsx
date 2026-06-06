"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getSiteAnalyticsSessionId, sendSiteAnalytics, type SiteAnalyticsStats } from "@/lib/site-analytics";

const SiteAnalyticsContext = createContext<SiteAnalyticsStats | null>(null);

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
      sendSiteAnalytics(action, sessionId)
        .then((nextStats) => {
          if (active) setStats(nextStats);
        })
        .catch((error) => {
          console.warn("[SiteAnalytics] unavailable:", error);
        });
    };

    syncStats("view");
    const interval = window.setInterval(() => syncStats("heartbeat"), 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pathname]);

  const value = useMemo(() => stats, [stats]);

  return <SiteAnalyticsContext.Provider value={value}>{children}</SiteAnalyticsContext.Provider>;
}

export function useSiteAnalyticsStats() {
  return useContext(SiteAnalyticsContext);
}
