import { getBackendApiUrl } from "@/lib/world-cup-api";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import { localizeTeamName } from "@/lib/team-localization";

export const TOP_SCORERS_REFRESH_MS = 60_000;

export type WorldCupTopScorer = {
  id: number;
  name: string;
  photo: string;
  teamName: string;
  teamLogo: string;
  goals: number | null;
  isFallback?: boolean;
};

type TopScorersPayload = {
  scorers?: Array<{
    id?: number | null;
    name?: string;
    nameEn?: string;
    photo?: string;
    team?: {
      name?: string;
      nameEn?: string;
      code?: string;
      logo?: string;
    } | null;
    goals?: number | null;
  }>;
  error?: string;
};

type WorldCupCacheEnvelope<T> = {
  ok: boolean;
  data?: T | null;
  error?: string;
};

export async function fetchWorldCupTopScorers(options: { forceRefresh?: boolean } = {}) {
  const params = new URLSearchParams({
    league: "1",
    season: "2026",
  });
  if (options.forceRefresh) params.set("forceRefresh", String(Date.now()));

  const apiUrl = getBackendApiUrl();
  const cacheUrl = `${apiUrl}/api/worldcup-cache/top-scorers${options.forceRefresh ? "?refresh=1" : ""}`;
  const url = `${apiUrl}/api/worldcup/top-scorers?${params}`;
  const fetchCachedScorers = () => fetchWorldCupCacheData<TopScorersPayload>(cacheUrl, "World Cup cached top scorers");
  const fetchScorers = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
    const payload = (await response.json()) as TopScorersPayload;

    if (!response.ok) {
      throw new Error(payload.error || `World Cup top scorers returned ${response.status}`);
    }

    return payload;
  };

  let payload: TopScorersPayload;

  try {
    payload = options.forceRefresh
      ? await fetchCachedScorers()
      : await cachedJson<TopScorersPayload>(cacheUrl, TOP_SCORERS_REFRESH_MS, fetchCachedScorers);
  } catch {
    payload = options.forceRefresh
      ? await fetchScorers()
      : await cachedJson<TopScorersPayload>(url, TOP_SCORERS_REFRESH_MS, fetchScorers);
  }

  return (payload.scorers ?? [])
    .map((item): WorldCupTopScorer | null => {
      if (!item.id || !item.name) return null;
      const goals = item.goals ?? 0;
      if (goals <= 0) return null;

      return {
        id: item.id,
        name: item.name,
        photo: item.photo ?? "",
        teamName: localizeTeamName(item.team?.nameEn ?? item.team?.name ?? "国家队", item.team?.code),
        teamLogo: item.team?.logo ?? "",
        goals,
      };
    })
    .filter((item): item is WorldCupTopScorer => Boolean(item));
}

async function fetchWorldCupCacheData<T>(url: string, label: string) {
  const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
  const envelope = (await response.json()) as WorldCupCacheEnvelope<T>;

  if (!response.ok || !envelope.ok || !envelope.data) {
    throw new Error(envelope.error || `${label} returned ${response.status}`);
  }

  return envelope.data;
}

export const fallbackTopScorerProfiles: WorldCupTopScorer[] = [
  {
    id: 278,
    name: "基利安·姆巴佩",
    photo: "https://media.api-sports.io/football/players/278.png",
    teamName: "法国",
    teamLogo: "https://media.api-sports.io/football/teams/2.png",
    goals: null,
    isFallback: true,
  },
  {
    id: 386828,
    name: "拉明·亚马尔",
    photo: "https://media.api-sports.io/football/players/386828.png",
    teamName: "西班牙",
    teamLogo: "https://media.api-sports.io/football/teams/9.png",
    goals: null,
    isFallback: true,
  },
  {
    id: 762,
    name: "维尼修斯",
    photo: "https://media.api-sports.io/football/players/762.png",
    teamName: "巴西",
    teamLogo: "https://media.api-sports.io/football/teams/6.png",
    goals: null,
    isFallback: true,
  },
  {
    id: 1100,
    name: "埃尔林·哈兰德",
    photo: "https://media.api-sports.io/football/players/1100.png",
    teamName: "挪威",
    teamLogo: "https://media.api-sports.io/football/teams/1090.png",
    goals: null,
    isFallback: true,
  },
  {
    id: 154,
    name: "利昂内尔·梅西",
    photo: "https://media.api-sports.io/football/players/154.png",
    teamName: "阿根廷",
    teamLogo: "https://media.api-sports.io/football/teams/26.png",
    goals: null,
    isFallback: true,
  },
];
