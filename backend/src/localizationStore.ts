import fs from "fs";
import path from "path";

export type LocalizationCategory =
  | "players"
  | "clubs"
  | "leagues"
  | "positions"
  | "countries"
  | "transferTypes"
  | "trophyPlaces"
  | "injuryTypes"
  | "birthPlaces";

type LocalizationStore = Record<LocalizationCategory, Record<string, string>>;

const CATEGORY_FILES: Record<LocalizationCategory, string> = {
  players: "players.json",
  clubs: "clubs.json",
  leagues: "leagues.json",
  positions: "positions.json",
  countries: "countries.json",
  transferTypes: "transfer-types.json",
  trophyPlaces: "trophy-places.json",
  injuryTypes: "injury-types.json",
  birthPlaces: "birth-places.json",
};

const EMPTY_STORE: LocalizationStore = {
  players: {},
  clubs: {},
  leagues: {},
  positions: {},
  countries: {},
  transferTypes: {},
  trophyPlaces: {},
  injuryTypes: {},
  birthPlaces: {},
};

let cachedStore: LocalizationStore | null = null;
let missingWriteTimer: ReturnType<typeof setTimeout> | null = null;

export function getLocalizationStore() {
  if (cachedStore) return cachedStore;

  cachedStore = { ...EMPTY_STORE };
  for (const [category, file] of Object.entries(CATEGORY_FILES) as Array<[LocalizationCategory, string]>) {
    cachedStore[category] = readJson<Record<string, string>>(path.join(getLocalizationDir(), file), {});
  }
  return cachedStore;
}

export function translate(category: LocalizationCategory, key: string | number | null | undefined) {
  const normalized = String(key ?? "").trim();
  if (!normalized) return "";

  const value = getLocalizationStore()[category][normalized];
  if (!value) recordMissingLocalization(category, normalized, normalized);
  return value ?? normalized;
}

export function recordMissingLocalization(category: LocalizationCategory, key: string, label = key) {
  const normalized = key.trim();
  if (!normalized) return;

  const store = getLocalizationStore();
  if (store[category][normalized]) return;

  const missingPath = path.join(getLocalizationDir(), "missing.json");
  const missing = readJson<LocalizationStore>(missingPath, { ...EMPTY_STORE });
  if (missing[category]?.[normalized]) return;

  missing[category] = missing[category] ?? {};
  missing[category][normalized] = label;

  if (missingWriteTimer) clearTimeout(missingWriteTimer);
  missingWriteTimer = setTimeout(() => {
    try {
      fs.mkdirSync(getLocalizationDir(), { recursive: true });
      fs.writeFileSync(missingPath, `${JSON.stringify(missing, null, 2)}\n`, "utf8");
    } catch {
      // Ignore write failures in read-only deployments.
    }
  }, 100);
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function getLocalizationDir() {
  const fromBackend = path.resolve(process.cwd(), "../data/localization");
  if (fs.existsSync(fromBackend)) return fromBackend;
  return path.resolve(process.cwd(), "data/localization");
}
