import { getBackendApiUrl } from "@/lib/world-cup-api";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";

type ApiFootballPayload<T> = {
  upstream?: {
    response?: T;
    results?: number;
  };
  error?: string;
};

type WorldCupCacheEnvelope<T> = {
  ok: boolean;
  data?: T | null;
  error?: string;
};

type ApiPlayer = {
  id: number;
  name: string;
  nameCn?: string;
  nameEn?: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  birth?: {
    date?: string;
    place?: string;
    country?: string;
  };
  nationality?: string;
  height?: string;
  weight?: string;
  number?: number | null;
  position?: string;
  injured?: boolean;
  photo?: string;
};

type PlayerStatistics = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  league?: {
    id?: number;
    name?: string;
    country?: string;
    season?: number;
    logo?: string;
  };
  games?: {
    appearences?: number | null;
    lineups?: number | null;
    minutes?: number | null;
    position?: string | null;
    rating?: string | null;
  };
  goals?: {
    total?: number | null;
    assists?: number | null;
  };
  shots?: {
    total?: number | null;
    on?: number | null;
  };
  passes?: {
    total?: number | null;
    key?: number | null;
    accuracy?: number | null;
  };
  tackles?: {
    total?: number | null;
    interceptions?: number | null;
  };
  cards?: {
    yellow?: number | null;
    red?: number | null;
  };
};

type PlayerSeasonItem = {
  player?: ApiPlayer;
  statistics?: PlayerStatistics[];
};

type PlayerProfileItem = {
  player?: ApiPlayer;
};

type TransferItem = {
  date?: string;
  type?: string;
  teams?: {
    in?: { id?: number; name?: string; logo?: string };
    out?: { id?: number; name?: string; logo?: string };
  };
};

type TransferResponse = {
  update?: string;
  transfers?: TransferItem[];
};

type TrophyItem = {
  league?: string;
  country?: string;
  season?: string;
  place?: string;
};

type SidelinedItem = {
  type?: string;
  start?: string;
  end?: string;
};

export type PlayerProfileData = {
  player: ApiPlayer | null;
  currentTeam: PlayerStatistics["team"] | null;
  currentSeason: number | null;
  seasonStats: PlayerStatistics[];
  transfers: TransferItem[];
  trophies: TrophyItem[];
  sidelined: SidelinedItem[];
};

export async function fetchApiFootballPlayerProfileData(playerId: string): Promise<PlayerProfileData> {
  const apiUrl = getBackendApiUrl();
  const cacheUrl = `${apiUrl}/api/worldcup-cache/player-profile?player=${encodeURIComponent(playerId)}&season=2025`;
  const url = `${apiUrl}/api/worldcup/player-profile?player=${playerId}&season=2025`;
  const fetchProfile = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
    const payload = (await response.json()) as PlayerProfileData & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `World Cup player profile returned ${response.status}`);
    }

    return payload;
  };

  let payload: PlayerProfileData & { error?: string };

  try {
    payload = await cachedJson<PlayerProfileData & { error?: string }>(
      cacheUrl,
      24 * 60 * 60 * 1000,
      () => fetchWorldCupCacheData<PlayerProfileData>(cacheUrl, "World Cup cached player profile"),
      { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 }
    );
  } catch {
    payload = await cachedJson<PlayerProfileData & { error?: string }>(url, 24 * 60 * 60 * 1000, fetchProfile, { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 });
  }

  return payload;
}

export async function fetchPlayerProfileData(playerId: string): Promise<PlayerProfileData> {
  return fetchApiFootballPlayerProfileData(playerId);
}

async function getApiFootball<T>(url: string) {
  const payload = await cachedJson<ApiFootballPayload<T>>(url, 24 * 60 * 60 * 1000, async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
    const payload = (await response.json()) as ApiFootballPayload<T>;
    if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
    return payload;
  }, { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 });
  return payload.upstream?.response ?? ([] as T);
}

async function fetchWorldCupCacheData<T>(url: string, label: string) {
  const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
  const envelope = (await response.json()) as WorldCupCacheEnvelope<T>;

  if (!response.ok || !envelope.ok || !envelope.data) {
    throw new Error(envelope.error || `${label} returned ${response.status}`);
  }

  return envelope.data;
}

function valueOr<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : null;
}

function findCurrentTeam(stats: PlayerStatistics[]) {
  const scored = stats
    .filter((item) => item.team?.id)
    .map((item) => ({
      team: item.team ?? null,
      minutes: item.games?.minutes ?? 0,
      appearances: item.games?.appearences ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes || b.appearances - a.appearances);

  return scored[0]?.team ?? null;
}
