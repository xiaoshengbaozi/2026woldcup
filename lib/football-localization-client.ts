import clubs from "@/data/localization/clubs.json";
import countries from "@/data/localization/countries.json";

const CLUB_TRANSLATIONS = clubs as Record<string, string>;
const COUNTRY_TRANSLATIONS = countries as Record<string, string>;

export function localizeClubName(value: string | null | undefined) {
  return localizeText(value, CLUB_TRANSLATIONS);
}

export function localizeCountryName(value: string | null | undefined) {
  return localizeText(value, COUNTRY_TRANSLATIONS);
}

function localizeText(value: string | null | undefined, translations: Record<string, string>) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (/[\u3400-\u9fff]/.test(normalized)) return normalized;
  return translations[normalized] ?? normalized;
}
