"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { findMatchBySlug } from "@/lib/match-detail";
import { generateMatchDetail } from "@/lib/match-detail-mock";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import { fetchWorldCupHeadToHead } from "@/lib/world-cup-head-to-head";
import { fetchWorldCupSquadDetails, type WorldCupSquadDetail } from "@/lib/world-cup-squads";
import type { HeadToHeadMatch } from "@/types/match";
import type { MatchDetail } from "@/types/match";

/**
 * Hook to look up match detail by slug.
 * Combines ICS calendar data with enriched mock detail data.
 */
export function useMatchDetail(slug: string): {
  detail: MatchDetail | null;
  loading: boolean;
  error: string | null;
} {
  const { matches, warmupMatches, loading, warmupLoading, error, warmupError } = useWorldCupData();
  const [remoteSquads, setRemoteSquads] = useState<Map<number, WorldCupSquadDetail> | null>(null);
  const [remoteHeadToHead, setRemoteHeadToHead] = useState<HeadToHeadMatch[] | null>(null);
  const isWarmupSlug = slug.startsWith("warmup-");
  const lookupMatches = isWarmupSlug ? warmupMatches : matches;
  const lookupLoading = isWarmupSlug ? warmupLoading : loading;
  const lookupError = isWarmupSlug ? warmupError : error;

  const match = useMemo(() => {
    if (lookupLoading || lookupError || !lookupMatches.length) return null;
    return findMatchBySlug(lookupMatches, slug) ?? null;
  }, [lookupError, lookupLoading, lookupMatches, slug]);

  const roundLabels = useMemo(() => buildMatchRoundLabels(lookupMatches), [lookupMatches]);

  useEffect(() => {
    let active = true;
    setRemoteSquads(null);

    const teamIds = [match?.homeTeam?.id, match?.awayTeam?.id].filter(
      (id): id is number => typeof id === "number" && id > 0
    );

    if (!teamIds.length) return;

    fetchWorldCupSquadDetails(teamIds)
      .then((squads) => {
        if (active) setRemoteSquads(squads);
      })
      .catch((err) => {
        console.warn("[MatchDetail] World Cup squads unavailable:", err);
      });

    return () => {
      active = false;
    };
  }, [match?.awayTeam?.id, match?.homeTeam?.id]);

  useEffect(() => {
    let active = true;
    setRemoteHeadToHead(null);

    if (!match?.homeTeam || !match.awayTeam) return;

    fetchWorldCupHeadToHead(match.homeTeam, match.awayTeam)
      .then((items) => {
        if (active) setRemoteHeadToHead(items);
      })
      .catch((err) => {
        console.warn("[MatchDetail] Head-to-head unavailable:", err);
      });

    return () => {
      active = false;
    };
  }, [match?.awayTeam, match?.homeTeam]);

  const detail = useMemo(() => {
    if (!match) return null;

    const enriched = generateMatchDetail(match);
    enriched.slug = slug;
    const roundLabel = roundLabels.get(match.uid);
    if (roundLabel) {
      enriched.match = { ...enriched.match, stage: roundLabel };
    }

    const homeSquad = match.homeTeam?.id ? remoteSquads?.get(match.homeTeam.id) : null;
    const awaySquad = match.awayTeam?.id ? remoteSquads?.get(match.awayTeam.id) : null;
    if (match.homeTeam?.id) {
      enriched.homeLineup = {
        formation: homeSquad?.officialWorldCupSquad ? "FIFA 官方最终名单" : "FIFA 官方名单待录入",
        players: homeSquad?.players ?? [],
        listType: homeSquad?.listType ?? "squad_pool",
        officialWorldCupSquad: Boolean(homeSquad?.officialWorldCupSquad),
        coach: homeSquad?.coach ?? null,
      };
    }
    if (match.awayTeam?.id) {
      enriched.awayLineup = {
        formation: awaySquad?.officialWorldCupSquad ? "FIFA 官方最终名单" : "FIFA 官方名单待录入",
        players: awaySquad?.players ?? [],
        listType: awaySquad?.listType ?? "squad_pool",
        officialWorldCupSquad: Boolean(awaySquad?.officialWorldCupSquad),
        coach: awaySquad?.coach ?? null,
      };
    }
    if (match.homeTeam?.id && match.awayTeam?.id) {
      enriched.headToHead = remoteHeadToHead ?? [];
    }

    return enriched;
  }, [match, remoteHeadToHead, remoteSquads, roundLabels, slug]);

  return {
    detail,
    loading: lookupLoading,
    error: lookupError || (!lookupLoading && !detail && lookupMatches.length > 0 ? "未找到该比赛" : null),
  };
}
