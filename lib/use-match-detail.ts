"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { generateMatchSlug, findMatchBySlug } from "@/lib/match-detail";
import { generateMatchDetail } from "@/lib/match-detail-mock";
import { fetchWorldCupHeadToHead } from "@/lib/world-cup-head-to-head";
import { fetchWorldCupSquads } from "@/lib/world-cup-squads";
import type { HeadToHeadMatch, LineupPlayer } from "@/types/match";
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
  const { matches, loading, error } = useWorldCupData();
  const [remoteSquads, setRemoteSquads] = useState<Map<number, LineupPlayer[]> | null>(null);
  const [remoteHeadToHead, setRemoteHeadToHead] = useState<HeadToHeadMatch[] | null>(null);

  const match = useMemo(() => {
    if (loading || error || !matches.length) return null;
    return findMatchBySlug(matches, slug) ?? null;
  }, [matches, loading, error, slug]);

  useEffect(() => {
    let active = true;
    setRemoteSquads(null);

    const teamIds = [match?.homeTeam?.id, match?.awayTeam?.id].filter(
      (id): id is number => typeof id === "number" && id > 0
    );

    if (!teamIds.length) return;

    fetchWorldCupSquads(teamIds)
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

    const homeSquad = match.homeTeam?.id ? remoteSquads?.get(match.homeTeam.id) : null;
    const awaySquad = match.awayTeam?.id ? remoteSquads?.get(match.awayTeam.id) : null;
    if (match.homeTeam?.id) {
      enriched.homeLineup = {
        formation: "候选大名单",
        players: homeSquad ?? [],
        listType: "squad_pool",
        officialWorldCupSquad: false,
      };
    }
    if (match.awayTeam?.id) {
      enriched.awayLineup = {
        formation: "候选大名单",
        players: awaySquad ?? [],
        listType: "squad_pool",
        officialWorldCupSquad: false,
      };
    }
    if (match.homeTeam?.id && match.awayTeam?.id) {
      enriched.headToHead = remoteHeadToHead ?? [];
    }

    return enriched;
  }, [match, remoteHeadToHead, remoteSquads, slug]);

  return {
    detail,
    loading,
    error: error || (!loading && !detail && matches.length > 0 ? "未找到该比赛" : null),
  };
}
