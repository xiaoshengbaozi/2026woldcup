"use client";

import { getUserApiUrl } from "@/lib/user-system";

export type SiteAnalyticsStats = {
  todayViews: number;
  onlineUsers: number;
};

export async function sendSiteAnalytics(action: "view" | "heartbeat", sessionId: string) {
  const response = await fetch(`${getUserApiUrl()}/api/site-analytics`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, sessionId }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `site_analytics_${response.status}`);

  return payload as SiteAnalyticsStats;
}

export function getSiteAnalyticsSessionId() {
  const key = "wc-site-analytics-session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}
