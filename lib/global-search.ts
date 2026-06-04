import playerArticles from "@/data/player-articles.json";
import { qualifiedTeams } from "@/data/teams";
import { generateMatchSlug } from "@/lib/match-detail";
import type { Match } from "@/types/match";

export type SearchCategory = "teams" | "players" | "matches" | "news";

export type SearchNewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  image?: string;
  publishedAt?: string;
  tags?: string[];
};

export type SearchResultItem = {
  id: string;
  type: SearchCategory;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  image?: string;
  external?: boolean;
  tokens: string;
};

export type SearchResults = Record<SearchCategory, SearchResultItem[]>;

export const searchTabs: { id: SearchCategory; label: string }[] = [
  { id: "teams", label: "球队" },
  { id: "players", label: "球员" },
  { id: "matches", label: "赛程" },
  { id: "news", label: "新闻" },
];

export function buildGlobalSearchResults(query: string, matches: Match[] = [], news: SearchNewsItem[] = []): SearchResults {
  const normalizedQuery = normalizeSearchText(query);
  const allResults = {
    teams: buildTeamResults(),
    players: buildPlayerResults(),
    matches: buildMatchResults(matches),
    news: buildNewsResults(news),
  };

  if (!normalizedQuery) return allResults;

  return {
    teams: filterResults(allResults.teams, normalizedQuery),
    players: filterResults(allResults.players, normalizedQuery),
    matches: filterResults(allResults.matches, normalizedQuery),
    news: filterResults(allResults.news, normalizedQuery),
  };
}

export function getTotalSearchCount(results: SearchResults) {
  return searchTabs.reduce((total, tab) => total + results[tab.id].length, 0);
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function filterResults(items: SearchResultItem[], normalizedQuery: string) {
  return items.filter((item) => item.tokens.includes(normalizedQuery));
}

function buildTeamResults(): SearchResultItem[] {
  return qualifiedTeams.map((team) => ({
    id: team.slug,
    type: "teams",
    title: team.nameCn,
    eyebrow: `${team.code} · ${team.confederation}`,
    description: team.nameEn,
    href: team.detailHref,
    image: team.cover,
    tokens: makeTokens(team.nameCn, team.nameEn, team.code, team.confederation),
  }));
}

function buildPlayerResults(): SearchResultItem[] {
  return playerArticles.players.map((player) => ({
    id: String(player.apiPlayerId || player.id),
    type: "players",
    title: player.nameCn || player.nameEn,
    eyebrow: [player.teamCode, player.category === "wonderkids" ? "新星" : "球星"].filter(Boolean).join(" · "),
    description: player.nameEn || player.excerpt || player.teams || "",
    href: `/players/${player.apiPlayerId || player.id}/`,
    image: player.photo,
    tokens: makeTokens(player.nameCn, player.nameEn, player.countryCn, player.countryEn, player.teamCode, player.teams, player.title),
  }));
}

function buildMatchResults(matches: Match[]): SearchResultItem[] {
  return matches.map((match) => {
    const start = formatMatchStart(match.start);
    return {
      id: match.uid,
      type: "matches",
      title: match.summary,
      eyebrow: [match.stage, start].filter(Boolean).join(" · "),
      description: match.location || match.description,
      href: `/matches/${generateMatchSlug(match.summary)}/`,
      tokens: makeTokens(match.summary, match.stage, match.location, match.description, start, match.homeTeam?.name, match.awayTeam?.name, match.homeTeam?.englishName, match.awayTeam?.englishName),
    };
  });
}

function buildNewsResults(news: SearchNewsItem[]): SearchResultItem[] {
  return news.map((item) => ({
    id: item.id || item.url,
    type: "news",
    title: item.title,
    eyebrow: [item.source, item.publishedAt ? formatNewsDate(item.publishedAt) : ""].filter(Boolean).join(" · "),
    description: item.summary,
    href: item.url,
    image: item.image,
    external: true,
    tokens: makeTokens(item.title, item.summary, item.source, ...(item.tags ?? [])),
  }));
}

function makeTokens(...values: Array<string | number | null | undefined>) {
  return normalizeSearchText(values.filter(Boolean).join(" "));
}

function formatMatchStart(date: Date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNewsDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}
