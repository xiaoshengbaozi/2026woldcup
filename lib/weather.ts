import type { Match } from "@/types/match";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";

export type WeatherState = {
  temp?: number;
  code?: number;
  error?: boolean;
};

export function weatherKey(match: Match) {
  return match.geo ? `${match.geo.lat},${match.geo.lon}` : match.uid;
}

export function weatherIcon(code?: number) {
  if (code === undefined) return "天气";
  if ([0, 1].includes(code)) return "晴";
  if ([2].includes(code)) return "少云";
  if ([3].includes(code)) return "多云";
  if ([45, 48].includes(code)) return "有雾";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "有雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "有雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天气";
}

export function weatherLabel(data?: WeatherState) {
  if (!data) return "天气同步中";
  if (data.error) return "天气暂不可用";
  return `${weatherIcon(data.code)} ${Math.round(data.temp ?? 0)}°C`;
}

type OpenMeteoCurrentResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

export async function fetchCurrentWeather(match: Match): Promise<WeatherState> {
  if (!match.geo) return { error: true };

  return cachedJson(
    `weather:${weatherKey(match)}`,
    15 * 60 * 1000,
    async () => {
      const params = new URLSearchParams({
        latitude: String(match.geo?.lat),
        longitude: String(match.geo?.lon),
        current: "temperature_2m,weather_code",
        timezone: "auto",
      });
      const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`, {}, 6_000);
      if (!response.ok) throw new Error("weather fetch failed");

      const data = (await response.json()) as OpenMeteoCurrentResponse;
      const temp = data.current?.temperature_2m;
      const code = data.current?.weather_code;
      if (typeof temp !== "number" || typeof code !== "number") throw new Error("weather payload incomplete");

      return { temp, code };
    },
    { persist: true, staleTtlMs: 12 * 60 * 60 * 1000 }
  ).catch(() => ({ error: true }));
}
