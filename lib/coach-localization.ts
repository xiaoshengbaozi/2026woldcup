import coachTranslations from "@/data/localization/coaches.json";

const COACH_TRANSLATIONS = coachTranslations as Record<string, string>;

export function localizeCoachName(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (hasChinese(normalized)) return normalized;

  return (
    COACH_TRANSLATIONS[normalized] ??
    COACH_TRANSLATIONS[normalized.replace(/\s+/g, " ")] ??
    COACH_TRANSLATIONS[removeAccents(normalized)] ??
    normalized
  );
}

function hasChinese(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
