import { getBackendApiUrl } from "@/lib/world-cup-api";

type ApiFootballPayload<T> = {
  upstream?: {
    response?: T;
    results?: number;
  };
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

type OneVsOnePayload = {
  found?: boolean;
  url?: string | null;
  player?: {
    name?: string | null;
    birthDate?: string | null;
    nationality?: string | null;
    image?: string | null;
    teamName?: string | null;
    teamUrl?: string | null;
  } | null;
};

export type PlayerProfileData = {
  player: ApiPlayer | null;
  currentTeam: PlayerStatistics["team"] | null;
  currentSeason: number | null;
  seasonStats: PlayerStatistics[];
  transfers: TransferItem[];
  trophies: TrophyItem[];
  sidelined: SidelinedItem[];
  oneVsOne: OneVsOnePayload | null;
};

export async function fetchApiFootballPlayerProfileData(playerId: string): Promise<PlayerProfileData> {
  const apiUrl = getBackendApiUrl();
  const response = await fetch(`${apiUrl}/api/worldcup/player-profile?player=${playerId}&season=2025`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as PlayerProfileData & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `World Cup player profile returned ${response.status}`);
  }

  return { ...payload, oneVsOne: null };
}

export async function fetchOneVsOnePlayerSummary(name: string) {
  if (!name.trim()) return null;
  return getOneVsOne(`${getBackendApiUrl()}/api/player/one-vs-one?name=${encodeURIComponent(name)}`);
}

export async function fetchPlayerProfileData(playerId: string, nameHint?: string): Promise<PlayerProfileData> {
  const data = await fetchApiFootballPlayerProfileData(playerId);
  const player = data.player;
  const fullName = [player?.firstname, player?.lastname].filter(Boolean).join(" ") || player?.name || nameHint || "";
  const oneVsOne = await fetchOneVsOnePlayerSummary(fullName);

  return { ...data, oneVsOne };
}

async function getApiFootball<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as ApiFootballPayload<T>;
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload.upstream?.response ?? ([] as T);
}

async function getOneVsOne(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as OneVsOnePayload;
  } catch {
    return null;
  }
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
