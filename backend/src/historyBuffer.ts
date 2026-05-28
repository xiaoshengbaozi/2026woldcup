import type { HistoryPoint } from "./types";

interface HistoryEntry {
  timestamp: number;
  snapshot: Map<string, HistoryPoint>;
}

export interface HistoryBuffer {
  append: (timestamp: number, data: Map<string, HistoryPoint>) => void;
  getSnapshot: (targetTime: number) => Map<string, HistoryPoint> | null;
  getHistory: (countryCode: string, from: number, to: number) => HistoryPoint[];
}

const MAX_ENTRIES = 8640; // ~24h at 10s intervals

export function createHistoryBuffer(): HistoryBuffer {
  const entries: HistoryEntry[] = [];

  return {
    append(timestamp, data) {
      entries.push({ timestamp, snapshot: data });
      // Prune old entries
      if (entries.length > MAX_ENTRIES) {
        entries.splice(0, entries.length - MAX_ENTRIES);
      }
    },

    getSnapshot(targetTime: number) {
      if (entries.length === 0) return null;

      // Binary search for closest entry
      let lo = 0;
      let hi = entries.length - 1;
      let best = entries[0];

      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const diff = Math.abs(entries[mid].timestamp - targetTime);
        const bestDiff = Math.abs(best.timestamp - targetTime);
        if (diff < bestDiff) best = entries[mid];
        if (entries[mid].timestamp < targetTime) lo = mid + 1;
        else hi = mid - 1;
      }

      // Only return if within 2 minutes
      if (Math.abs(best.timestamp - targetTime) > 120_000) return null;
      return best.snapshot;
    },

    getHistory(countryCode, from, to) {
      const result: HistoryPoint[] = [];
      for (const entry of entries) {
        if (entry.timestamp >= from && entry.timestamp <= to) {
          const pt = entry.snapshot.get(countryCode);
          if (pt) result.push(pt);
        }
      }
      return result;
    },
  };
}
