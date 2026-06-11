import type { StateCreator } from "zustand";
import type { CountryData } from "@/types/country";
import type { StoreState } from "./index";

export interface RankingEntry {
  countryCode: string;
  rank: number;
  previousRank: number;
  probability: number;
  delta1h: number;
  volume24h: number;
}

export interface SqueezePair {
  countryA: string;
  countryB: string;
  gap: number;       // probability difference
  threshold: number; // below this → squeeze active
}

export interface RankingsSlice {
  rankings: RankingEntry[];
  squeezePairs: SqueezePair[];
  vibrationTriggers: string[];  // countryCodes that just changed >1%
  sortMode: "probability" | "momentum";

  recomputeRankings: () => void;
  scheduleRankingsRecompute: () => void;
  triggerVibration: (countryCode: string) => void;
  clearVibration: (countryCode: string) => void;
  setSortMode: (mode: "probability" | "momentum") => void;
}

const SQUEEZE_THRESHOLD = 2.0; // percentage points
const RANKING_RECOMPUTE_DELAY_MS = 180;

let rankingRecomputeTimer: ReturnType<typeof setTimeout> | null = null;

function areRankingsEqual(a: RankingEntry[], b: RankingEntry[]) {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const next = a[i];
    const prev = b[i];
    if (
      next.countryCode !== prev.countryCode ||
      next.rank !== prev.rank ||
      next.previousRank !== prev.previousRank ||
      next.probability !== prev.probability ||
      next.delta1h !== prev.delta1h ||
      next.volume24h !== prev.volume24h
    ) {
      return false;
    }
  }

  return true;
}

function areSqueezePairsEqual(a: SqueezePair[], b: SqueezePair[]) {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (
      a[i].countryA !== b[i].countryA ||
      a[i].countryB !== b[i].countryB ||
      a[i].gap !== b[i].gap ||
      a[i].threshold !== b[i].threshold
    ) {
      return false;
    }
  }

  return true;
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const createRankingsSlice: StateCreator<
  StoreState, [], [], RankingsSlice
> = (set, get) => ({
  rankings: [],
  squeezePairs: [],
  vibrationTriggers: [],
  sortMode: "probability",

  recomputeRankings: () => {
    const { countries, sortMode } = get();
    const arr = Array.from(countries.values());

    const sorted = [...arr].sort((a, b) => {
      switch (sortMode) {
        case "momentum":
          return Math.abs(b.delta1h) - Math.abs(a.delta1h);
        default:
          return b.impliedProbability - a.impliedProbability;
      }
    });

    const prevMap = new Map(get().rankings.map((r) => [r.countryCode, r.rank]));

    const rankings: RankingEntry[] = sorted.map((c, i) => ({
      countryCode: c.countryCode,
      rank: i + 1,
      previousRank: prevMap.get(c.countryCode) ?? i + 1,
      probability: c.impliedProbability,
      delta1h: c.delta1h,
      volume24h: c.volume24h,
    }));

    // Detect squeeze pairs
    const squeezePairs: SqueezePair[] = [];
    for (let i = 0; i < rankings.length - 1; i++) {
      const gap = Math.abs(
        rankings[i].probability - rankings[i + 1].probability
      );
      if (gap < SQUEEZE_THRESHOLD) {
        squeezePairs.push({
          countryA: rankings[i].countryCode,
          countryB: rankings[i + 1].countryCode,
          gap,
          threshold: SQUEEZE_THRESHOLD,
        });
      }
    }

    // Detect vibrations (>1% change since last recompute)
    const prevRankings = get().rankings;
    const prevProbMap = new Map(
      prevRankings.map((r) => [r.countryCode, r.probability])
    );
    const newTriggers: string[] = [];
    for (const r of rankings) {
      const prev = prevProbMap.get(r.countryCode);
      if (prev !== undefined && Math.abs(r.probability - prev) > 1) {
        newTriggers.push(r.countryCode);
      }
    }

    const current = get();
    if (
      areRankingsEqual(rankings, current.rankings) &&
      areSqueezePairsEqual(squeezePairs, current.squeezePairs) &&
      areStringArraysEqual(newTriggers, current.vibrationTriggers)
    ) {
      return;
    }

    set({ rankings, squeezePairs, vibrationTriggers: newTriggers });
  },

  scheduleRankingsRecompute: () => {
    if (rankingRecomputeTimer) return;

    rankingRecomputeTimer = setTimeout(() => {
      rankingRecomputeTimer = null;
      get().recomputeRankings();
    }, RANKING_RECOMPUTE_DELAY_MS);
  },

  triggerVibration: (countryCode) => {
    set((state) => ({
      vibrationTriggers: [...state.vibrationTriggers, countryCode],
    }));
  },

  clearVibration: (countryCode) => {
    set((state) => ({
      vibrationTriggers: state.vibrationTriggers.filter(
        (c) => c !== countryCode
      ),
    }));
  },

  setSortMode: (mode) => {
    if (rankingRecomputeTimer) {
      clearTimeout(rankingRecomputeTimer);
      rankingRecomputeTimer = null;
    }
    set({ sortMode: mode });
    get().recomputeRankings();
  },
});
