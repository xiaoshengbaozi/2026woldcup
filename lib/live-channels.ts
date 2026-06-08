import { getBackendApiUrl } from "@/lib/world-cup-api";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";

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
  const url = `${getBackendApiUrl()}/api/live-channels?matchId=${encodeURIComponent(matchId)}`;
  const payload = await cachedJson<{ channels?: LiveChannel[]; error?: string }>(url, 5 * 60 * 1000, async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 5_000);
    const payload = (await response.json()) as { channels?: LiveChannel[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `Live channels returned ${response.status}`);
    }

    return payload;
  }, { persist: true, staleTtlMs: 24 * 60 * 60 * 1000 });

  return payload.channels ?? [];
}
