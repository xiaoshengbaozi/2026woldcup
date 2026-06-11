import { getTeamCodeFromName } from "@/lib/team-localization";
import type { MatchLineEvent, MatchLineMarket } from "@/types/messages";

export type OddsSelectionTarget = {
  homeTeamCode: string;
  awayTeamCode: string;
};

export type OddsSelection = {
  event: MatchLineEvent | null;
  markets: MatchLineMarket[];
  source: "api" | "unavailable";
  updatedAt: number | null;
};

export function buildOddsSelectionForTeams(
  target: OddsSelectionTarget,
  events: MatchLineEvent[],
  timestamp: number | null,
): OddsSelection {
  const event = findMatchingEvent(target, events);
  if (event) {
    const markets = pickMoneyline(target, event);
    if (markets.length >= 3) {
      return { event, markets: markets.slice(0, 3), source: "api", updatedAt: timestamp };
    }
  }

  return {
    event: null,
    markets: [],
    source: "unavailable",
    updatedAt: null,
  };
}

export function sameOddsMarket(a?: MatchLineMarket | null, b?: MatchLineMarket | null) {
  return Boolean(a && b && a.id === b.id);
}

export function normalizeOddsTeamCode(code?: string) {
  return (code ?? "").trim().toUpperCase();
}

function findMatchingEvent(target: OddsSelectionTarget, events: MatchLineEvent[]) {
  const homeCode = normalizeOddsTeamCode(target.homeTeamCode);
  const awayCode = normalizeOddsTeamCode(target.awayTeamCode);

  return events.find((event) => {
    const eventHomeCode = normalizeOddsTeamCode(getTeamCodeFromName(event.homeTeam));
    const eventAwayCode = normalizeOddsTeamCode(getTeamCodeFromName(event.awayTeam));
    return (
      (eventHomeCode === homeCode && eventAwayCode === awayCode) ||
      (eventHomeCode === awayCode && eventAwayCode === homeCode)
    );
  });
}

function pickMoneyline(target: OddsSelectionTarget, event: MatchLineEvent) {
  const markets = event.markets.filter((market) => market.marketType === "moneyline");
  const home = findMarketByCode(markets, target.homeTeamCode);
  const draw = markets.find((market) => normalizeText(market.label) === "draw");
  const away = findMarketByCode(markets, target.awayTeamCode);
  const ordered = [home, draw, away].filter((market): market is MatchLineMarket => Boolean(market));

  return ordered.length >= 3 ? ordered : markets.slice(0, 3);
}

function findMarketByCode(markets: MatchLineMarket[], code: string) {
  const normalizedCode = normalizeOddsTeamCode(code);
  return markets.find((market) => normalizeOddsTeamCode(getTeamCodeFromName(market.label)) === normalizedCode);
}

function normalizeText(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}
