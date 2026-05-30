import { motion } from "framer-motion";
import { ArrowRight, Table } from "lucide-react";
import { useMemo } from "react";
import { getStageGroupId } from "@/lib/stage";
import { parseTeams } from "@/lib/teams";
import type { Match, Team } from "@/types/match";

type GroupStandingsProps = {
  matches: Match[];
};

type StandingTeam = Team & {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
};

type GroupStanding = {
  id: string;
  label: string;
  teams: StandingTeam[];
};

const preferredGroups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function GroupStandings({ matches }: GroupStandingsProps) {
  const groups = useMemo(() => buildGroupStandings(matches), [matches]);
  const visibleGroups = preferredGroups
    .map((id) => groups.find((group) => group.id === id))
    .filter((group): group is GroupStanding => Boolean(group));

  if (!visibleGroups.length) return null;

  return (
    <motion.section
      id="groups"
      initial={{ opacity: 0, y: 18, filter: "blur(16px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: 0.28, duration: 0.74, ease: [0.16, 1, 0.3, 1] }}
      className="hero-card overflow-hidden px-3 py-4 sm:px-4"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />
      <div className="absolute right-0 top-0 h-24 w-72 bg-volt/10 blur-[90px]" />

      <div className="relative flex items-center justify-between gap-4 px-2 pb-3 sm:px-3">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-volt" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            小组积分榜
          </h2>
        </div>
        <a
          href="/matches/"
          className="group inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 transition hover:text-volt"
        >
          查看全部
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleGroups.map((group) => (
          <GroupTable key={group.id} group={group} />
        ))}
      </div>
    </motion.section>
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
          <div
            key={`${group.id}-${team.name}`}
            className="grid grid-cols-[minmax(120px,1fr)_28px_28px_28px_28px_36px] items-center px-4 py-2 text-sm transition odd:bg-volt/[0.035] hover:bg-white/[0.045]"
          >
            <div className="flex min-w-0 items-center justify-start gap-2.5 text-left">
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
              <span className="truncate text-xs font-semibold uppercase text-white">
                {team.name}
              </span>
            </div>
            <span className="tabular text-center text-xs text-white/78">{team.played}</span>
            <span className="tabular text-center text-xs text-white/78">{team.won}</span>
            <span className="tabular text-center text-xs text-white/78">{team.drawn}</span>
            <span className="tabular text-center text-xs text-white/78">{team.lost}</span>
            <span className={`tabular text-right text-xs font-semibold ${team.points > 0 ? "text-flare" : "text-volt"}`}>
              {team.points}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
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
      label: `${id}组`,
      teams: collectTeams(items, id)
    }));
}

function collectTeams(matches: Match[], groupId: string): StandingTeam[] {
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

  return [...teams.values()]
    .slice(0, 4);
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
  "in": "IND",
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
  "tr": "TUR",
  ua: "UKR",
  uy: "URU",
  vz: "VEN",
};
