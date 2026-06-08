"use client";

import { motion } from "framer-motion";
import { Sparkles, Table } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GROUPS, getTeamByCode } from "@/data/world-cup-2026-groups";
import { getStageGroupId } from "@/lib/stage";
import { getTeamDetailHrefByCode, getTeamDetailHrefByName } from "@/lib/team-links";
import { parseTeams } from "@/lib/teams";
import { userApi, type PublicUser } from "@/lib/user-system";
import { fetchWorldCupStandings, type NormalizedWorldCupStandingRow } from "@/lib/world-cup-api";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { Match, Team } from "@/types/match";

type GroupStandingsProps = {
  matches: Match[];
};

type PredictionArchive = PublicUser["predictionArchives"][number];
type PredictionScore = { home: number; away: number } | null;

type StandingTeam = Team & {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor?: number;
  goalDifference?: number;
};

type GroupStanding = {
  id: string;
  label: string;
  teams: StandingTeam[];
};

const preferredGroups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const LAST_PREDICTION_ARCHIVE_KEY = "worldcup-last-prediction-archive-id";

export function GroupStandings({ matches }: GroupStandingsProps) {
  const [remoteStandings, setRemoteStandings] = useState<NormalizedWorldCupStandingRow[]>([]);
  const [archives, setArchives] = useState<PredictionArchive[]>([]);
  const [activeArchiveId, setActiveArchiveId] = useState<string>("official");

  useEffect(() => {
    let active = true;

    fetchWorldCupStandings()
      .then((standings) => {
        if (active) setRemoteStandings(standings);
      })
      .catch((error) => {
        console.warn("[GroupStandings] standings unavailable, falling back to fixtures:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadArchives = useCallback(async (preferredArchiveId?: string | null) => {
    try {
      const payload = await userApi<{ archives: PredictionArchive[] }>("/api/me/prediction-archives", { cache: "no-store" });
      const nextArchives = payload.archives ?? [];
      setArchives(nextArchives);

      const savedArchiveId = preferredArchiveId ?? window.localStorage.getItem(LAST_PREDICTION_ARCHIVE_KEY);
      if (savedArchiveId && nextArchives.some((archive) => archive.id === savedArchiveId)) {
        setActiveArchiveId(savedArchiveId);
      }
    } catch {
      setArchives([]);
    }
  }, []);

  useEffect(() => {
    void loadArchives();

    const handleArchiveUpdate = (event: Event) => {
      const archiveId = (event as CustomEvent<{ archiveId?: string }>).detail?.archiveId;
      void loadArchives(archiveId);
    };
    const handleWindowFocus = () => void loadArchives();

    window.addEventListener("prediction-archives-updated", handleArchiveUpdate);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("prediction-archives-updated", handleArchiveUpdate);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadArchives]);

  const activeArchive = archives.find((archive) => archive.id === activeArchiveId) ?? null;
  const fallbackGroups = useMemo(() => buildGroupStandings(matches), [matches]);
  const apiGroups = useMemo(() => buildApiGroupStandings(remoteStandings), [remoteStandings]);
  const seedGroups = useMemo(() => buildSeedGroupStandings(), []);
  const officialGroups = apiGroups.length ? apiGroups : fallbackGroups.length ? fallbackGroups : seedGroups;
  const archiveGroups = useMemo(
    () => (activeArchive ? buildPredictionGroupStandings(activeArchive.groupScores) : []),
    [activeArchive]
  );
  const groups = activeArchive ? archiveGroups : officialGroups;
  const visibleGroups = preferredGroups
    .map((id) => groups.find((group) => group.id === id))
    .filter((group): group is GroupStanding => Boolean(group));

  if (!visibleGroups.length && !archives.length) return null;

  return (
    <motion.section
      id="groups"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.74, ease: [0.16, 1, 0.3, 1] }}
      className="hero-card overflow-hidden px-3 py-4 sm:px-4"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />
      <div className="absolute right-0 top-0 h-24 w-72 bg-volt/10 blur-[90px]" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 px-2 pb-3 sm:px-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-volt" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
              小组积分榜
            </h2>
          </div>

          {archives.length > 0 && (
            <div className="flex max-w-full flex-wrap items-center gap-1.5">
              <StandingTab active={!activeArchive} onClick={() => {
                window.localStorage.removeItem(LAST_PREDICTION_ARCHIVE_KEY);
                setActiveArchiveId("official");
              }}>
                官方
              </StandingTab>
              {archives.map((archive) => (
                <StandingTab
                  key={archive.id}
                  active={archive.id === activeArchiveId}
                  onClick={() => {
                    window.localStorage.setItem(LAST_PREDICTION_ARCHIVE_KEY, archive.id);
                    setActiveArchiveId(archive.id);
                  }}
                >
                  {`预测：${archive.name}`}
                </StandingTab>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/predict"
          className="group inline-flex items-center gap-1.5 rounded-full bg-volt/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-volt ring-1 ring-volt/20 transition hover:bg-volt hover:text-black hover:shadow-[0_0_24px_rgba(216,255,62,0.24)]"
        >
          <Sparkles className="h-3.5 w-3.5 transition group-hover:scale-110" />
          我要预测
        </Link>
      </div>

      {visibleGroups.length ? (
        <div className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleGroups.map((group) => (
            <GroupTable key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="relative rounded-2xl bg-black/20 px-4 py-8 text-center text-xs text-white/38 ring-1 ring-white/[0.07] backdrop-blur-2xl">
          这个存档还没有小组赛比分，先去预测页填几场。
        </div>
      )}
    </motion.section>
  );
}

function StandingTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`max-w-[160px] truncate rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 transition ${
        active
          ? "bg-volt text-black ring-volt/40 shadow-[0_0_24px_rgba(216,255,62,.16)]"
          : "bg-white/[0.045] text-white/55 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
      }`}
      title={children}
    >
      {children}
    </button>
  );
}

function GroupTable({ group }: { group: GroupStanding }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,.075)] ring-1 ring-white/[0.07] backdrop-blur-2xl">
      <div className="grid grid-cols-[minmax(120px,1fr)_28px_28px_28px_28px_36px] items-center px-4 py-3 text-[10px] uppercase tracking-[0.08em] text-white/52">
        <span className="text-left">{group.label}</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="text-right">PTS</span>
      </div>

      <div className="divide-y divide-white/[0.025]">
        {group.teams.map((team, index) => (
          <StandingRow
            key={`${group.id}-${team.name}`}
            team={team}
            index={index}
          />
        ))}
      </div>
    </article>
  );
}

function StandingRow({ team, index }: { team: StandingTeam; index: number }) {
  const href = getTeamDetailHrefByCode(teamCode(team)) || getTeamDetailHrefByName(team.name);
  const teamContent = (
    <>
      <span className={`tabular w-4 shrink-0 text-xs font-semibold ${index < 2 ? "text-volt" : "text-white/45"}`}>
        {index + 1}
      </span>
      <span className="grid h-4 w-6 shrink-0 place-items-center overflow-hidden rounded-[3px] bg-white/10 ring-1 ring-white/10">
        {team.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.image} alt="" className="h-full w-full object-cover object-center" loading="lazy" />
        ) : (
          <span className="text-[8px] font-semibold text-volt">{team.badge}</span>
        )}
      </span>
      <span className="truncate text-xs font-semibold uppercase text-white transition-colors group-hover/team:text-volt">
        {team.name}
      </span>
    </>
  );

  return (
    <div className="grid grid-cols-[minmax(120px,1fr)_28px_28px_28px_28px_36px] items-center px-4 py-2 text-sm transition odd:bg-volt/[0.035] hover:bg-white/[0.045]">
      {href ? (
        <Link href={href} className="group/team flex min-w-0 items-center justify-start gap-2.5 text-left">
          {teamContent}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center justify-start gap-2.5 text-left">
          {teamContent}
        </div>
      )}
      <span className="tabular text-center text-xs text-white/78">{team.played}</span>
      <span className="tabular text-center text-xs text-white/78">{team.won}</span>
      <span className="tabular text-center text-xs text-white/78">{team.drawn}</span>
      <span className="tabular text-center text-xs text-white/78">{team.lost}</span>
      <span className={`tabular text-right text-xs font-semibold ${team.points > 0 ? "text-flare" : "text-volt"}`}>
        {team.points}
      </span>
    </div>
  );
}

