import type { StateCreator } from "zustand";
import { GROUPS, getTeamByCode, type GroupTeam } from "@/data/world-cup-2026-groups";

// ── Types ──

export type Score = { home: number; away: number } | null;

export type StandingRow = {
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type KnockoutPick = {
  winnerCode: string;
  homeScore: number;
  awayScore: number;
};

export type BracketSlot = {
  teamCode: string | null;
  sourceLabel: string;
};

export type KnockoutRound = "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type KnockoutMatch = {
  id: string;
  round: KnockoutRound;
  home: BracketSlot;
  away: BracketSlot;
  label: string;
};

export type PredictionPhase = "groups" | "knockout";

export interface PredictionSlice {
  // ── State ──
  phase: PredictionPhase;
  groupScores: Record<string, Score>;
  knockoutPicks: Record<string, KnockoutPick>;
  thirdPlacePicks: Record<string, KnockoutPick>;

  // ── Computed ──
  getGroupStandings: (groupId: string) => StandingRow[];
  getGroupQualifiers: (groupId: string) => { first: string; second: string; third: string | null };
  getAllThirdPlace: () => (StandingRow & { groupId: string })[];
  getBestThirds: () => (StandingRow & { groupId: string })[];
  getKnockoutMatches: () => KnockoutMatch[];
  getChampion: () => string | null;
  getProgress: () => { filled: number; total: number; percent: number };

  // ── Actions ──
  setGroupScore: (matchId: string, home: number, away: number) => void;
  setKnockoutPick: (matchId: string, winnerCode: string, homeScore: number, awayScore: number) => void;
  setPhase: (phase: PredictionPhase) => void;
  resetAll: () => void;
  autoFillRandom: () => void;
}

// ── Helpers ──

function computeStandings(
  groupId: string,
  scores: Record<string, Score>
): StandingRow[] {
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) return [];

  const rows = new Map<string, StandingRow>();
  for (const t of group.teams) {
    rows.set(t.code, {
      teamCode: t.code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const match of group.matches) {
    const score = scores[match.id];
    if (!score) continue;

    const home = rows.get(match.homeTeamCode)!;
    const away = rows.get(match.awayTeamCode)!;

    home.played++;
    away.played++;
    home.goalsFor += score.home;
    home.goalsAgainst += score.away;
    away.goalsFor += score.away;
    away.goalsAgainst += score.home;

    if (score.home > score.away) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (score.home < score.away) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGD = a.goalsFor - a.goalsAgainst;
    const bGD = b.goalsFor - b.goalsAgainst;
    if (bGD !== aGD) return bGD - aGD;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });

  return sorted.map((r) => ({ ...r, goalDifference: r.goalsFor - r.goalsAgainst }));
}

function sortThirdPlace(
  allStandings: Map<string, StandingRow[]>
): (StandingRow & { groupId: string })[] {
  const thirds: (StandingRow & { groupId: string })[] = [];
  for (const [gid, rows] of allStandings) {
    if (rows.length >= 3) {
      thirds.push({ ...rows[2], groupId: gid });
    }
  }
  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });
}

