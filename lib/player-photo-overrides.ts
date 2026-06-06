const PLAYER_PHOTO_OVERRIDES: Record<string, string> = {
  "304229": "https://img.a.transfermarkt.technology/portrait/big/534398-1692797432.jpg?lm=1",
};

export function getPlayerPhoto(playerId: string | number | null | undefined, fallback = "") {
  if (playerId == null || playerId === "") return fallback;
  return PLAYER_PHOTO_OVERRIDES[String(playerId)] || fallback;
}

export function getApiSportsPlayerPhoto(playerId: string | number | null | undefined) {
  if (playerId == null || playerId === "") return "";
  return getPlayerPhoto(playerId, `https://media.api-sports.io/football/players/${playerId}.png`);
}
