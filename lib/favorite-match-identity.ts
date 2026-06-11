export type FavoriteMatchIdentity = {
  id?: string | number | null;
  matchId?: string | number | null;
  title?: string | null;
  startsAt?: string | null;
};

export function getFavoriteMatchIds(match: FavoriteMatchIdentity) {
  return [match.id, match.matchId]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

export function sameFavoriteMatch(left: FavoriteMatchIdentity, right: FavoriteMatchIdentity) {
  const leftIds = new Set(getFavoriteMatchIds(left));
  if (getFavoriteMatchIds(right).some((id) => leftIds.has(id))) return true;

  const leftKey = getFavoriteMatchComparableKey(left);
  const rightKey = getFavoriteMatchComparableKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function getFavoriteMatchComparableKey(match: FavoriteMatchIdentity) {
  const title = normalizeFavoriteMatchTitle(match.title);
  const start = normalizeFavoriteMatchStart(match.startsAt);
  return title && start ? `${title}|${start}` : "";
}

export function normalizeFavoriteMatchTitle(value?: string | null) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim()
    .toLowerCase();
}

function normalizeFavoriteMatchStart(value?: string | null) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  return String(Math.floor(timestamp / 60_000));
}
