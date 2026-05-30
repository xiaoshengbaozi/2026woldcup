import type { ChartEvent, CountryData } from "./types";

export interface EventDetector {
  detect: (previous: Map<string, CountryData>, current: CountryData[]) => ChartEvent[];
}

const THRESHOLD_CHANGE = 5.0; // percentage points
const SPIKE_VOLUME_RATIO = 3; // 3x normal volume

export function createEventDetector(): EventDetector {
  let eventCounter = 0;

  return {
    detect(previous, current) {
      const events: ChartEvent[] = [];

      for (const country of current) {
        const prev = previous.get(country.countryCode);
        if (!prev) continue;

        const probChange = Math.abs(country.impliedProbability - prev.impliedProbability);
        if (probChange >= THRESHOLD_CHANGE) {
          events.push({
            id: `evt-threshold-${++eventCounter}`,
            timestamp: Date.now(),
            type: "threshold",
            title: `${country.countryName} probability moved sharply`,
            description: `${country.countryName} moved from ${prev.impliedProbability.toFixed(1)}% to ${country.impliedProbability.toFixed(1)}%`,
            severity: probChange >= 10 ? "high" : "medium",
            affectedCountries: [country.countryCode],
            source: "auto",
          });
        }

        if (prev.volume5m > 0 && country.volume5m > prev.volume5m * SPIKE_VOLUME_RATIO) {
          events.push({
            id: `evt-volume-${++eventCounter}`,
            timestamp: Date.now(),
            type: "volume_spike",
            title: `${country.countryName} volume spike`,
            description: `5-minute volume reached $${(country.volume5m / 1000).toFixed(1)}K`,
            severity: "medium",
            affectedCountries: [country.countryCode],
            source: "auto",
          });
        }
      }

      return events;
    },
  };
}