function buildApiGroupStandings(rows: NormalizedWorldCupStandingRow[]): GroupStanding[] {
  const grouped = rows.reduce<Map<string, NormalizedWorldCupStandingRow[]>>((acc, row) => {
    const id = getApiGroupId(row.group);
    if (!id) return acc;
    if (!acc.has(id)) acc.set(id, []);
    acc.get(id)?.push(row);
    return acc;
  }, new Map());

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, items]) => ({
      id,
      label: `${id} 组`,
      teams: items
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 4)
        .map((row) => ({
          badge: row.team.code || String(row.rank),
          badgeType: row.team.code ? "image" : "code",
          image: row.team.code ? getFlagUrl(normalizeFlagCode(row.team.code), 40) : "",
          name: row.team.name,
          played: row.played,
          won: row.win,
          drawn: row.draw,
          lost: row.lose,
          points: row.points,
        })),
    }));
}

function buildPredictionGroupStandings(scores: Record<string, PredictionScore>): GroupStanding[] {
  return GROUPS.map((group) => ({
    id: group.id,
    label: `${group.id} 组`,
    teams: computePredictionStandings(group.id, scores),
  })).filter((group) => group.teams.some((team) => team.played > 0));
}

function buildSeedGroupStandings(): GroupStanding[] {
  return GROUPS.map((group) => ({
    id: group.id,
    label: `${group.id} 组`,
    teams: group.teams.map((item) => ({
      badge: item.code,
      badgeType: "image",
      image: getFlagUrl(item.code, 40),
      name: item.nameCn || item.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
    })),
  }));
}

