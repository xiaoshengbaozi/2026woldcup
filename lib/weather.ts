import type { Match } from "@/types/match";

export type WeatherState = {
  temp?: number;
  code?: number;
  error?: boolean;
};

export function weatherKey(match: Match) {
  return match.geo ? `${match.geo.lat},${match.geo.lon}` : match.uid;
}

export function weatherIcon(code?: number) {
  if (code === undefined) return "HUD";
  if ([0, 1].includes(code)) return "SUN";
  if ([2].includes(code)) return "HAZE";
  if ([3, 45, 48].includes(code)) return "CLD";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "RAIN";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "SNOW";
  if ([95, 96, 99].includes(code)) return "STORM";
  return "WX";
}

export function weatherLabel(data?: WeatherState) {
  if (!data) return "SYNC";
  if (data.error) return "OFFLINE";
  return `${weatherIcon(data.code)} ${Math.round(data.temp ?? 0)}°C`;
}
