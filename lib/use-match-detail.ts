"use client";

import { useMemo } from "react";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { generateMatchSlug, findMatchBySlug } from "@/lib/match-detail";
import { generateMatchDetail } from "@/lib/match-detail-mock";
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

  const detail = useMemo(() => {
    if (loading || error || !matches.length) return null;

    const match = findMatchBySlug(matches, slug);
    if (!match) return null;

    const enriched = generateMatchDetail(match);
    enriched.slug = slug;

    return enriched;
  }, [matches, loading, error, slug]);

  return {
    detail,
    loading,
    error: error || (!loading && !detail && matches.length > 0 ? "未找到该比赛" : null),
  };
}