// Build the knockout bracket from group qualifiers
function buildKnockoutMatches(
  groupScores: Record<string, Score>,
  knockoutPicks: Record<string, KnockoutPick>,
  bestThirdGroupIds: string[]
): KnockoutMatch[] {
  // Get all group standings
  const standingsMap = new Map<string, StandingRow[]>();
  for (const g of GROUPS) {
    standingsMap.set(g.id, computeStandings(g.id, groupScores));
  }

  // Only return qualifiers if the group has at least one scored match
  const groupHasScores = (gid: string) => {
    const g = GROUPS.find((x) => x.id === gid);
    if (!g) return false;
    return g.matches.some((m) => groupScores[m.id] != null);
  };
  const get1st = (gid: string) => groupHasScores(gid) ? (standingsMap.get(gid)?.[0]?.teamCode ?? null) : null;
  const get2nd = (gid: string) => groupHasScores(gid) ? (standingsMap.get(gid)?.[1]?.teamCode ?? null) : null;
  const get3rd = (gid: string) => groupHasScores(gid) ? (standingsMap.get(gid)?.[2]?.teamCode ?? null) : null;

  // Build a resolved pick map: picks that were made, with resolved teams
  const resolved = (matchId: string) => knockoutPicks[matchId]?.winnerCode ?? null;

  // R32 matches (16 matches)
  const r32: KnockoutMatch[] = [
    // Bracket A (top-left): 1A vs 2B, 1C vs 2D, 1E vs 2F, 1G vs 2H
    { id: "R32-1", round: "r32", home: { teamCode: get1st("A"), sourceLabel: "1A" }, away: { teamCode: get2nd("B"), sourceLabel: "2B" }, label: "R32 #1" },
    { id: "R32-2", round: "r32", home: { teamCode: get1st("C"), sourceLabel: "1C" }, away: { teamCode: get2nd("D"), sourceLabel: "2D" }, label: "R32 #2" },
    { id: "R32-3", round: "r32", home: { teamCode: get1st("E"), sourceLabel: "1E" }, away: { teamCode: get2nd("F"), sourceLabel: "2F" }, label: "R32 #3" },
    { id: "R32-4", round: "r32", home: { teamCode: get1st("G"), sourceLabel: "1G" }, away: { teamCode: get2nd("H"), sourceLabel: "2H" }, label: "R32 #4" },
    // Bracket B (top-right): 1B vs 2A, 1D vs 2C, 1F vs 2E, 1H vs 2G
    { id: "R32-5", round: "r32", home: { teamCode: get1st("B"), sourceLabel: "1B" }, away: { teamCode: get2nd("A"), sourceLabel: "2A" }, label: "R32 #5" },
    { id: "R32-6", round: "r32", home: { teamCode: get1st("D"), sourceLabel: "1D" }, away: { teamCode: get2nd("C"), sourceLabel: "2C" }, label: "R32 #6" },
    { id: "R32-7", round: "r32", home: { teamCode: get1st("F"), sourceLabel: "1F" }, away: { teamCode: get2nd("E"), sourceLabel: "2E" }, label: "R32 #7" },
    { id: "R32-8", round: "r32", home: { teamCode: get1st("H"), sourceLabel: "1H" }, away: { teamCode: get2nd("G"), sourceLabel: "2G" }, label: "R32 #8" },
    // Bracket C (bottom-left): 1I vs 2J, 1K vs 2L + 2 third-place matches
    { id: "R32-9", round: "r32", home: { teamCode: get1st("I"), sourceLabel: "1I" }, away: { teamCode: get2nd("J"), sourceLabel: "2J" }, label: "R32 #9" },
    { id: "R32-10", round: "r32", home: { teamCode: get1st("K"), sourceLabel: "1K" }, away: { teamCode: get2nd("L"), sourceLabel: "2L" }, label: "R32 #10" },
    // Third-place slots (simplified: top 2 best thirds from left bracket groups)
    { id: "R32-11", round: "r32", home: { teamCode: get3rd(bestThirdGroupIds[0] ?? "A"), sourceLabel: `3${bestThirdGroupIds[0] ?? "A"}` }, away: { teamCode: get3rd(bestThirdGroupIds[1] ?? "B"), sourceLabel: `3${bestThirdGroupIds[1] ?? "B"}` }, label: "R32 #11" },
    { id: "R32-12", round: "r32", home: { teamCode: get3rd(bestThirdGroupIds[2] ?? "C"), sourceLabel: `3${bestThirdGroupIds[2] ?? "C"}` }, away: { teamCode: get3rd(bestThirdGroupIds[3] ?? "D"), sourceLabel: `3${bestThirdGroupIds[3] ?? "D"}` }, label: "R32 #12" },
    // Bracket D (bottom-right): 1J vs 2I, 1L vs 2K + 2 third-place matches
    { id: "R32-13", round: "r32", home: { teamCode: get1st("J"), sourceLabel: "1J" }, away: { teamCode: get2nd("I"), sourceLabel: "2I" }, label: "R32 #13" },
    { id: "R32-14", round: "r32", home: { teamCode: get1st("L"), sourceLabel: "1L" }, away: { teamCode: get2nd("K"), sourceLabel: "2K" }, label: "R32 #14" },
    { id: "R32-15", round: "r32", home: { teamCode: get3rd(bestThirdGroupIds[4] ?? "E"), sourceLabel: `3${bestThirdGroupIds[4] ?? "E"}` }, away: { teamCode: get3rd(bestThirdGroupIds[5] ?? "F"), sourceLabel: `3${bestThirdGroupIds[5] ?? "F"}` }, label: "R32 #15" },
    { id: "R32-16", round: "r32", home: { teamCode: get3rd(bestThirdGroupIds[6] ?? "G"), sourceLabel: `3${bestThirdGroupIds[6] ?? "G"}` }, away: { teamCode: get3rd(bestThirdGroupIds[7] ?? "H"), sourceLabel: `3${bestThirdGroupIds[7] ?? "H"}` }, label: "R32 #16" },
  ];

  // R16 (8 matches) — winners from R32 feed in
  const r16: KnockoutMatch[] = [
    { id: "R16-1", round: "r16", home: { teamCode: resolved("R32-1"), sourceLabel: "W R32#1" }, away: { teamCode: resolved("R32-2"), sourceLabel: "W R32#2" }, label: "1/8 #1" },
    { id: "R16-2", round: "r16", home: { teamCode: resolved("R32-3"), sourceLabel: "W R32#3" }, away: { teamCode: resolved("R32-4"), sourceLabel: "W R32#4" }, label: "1/8 #2" },
    { id: "R16-3", round: "r16", home: { teamCode: resolved("R32-5"), sourceLabel: "W R32#5" }, away: { teamCode: resolved("R32-6"), sourceLabel: "W R32#6" }, label: "1/8 #3" },
    { id: "R16-4", round: "r16", home: { teamCode: resolved("R32-7"), sourceLabel: "W R32#7" }, away: { teamCode: resolved("R32-8"), sourceLabel: "W R32#8" }, label: "1/8 #4" },
    { id: "R16-5", round: "r16", home: { teamCode: resolved("R32-9"), sourceLabel: "W R32#9" }, away: { teamCode: resolved("R32-10"), sourceLabel: "W R32#10" }, label: "1/8 #5" },
    { id: "R16-6", round: "r16", home: { teamCode: resolved("R32-11"), sourceLabel: "W R32#11" }, away: { teamCode: resolved("R32-12"), sourceLabel: "W R32#12" }, label: "1/8 #6" },
    { id: "R16-7", round: "r16", home: { teamCode: resolved("R32-13"), sourceLabel: "W R32#13" }, away: { teamCode: resolved("R32-14"), sourceLabel: "W R32#14" }, label: "1/8 #7" },
    { id: "R16-8", round: "r16", home: { teamCode: resolved("R32-15"), sourceLabel: "W R32#15" }, away: { teamCode: resolved("R32-16"), sourceLabel: "W R32#16" }, label: "1/8 #8" },
  ];

  // QF (4 matches)
  const qf: KnockoutMatch[] = [
    { id: "QF-1", round: "qf", home: { teamCode: resolved("R16-1"), sourceLabel: "W R16#1" }, away: { teamCode: resolved("R16-2"), sourceLabel: "W R16#2" }, label: "1/4 #1" },
    { id: "QF-2", round: "qf", home: { teamCode: resolved("R16-3"), sourceLabel: "W R16#3" }, away: { teamCode: resolved("R16-4"), sourceLabel: "W R16#4" }, label: "1/4 #2" },
    { id: "QF-3", round: "qf", home: { teamCode: resolved("R16-5"), sourceLabel: "W R16#5" }, away: { teamCode: resolved("R16-6"), sourceLabel: "W R16#6" }, label: "1/4 #3" },
    { id: "QF-4", round: "qf", home: { teamCode: resolved("R16-7"), sourceLabel: "W R16#7" }, away: { teamCode: resolved("R16-8"), sourceLabel: "W R16#8" }, label: "1/4 #4" },
  ];

  // SF (2 matches)
  const sf: KnockoutMatch[] = [
    { id: "SF-1", round: "sf", home: { teamCode: resolved("QF-1"), sourceLabel: "W QF#1" }, away: { teamCode: resolved("QF-2"), sourceLabel: "W QF#2" }, label: "半决赛 1" },
    { id: "SF-2", round: "sf", home: { teamCode: resolved("QF-3"), sourceLabel: "W QF#3" }, away: { teamCode: resolved("QF-4"), sourceLabel: "W QF#4" }, label: "半决赛 2" },
  ];

  // Third-place match
  const third: KnockoutMatch[] = [
    { id: "THIRD", round: "third", home: { teamCode: resolved("SF-1") ? (knockoutPicks["SF-1"]?.winnerCode === resolved("SF-1") ? getOtherTeam("SF-1", knockoutPicks, sf) : resolved("SF-1")) : null, sourceLabel: "L SF#1" }, away: { teamCode: resolved("SF-2") ? (knockoutPicks["SF-2"]?.winnerCode === resolved("SF-2") ? getOtherTeam("SF-2", knockoutPicks, sf) : resolved("SF-2")) : null, sourceLabel: "L SF#2" }, label: "三四名决赛" },
  ];

  // Final
  const final: KnockoutMatch[] = [
    { id: "FINAL", round: "final", home: { teamCode: resolved("SF-1"), sourceLabel: "W SF#1" }, away: { teamCode: resolved("SF-2"), sourceLabel: "W SF#2" }, label: "决赛" },
  ];

  return [...r32, ...r16, ...qf, ...sf, ...third, ...final];
}

