import clubs from "@/data/localization/clubs.json";
import countries from "@/data/localization/countries.json";
import { getOfficialPlayerCatalog } from "@/lib/official-player-catalog";

const CLUB_TRANSLATIONS = clubs as Record<string, string>;
const COUNTRY_TRANSLATIONS = countries as Record<string, string>;
const PLAYER_NAME_BY_KEY = buildPlayerNameMap();

export function localizeClubName(value: string | null | undefined) {
  return localizeText(value, CLUB_TRANSLATIONS);
}

export function localizeCountryName(value: string | null | undefined) {
  return localizeText(value, COUNTRY_TRANSLATIONS);
}

export function localizePlayerDisplayName(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (/[\u3400-\u9fff]/.test(normalized)) return normalized;
  return PLAYER_NAME_BY_KEY.get(normalizePlayerKey(normalized)) ?? normalized;
}

function localizeText(value: string | null | undefined, translations: Record<string, string>) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (/[\u3400-\u9fff]/.test(normalized)) return normalized;
  return translations[normalized] ?? normalized;
}

function buildPlayerNameMap() {
  const map = new Map<string, string>();
  for (const player of getOfficialPlayerCatalog()) {
    const displayName = player.nameCn || player.nameEn;
    for (const alias of [player.nameEn, player.nameCn, ...player.aliases]) {
      const key = normalizePlayerKey(alias);
      if (key && displayName) map.set(key, displayName);
    }
  }
  return map;
}

function normalizePlayerKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "")
    .trim();
}
