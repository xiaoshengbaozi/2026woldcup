import { detailRows, extractCity, localizeLocationText } from "@/lib/calendar";
import { generateMatchRouteSlug, generateMatchSlug } from "@/lib/match-detail";
import { parseTeams } from "@/lib/teams";
import type { UserSessionPayload } from "@/lib/user-system";
import type { Match, Team } from "@/types/match";

export type FavoritePreference = UserSessionPayload["user"]["favoriteMatches"][number];

export type FavoriteMatchCard = {
  id: string;
  title: string;
  stage: string;
  startsAt?: string;
  location: string;
  city: string;
  href: string;
  sourceMatch?: Match;
  home: Team;
  away: Team;
  tag: string;
};

const FEATURED_TEAM_KEYWORDS = [
  "Argentina",
  "Brazil",
  "France",
  "England",
  "Spain",
  "Portugal",
  "United States",
  "Mexico",
];

const FLAG_TO_TEAM_CODE: Record<string, string> = {
  ar: "ARG",
  at: "AUT",
  au: "AUS",
  ba: "BIH",
  be: "BEL",
  br: "BRA",
  ca: "CAN",
  cd: "COD",
  ch: "SUI",
  ci: "CIV",
  co: "COL",
  cv: "CPV",
  cw: "CUW",
  cz: "CZE",
  de: "GER",
  dz: "ALG",
  ec: "ECU",
  eg: "EGY",
  es: "ESP",
  fr: "FRA",
  "gb-eng": "ENG",
  "gb-sct": "SCO",
  gh: "GHA",
  hr: "CRO",
  ht: "HAI",
  iq: "IRQ",
  ir: "IRN",
  it: "ITA",
  jo: "JOR",
  jp: "JPN",
  kr: "KOR",
  ma: "MAR",
  mx: "MEX",
  nl: "NED",
  no: "NOR",
  nz: "NZL",
  pa: "PAN",
  pt: "POR",
  py: "PAR",
  qa: "QAT",
  sa: "SAU",
  se: "SWE",
  sn: "SEN",
  tn: "TUN",
  tr: "TUR",
  us: "USA",
  uy: "URU",
  uz: "UZB",
  za: "RSA",
};

export function buildFavoriteMatchCards(home: UserSessionPayload | null | undefined, scheduleMatches: Match[]) {
  const saved = home?.user.favoriteMatches ?? [];
  if (saved.length) {
    return saved
      .map((favorite) => favoritePreferenceToCard(favorite, scheduleMatches))
      .sort((a, b) => getFavoriteMatchSortTime(a) - getFavoriteMatchSortTime(b));
  }

  return getDefaultFavoriteMatches(scheduleMatches).map((match, index) =>
    matchToFavoriteCard(match, index === 0 ? "主收藏" : "推荐收藏")
  );
}

export function matchToFavoriteCard(match: Match, tag = "收藏"): FavoriteMatchCard {
  const teams = parseTeams(match.summary);
  const venue = detailRows(match).find((detail) => detail.type === "venue")?.text || localizeLocationText(match.location);

  return {
    id: match.uid,
    title: normalizeFavoriteMatchTitle(match.summary),
    stage: match.stage,
    startsAt: match.start.toISOString(),
    location: venue,
    city: extractCity(match.location),
    href: `/matches/${generateMatchRouteSlug(match)}`,
    sourceMatch: match,
    home: teams.home,
    away: teams.away,
    tag,
  };
}

export function favoritePreferenceToCard(favorite: FavoritePreference, scheduleMatches: Match[]): FavoriteMatchCard {
  const matched = findScheduleMatch(favorite, scheduleMatches);
  if (matched) return matchToFavoriteCard(matched, "已收藏");

  const teams = parseTeams(favorite.title);
  return {
    id: favorite.id,
    title: normalizeFavoriteMatchTitle(favorite.title),
    stage: favorite.stage || "收藏赛程",
    startsAt: favorite.startsAt,
    location: "球场待公布",
    city: "TBD",
    href: `/matches/${generateMatchSlug(favorite.title)}`,
    home: teams.home,
    away: teams.away,
    tag: "已收藏",
  };
}