function getOtherTeam(matchId: string, picks: Record<string, KnockoutPick>, matches: KnockoutMatch[]): string | null {
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;
  const winner = picks[matchId]?.winnerCode;
  if (!winner) return null;
  if (match.home.teamCode === winner) return match.away.teamCode;
  return match.home.teamCode;
}

// ── Store Slice ──

export const createPredictionSlice: StateCreator<PredictionSlice> = (set, get) => ({
  phase: "groups",
  groupScores: {},
  knockoutPicks: {},
  thirdPlacePicks: {},

  getGroupStandings: (groupId: string) => {
    return computeStandings(groupId, get().groupScores);
  },

  getGroupQualifiers: (groupId: string) => {
    const standings = computeStandings(groupId, get().groupScores);
    return {
      first: standings[0]?.teamCode ?? "",
      second: standings[1]?.teamCode ?? "",
      third: standings[2]?.teamCode ?? null,
    };
  },

  getAllThirdPlace: () => {
    const standingsMap = new Map<string, StandingRow[]>();
    for (const g of GROUPS) {
      standingsMap.set(g.id, computeStandings(g.id, get().groupScores));
    }
    return sortThirdPlace(standingsMap);
  },

  getBestThirds: () => {
    const all = get().getAllThirdPlace();
    return all.slice(0, 8);
  },

  getKnockoutMatches: () => {
    const bestThirds = get().getBestThirds();
    const bestThirdIds = bestThirds.map((t) => t.groupId);
    return buildKnockoutMatches(get().groupScores, get().knockoutPicks, bestThirdIds);
  },

  getChampion: () => {
    const finalPick = get().knockoutPicks["FINAL"];
    return finalPick?.winnerCode ?? null;
  },

  getProgress: () => {
    const groupTotal = GROUPS.reduce((sum, g) => sum + g.matches.length, 0); // 72
    const knockoutTotal = 32; // 16 + 8 + 4 + 2 + 1 + 1
    const total = groupTotal + knockoutTotal;

    let filled = 0;
    for (const v of Object.values(get().groupScores)) {
      if (v) filled++;
    }
    filled += Object.keys(get().knockoutPicks).length;

    return { filled, total, percent: Math.round((filled / total) * 100) };
  },

  setGroupScore: (matchId, home, away) => {
    set((state) => ({
      groupScores: { ...state.groupScores, [matchId]: { home, away } },
    }));
  },

  setKnockoutPick: (matchId, winnerCode, homeScore, awayScore) => {
    set((state) => ({
      knockoutPicks: {
        ...state.knockoutPicks,
        [matchId]: { winnerCode, homeScore, awayScore },
      },
    }));
  },

  setPhase: (phase) => set({ phase }),

  resetAll: () =>
    set({
      groupScores: {},
      knockoutPicks: {},
      phase: "groups",
    }),

  autoFillRandom: () => {
    const scores: Record<string, Score> = {};
    for (const group of GROUPS) {
      for (const match of group.matches) {
        scores[match.id] = {
          home: Math.floor(Math.random() * 4),
          away: Math.floor(Math.random() * 4),
        };
      }
    }
    set({ groupScores: scores });
  },
});
