import type { CountryData } from "./types";
import type { HistoryBuffer } from "./historyBuffer";

export interface DeltaEngine {
  computeDeltas: (current: CountryData[]) => CountryData[];
}

export function createDeltaEngine(history: HistoryBuffer): DeltaEngine {
  return {
    computeDeltas(current) {
      const now = Date.now();
      return current.map((country) => {
        const prev1m = history.getSnapshot(now - 60_000);
        const prev5m = history.getSnapshot(now - 300_000);
        const prev1h = history.getSnapshot(now - 3_600_000);
        const prev24h = history.getSnapshot(now - 86_400_000);

        return {
          ...country,
          delta1m: computeDelta(country, prev1m?.get(country.countryCode)),
          delta5m: computeDelta(country, prev5m?.get(country.countryCode)),
          delta1h: computeDelta(country, prev1h?.get(country.countryCode)),
          delta24h: computeDelta(country, prev24h?.get(country.countryCode)),
        };
      });
    },
  };
}

function computeDelta(
  current: CountryData,
  previous?: { probability: number }
): number {
  if (!previous) return 0;
  return current.impliedProbability - previous.probability;
}
