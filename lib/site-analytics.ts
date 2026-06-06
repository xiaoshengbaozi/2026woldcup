"use client";

import { getUserApiUrl } from "@/lib/user-system";

export type SiteAnalyticsStats = {
  todayViews: number;
  onlineUsers: number;
};

let fallbackSessionId: string | null = null;

export async function sendSiteAnalytics(action: "view" | "heartbeat", sessionId: string) {
  const response = await fetch(`${getUserApiUrl()}/api/site-analytics`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, sessionId }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `site_analytics_${response.status}`);

  return normalizeSiteAnalyticsStats(payload);
}

export function getSiteAnalyticsSessionId() {
  const key = "wc-site-analytics-session";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const next = createSessionId();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    fallbackSessionId = fallbackSessionId || createSessionId();
    return fallbackSessionId;
  }
}

function createSessionId() {
  return typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeSiteAnalyticsStats(payload: unknown): SiteAnalyticsStats {
  if (!payload || typeof payload !== "object") return { todayViews: 0, onlineUsers: 0 };

  const stats = payload as Partial<Record<keyof SiteAnalyticsStats, unknown>>;
  return {
    todayViews: readStatNumber(stats.todayViews),
    onlineUsers: readStatNumber(stats.onlineUsers),
  };
}

function readStatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
