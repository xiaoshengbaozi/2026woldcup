"use client";

import { getUserApiUrl } from "@/lib/user-system";

export interface PlayerXTimelineItem {
  id: string;
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  username: string;
  text: string;
  createdAt: string;
  url: string;
  media?: Array<{
    type: "photo" | "video" | "animated_gif";
    url?: string;
    videoUrl?: string;
    previewImageUrl?: string;
    width?: number;
    height?: number;
    durationMs?: number;
  }>;
  metrics?: {
    likes?: number;
    reposts?: number;
    replies?: number;
    quotes?: number;
  };
}

export interface PlayerXTimelinePayload {
  timestamp: number;
  configured: boolean;
  warning?: string;
  players: Array<{ id: string; name?: string; username: string }>;
  items: PlayerXTimelineItem[];
}

export async function fetchPlayerXTimeline(playerIds?: Array<string | number>) {
  const params = new URLSearchParams();
  if (playerIds?.length) params.set("playerIds", playerIds.map(String).join(","));
  const query = params.toString();
  return fetchJson(`/api/player-x-timeline${query ? `?${query}` : ""}`);
}

export async function fetchMyPlayerXTimeline() {
  return fetchJson("/api/me/player-x-timeline");
}

async function fetchJson(path: string) {
  const response = await fetch(`${getUserApiUrl()}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (PlayerXTimelinePayload & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || `x_timeline_failed_${response.status}`);
  return payload as PlayerXTimelinePayload;
}
