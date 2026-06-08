const PLAYER_PHOTO_OVERRIDES: Record<string, string> = {
  "304229": "https://img.a.transfermarkt.technology/portrait/big/534398-1692797432.jpg?lm=1",
};

const BLANK_API_SPORTS_PLAYER_PHOTO_IDS = new Set([
  "163908",
  "542710",
  "542768",
  "542822",
  "568556",
  "575283",
  "651096",
  "664028",
]);

export function hasKnownBlankPlayerPhoto(playerId: string | number | null | undefined) {
  if (playerId == null || playerId === "") return false;
  return BLANK_API_SPORTS_PLAYER_PHOTO_IDS.has(String(playerId));
}

export function getPlayerPhoto(playerId: string | number | null | undefined, fallback = "") {
  if (playerId == null || playerId === "") return fallback;
  if (hasKnownBlankPlayerPhoto(playerId)) return "";
  return PLAYER_PHOTO_OVERRIDES[String(playerId)] || fallback;
}

export function getApiSportsPlayerPhoto(playerId: string | number | null | undefined) {
  if (playerId == null || playerId === "") return "";
  return getPlayerPhoto(playerId, `https://media.api-sports.io/football/players/${playerId}.png`);
}
