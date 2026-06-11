import { qualifiedTeams } from "@/data/teams";
import { getTeamCodeFromName } from "@/lib/team-localization";

const CODE_ALIASES: Record<string, string> = {
  ALG: "DZA",
  KSA: "SAU",
  PRY: "PAR",
  CUR: "CUW",
};

const FLAG_CODE_TO_TEAM_CODE: Record<string, string> = {
  ar: "ARG",
  au: "AUS",
  at: "AUT",
  be: "BEL",
  ba: "BIH",
  br: "BRA",
  ca: "CAN",
  cv: "CPV",
  co: "COL",
  hr: "CRO",
  cw: "CUW",
  cz: "CZE",
  cd: "COD",
  ec: "ECU",
  eg: "EGY",
  "gb-eng": "ENG",
  fr: "FRA",
  de: "GER",
  gh: "GHA",
  ht: "HAI",
  ir: "IRN",
  iq: "IRQ",
  ci: "CIV",
  jp: "JPN",
  jo: "JOR",
  kr: "KOR",
  mx: "MEX",
  ma: "MAR",
  nl: "NED",
  nz: "NZL",
  no: "NOR",
  pa: "PAN",
  py: "PAR",
  pt: "POR",
  qa: "QAT",
  sa: "SAU",
  "gb-sct": "SCO",
  sn: "SEN",
  za: "RSA",
  es: "ESP",
  se: "SWE",
  ch: "SUI",
  tn: "TUN",
  tr: "TUR",
  us: "USA",
  uy: "URU",
  uz: "UZB",
};

const teamHrefByCode = new Map(qualifiedTeams.map((team) => [team.code, team.detailHref]));

export function getTeamDetailHrefByCode(code?: string | null) {
  if (!code) return "";
  const normalized = code.trim();
  if (!normalized) return "";

  const upper = normalized.toUpperCase();
  const teamCode = CODE_ALIASES[upper] ?? upper;
  const href = teamHrefByCode.get(teamCode);
  if (href) return href;

  const flagTeamCode = FLAG_CODE_TO_TEAM_CODE[normalized.toLowerCase()];
  return flagTeamCode ? teamHrefByCode.get(flagTeamCode) ?? "" : "";
}

export function getTeamDetailHrefByName(name?: string | null) {
  if (!name) return "";
  const code = getTeamCodeFromName(name);
  return getTeamDetailHrefByCode(code);
}