export function getFavoriteTeamCode(team: Team) {
  const flagCode = team.image.match(/flagcdn\.com\/([^/.]+)\./)?.[1];
  if (flagCode && FLAG_TO_TEAM_CODE[flagCode]) return FLAG_TO_TEAM_CODE[flagCode];
  if (/^[A-Z]{2,4}$/.test(team.badge)) return team.badge;
  return team.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase() || "TBD";
}

export function getFavoriteMatchSortTime(match: FavoriteMatchCard) {
  if (!match.startsAt) return Number.MAX_SAFE_INTEGER;
  const value = new Date(match.startsAt).getTime();
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export function normalizeFavoriteMatchTitle(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s*（[^）]*）\s*$/, "").trim();
}

export function compactFavoriteMatchStage(stage: string) {
  if (/group|\u5c0f\u7ec4\u8d5b/i.test(stage)) return "\u5c0f\u7ec4\u8d5b";
  return stage.replace("Round of 32", "32\u5f3a").replace("Round of 16", "16\u5f3a");
}

export function formatFavoriteVenueLine(match: FavoriteMatchCard) {
  const venue = stripVenueCity(match.location || "\u7403\u573a\u5f85\u5b9a");
  const city = normalizeDisplayCity(match.city);
  const country = getHostCountry(city);
  return [venue, city, country].filter(Boolean).join(" \u00b7 ");
}

function stripVenueCity(location: string) {
  return location
    .replace(/\s*[\uFF08(][^\uFF08\uFF09()]+[\uFF09)]\s*$/, "")
    .replace(/\s*[\u00B7,\uFF0C]\s*[^\u00B7,\uFF0C]+$/, "")
    .trim();
}

function normalizeDisplayCity(city: string) {
  return city && city !== "TBD" ? city : "";
}

function getHostCountry(city: string) {
  if (!city) return "";
  if (["\u591a\u4f26\u591a", "\u6e29\u54e5\u534e", "Toronto", "Vancouver"].includes(city)) return "\u52a0\u62ff\u5927";
  if (["\u58a8\u897f\u54e5\u57ce", "\u74dc\u8fbe\u62c9\u54c8\u62c9", "\u8499\u7279\u96f7", "Mexico City", "Guadalajara", "Monterrey"].includes(city)) return "\u58a8\u897f\u54e5";
  return "\u7f8e\u56fd";
}

function findScheduleMatch(favorite: FavoritePreference, scheduleMatches: Match[]) {
  const direct = scheduleMatches.find((match) => match.uid === favorite.id);
  if (direct) return direct;

  const favoriteTitle = normalizeFavoriteMatchTitle(favorite.title);
  const favoriteStart = favorite.startsAt ? new Date(favorite.startsAt).getTime() : NaN;

  return scheduleMatches.find((match) => {
    if (normalizeFavoriteMatchTitle(match.summary) !== favoriteTitle) return false;
    if (!Number.isFinite(favoriteStart)) return true;
    return Math.abs(match.start.getTime() - favoriteStart) < 60_000;
  });
}

function getDefaultFavoriteMatches(scheduleMatches: Match[]) {
  const now = Date.now();
  const upcoming = scheduleMatches
    .filter((match) => match.start.getTime() >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const featured = upcoming.filter((match) => {
    const text = [match.summary, match.homeTeam?.name, match.awayTeam?.name, match.homeTeam?.englishName, match.awayTeam?.englishName].join(" ");
    return FEATURED_TEAM_KEYWORDS.some((keyword) => text.includes(keyword));
  });

  return (featured.length ? featured : upcoming.length ? upcoming : scheduleMatches).slice(0, 5);
}