function computePredictionStandings(groupId: string, scores: Record<string, PredictionScore>): StandingTeam[] {
  const group = GROUPS.find((item) => item.id === groupId);
  if (!group) return [];

  const rows = new Map<string, StandingTeam>();
  for (const item of group.teams) {
    rows.set(item.code, {
      badge: item.code,
      badgeType: "image",
      image: getFlagUrl(item.code, 40),
      name: item.nameCn || item.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      goalsFor: 0,
      goalDifference: 0,
    });
  }

  for (const match of group.matches) {
    const score = scores[match.id];
    if (!score) continue;

    const home = rows.get(match.homeTeamCode);
    const away = rows.get(match.awayTeamCode);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor = (home.goalsFor ?? 0) + score.home;
    away.goalsFor = (away.goalsFor ?? 0) + score.away;
    home.goalDifference = (home.goalDifference ?? 0) + score.home - score.away;
    away.goalDifference = (away.goalDifference ?? 0) + score.away - score.home;

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
      home.points++;
      away.points++;
    }
  }

  return [...rows.entries()]
    .map(([code, row]) => {
      const team = getTeamByCode(code);
      return { ...row, name: team?.nameCn || team?.name || row.name };
    })
    .sort((a, b) =>
      b.points - a.points ||
      (b.goalDifference ?? 0) - (a.goalDifference ?? 0) ||
      (b.goalsFor ?? 0) - (a.goalsFor ?? 0) ||
      b.won - a.won ||
      a.name.localeCompare(b.name)
    )
    .slice(0, 4);
}

function normalizeFlagCode(code: string) {
  const upper = code.toUpperCase();
  if (upper === "ALG") return "DZA";
  if (upper === "KSA") return "SAU";
  return upper;
}

function getApiGroupId(group: string) {
  const match = group.match(/^([A-L])\s*组?/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function buildGroupStandings(matches: Match[]): GroupStanding[] {
  const groupMatches = matches.filter((match) => getStageGroupId(match.stage));
  const grouped = groupMatches.reduce<Map<string, Match[]>>((acc, match) => {
    const id = getStageGroupId(match.stage);
    if (!id) return acc;
    if (!acc.has(id)) acc.set(id, []);
    acc.get(id)?.push(match);
    return acc;
  }, new Map());

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, items]) => ({
      id,
      label: `${id} 组`,
      teams: collectTeams(items)
    }));
}

function collectTeams(matches: Match[]): StandingTeam[] {
  const teams = new Map<string, StandingTeam>();

  matches.forEach((match) => {
    const parsed = parseTeams(match.summary);
    [parsed.home, parsed.away].forEach((team) => {
      if (!teams.has(team.name)) {
        teams.set(team.name, {
          ...team,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0
        });
      }
    });
  });

  return [...teams.values()].slice(0, 4);
}

function teamCode(team: Team) {
  const code = team.image.split("/").pop()?.split(".")[0] ?? "";

  return (
    countryCodes[code] ??
    team.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase() ??
    team.badge
  );
}

const countryCodes: Record<string, string> = {
  mx: "MEX",
  za: "RSA",
  kr: "KOR",
  cz: "CZE",
  ca: "CAN",
  ba: "BIH",
  us: "USA",
  ar: "ARG",
  au: "AUS",
  be: "BEL",
  br: "BRA",
  cm: "CMR",
  cl: "CHI",
  cn: "CHN",
  co: "COL",
  cr: "CRC",
  hr: "CRO",
  dk: "DEN",
  ec: "ECU",
  eg: "EGY",
  es: "ESP",
  fr: "FRA",
  de: "GER",
  gh: "GHA",
  gr: "GRE",
  ht: "HAI",
  hu: "HUN",
  is: "ISL",
  in: "IND",
  ir: "IRN",
  iq: "IRQ",
  ie: "IRL",
  it: "ITA",
  jm: "JAM",
  jp: "JPN",
  jo: "JOR",
  ke: "KEN",
  kw: "KUW",
  lb: "LIB",
  ma: "MAR",
  nl: "NED",
  nz: "NZL",
  ng: "NGA",
  mk: "MKD",
  no: "NOR",
  pa: "PAN",
  pl: "POL",
  pt: "POR",
  qa: "QAT",
  ro: "ROU",
  sa: "KSA",
  sn: "SEN",
  rs: "SRB",
  sk: "SVK",
  si: "SVN",
  ch: "SUI",
  tn: "TUN",
  tr: "TUR",
  ua: "UKR",
  uy: "URU",
  vz: "VEN",
};
