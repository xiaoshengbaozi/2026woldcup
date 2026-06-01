"use client";

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://api-2026.20250114.xyz";

export interface PublicUser {
  id: string;
  email: string;
  createdAt: number;
  updatedAt: number;
  profile: {
    displayName: string;
    homeTeamId: string | null;
    timezone: string;
    language: "zh-CN" | "en-US";
  };
  followedTeams: Array<{ id: string; name: string; region?: string; followedAt: number }>;
  followedPlayers: Array<{ id: string; name: string; team?: string; position?: string; followedAt: number }>;
  favoriteMatches: Array<{ id: string; title: string; stage?: string; startsAt?: string; addedAt: number }>;
  reminders: Array<{
    id: string;
    matchId: string;
    title: string;
    remindBeforeMinutes: number;
    channel: "site" | "email" | "push";
    enabled: boolean;
    createdAt: number;
  }>;
  predictions: Array<{
    id: string;
    matchId: string;
    title: string;
    homeScore: number;
    awayScore: number;
    confidence: number;
    createdAt: number;
    updatedAt: number;
  }>;
  watchHistory: Array<{
    id: string;
    matchId: string;
    title: string;
    status: "planned" | "watched" | "missed";
    watchedAt: number;
  }>;
  newsSubscriptions: Array<{ id: string; topic: string; enabled: boolean; updatedAt: number }>;
}

export interface UserHomePayload {
  user: PublicUser;
  summary: {
    followedTeamCount: number;
    followedPlayerCount: number;
    favoriteMatchCount: number;
    enabledReminderCount: number;
    predictionCount: number;
    watchedMatchCount: number;
    activeNewsTopicCount: number;
  };
}

export function getUserApiUrl() {
  const fallbackUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? LOCAL_API_URL
      : PRODUCTION_API_URL;

  return (process.env.NEXT_PUBLIC_MARKET_API_URL || fallbackUrl).replace(/\/$/, "");
}

export async function userApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getUserApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `request_failed_${response.status}`);
  }

  return payload as T;
}
