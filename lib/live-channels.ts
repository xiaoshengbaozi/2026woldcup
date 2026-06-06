import { getBackendApiUrl } from "@/lib/world-cup-api";

export type LiveChannel = {
  id: string;
  matchId: string;
  matchIds?: string[];
  matchType?: "official" | "warmup";
  name: string;
  platform: string;
  streamUrl: string;
  isActive: boolean;
  sortOrder: number;
  note?: string;
  updatedAt: string;
};

export async function fetchLiveChannels(matchId: string) {
  const response = await fetch(`${getBackendApiUrl()}/api/live-channels?matchId=${encodeURIComponent(matchId)}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as { channels?: LiveChannel[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `Live channels returned ${response.status}`);
  }

  return payload.channels ?? [];
}
