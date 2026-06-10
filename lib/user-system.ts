"use client";

import type { UserPreferenceCatalog } from "@/lib/user-preferences";
import { fetchWithTimeout } from "@/lib/request-cache";

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://api.boyzi.fun";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export interface PublicUser {
  id: string;
  email: string;
  emailVerifiedAt?: number | null;
  emailVerificationSentAt?: number | null;
  createdAt: number;
  updatedAt: number;
  profile: {
    displayName: string;
    signature?: string | null;
    homeTeamId: string | null;
    avatarPlayerId?: string | null;
    avatarUrl?: string | null;
    timezone: string;
    language: "zh-CN" | "en-US";
  };
  followedTeams: Array<{ id: string; name: string; region?: string; logo?: string; followedAt: number }>;
  followedPlayers: Array<{ id: string; name: string; team?: string; position?: string; photo?: string; followedAt: number }>;
  favoriteMatches: Array<{ id: string; title: string; stage?: string; startsAt?: string; addedAt: number }>;
  reminders: Array<{
    id: string;
    matchId: string;
    title: string;
    startsAt?: string;
    remindBeforeMinutes: number;
    channel: "site" | "email" | "push";
    enabled: boolean;
    lastQueuedAt?: number;
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
  predictionArchives: Array<{
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    groupScores: Record<string, { home: number; away: number } | null>;
    knockoutPicks: Record<string, { winnerCode: string; homeScore: number; awayScore: number }>;
  }>;
  watchHistory: Array<{
    id: string;
    matchId: string;
    title: string;
    status: "planned" | "watched" | "missed";
    watchedAt: number;
  }>;
  newsSubscriptions: Array<{ id: string; topic: string; enabled: boolean; updatedAt: number }>;
  notifications: Array<{
    id: string;
    type: "match_reminder" | "system";
    title: string;
    body: string;
    channel: "site" | "email" | "push";
    read: boolean;
    createdAt: number;
    metadata?: Record<string, string | number | boolean | null>;
  }>;
}

export interface UserHomePayload {
  user: PublicUser;
  catalog?: UserPreferenceCatalog;
  summary: UserSummary;
}

export interface UserSessionPayload {
  user: PublicUser;
  summary: UserSummary;
}

export interface UserSummary {
  followedTeamCount: number;
  followedPlayerCount: number;
  favoriteMatchCount: number;
  enabledReminderCount: number;
  predictionCount: number;
  watchedMatchCount: number;
  activeNewsTopicCount: number;
  unreadNotificationCount: number;
}

export interface PopularPlayerFollow {
  id: string;
  name: string;
  team?: string;
  position?: string;
  photo?: string;
  followCount: number;
  lastFollowedAt: number;
}

export interface PopularPlayersPayload {
  timestamp: number;
  totalUsers: number;
  players: PopularPlayerFollow[];
}

export function getUserApiUrl() {
  const fallbackUrl = getFallbackApiUrl();

  return (process.env.NEXT_PUBLIC_USER_API_URL || process.env.NEXT_PUBLIC_MARKET_API_URL || fallbackUrl).replace(/\/$/, "");
}

function getFallbackApiUrl() {
  if (typeof window === "undefined") return PRODUCTION_API_URL;

  const { hostname, port, protocol } = window.location;
  if (LOCAL_HOSTS.has(hostname)) {
    return LOCAL_API_URL;
  }
  if (protocol === "http:") {
    return `http://${hostname}:3001`;
  }

  return PRODUCTION_API_URL;
}

export async function userApi<T>(path: string, init?: RequestInit) {
  const response = await fetchWithTimeout(`${getUserApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  }, 8_000);

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `request_failed_${response.status}`);
  }

  return payload as T;
}

export async function fetchPopularPlayers(limit = 24) {
  const params = new URLSearchParams({ limit: String(limit) });
  return userApi<PopularPlayersPayload>(`/api/popular-players?${params.toString()}`, {
    method: "GET",
  });
}
