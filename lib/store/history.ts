import type { StateCreator } from "zustand";
import type { HistoryPoint } from "@/types/country";
import type { StoreState } from "./index";

export type TimeResolution = "raw" | "1m" | "1h" | "1d";
export type TimePreset = "1H" | "24H" | "7D" | "30D";

export interface HistorySlice {
  history: Map<string, HistoryPoint[]>;
  activeTimePreset: TimePreset;
  historyResolution: TimeResolution;

  setHistory: (countryCode: string, data: HistoryPoint[]) => void;
  setAllHistory: (data: Record<string, HistoryPoint[]>) => void;
  appendHistoryPoint: (countryCode: string, point: HistoryPoint) => void;
  appendHistoryPoints: (updates: Array<{ countryCode: string; historyPoint: HistoryPoint }>) => void;
  getHistory: (countryCode: string) => HistoryPoint[];
  setTimePreset: (preset: TimePreset) => void;
}

const PRESET_RESOLUTION: Record<TimePreset, TimeResolution> = {
  "1H": "raw",
  "24H": "1m",
  "7D": "1h",
  "30D": "1d",
};

export const createHistorySlice: StateCreator<
  StoreState, [], [], HistorySlice
> = (set, get) => ({
  history: new Map(),
  activeTimePreset: "24H",
  historyResolution: "1m",

  setHistory: (countryCode, data) => {
    set((state) => {
      const next = new Map(state.history);
      next.set(countryCode, data);
      return { history: next };
    });
  },

  setAllHistory: (data) => {
    set(() => {
      const next = new Map<string, HistoryPoint[]>();
      for (const [countryCode, history] of Object.entries(data)) {
        next.set(countryCode, history);
      }
      return { history: next };
    });
  },

  appendHistoryPoint: (countryCode, point) => {
    if (!point) return;

    set((state) => {
      const next = new Map(state.history);
      const existing = next.get(countryCode) ?? [];
      next.set(countryCode, [...existing, point]);
      return { history: next };
    });
  },

  appendHistoryPoints: (updates) => {
    if (!updates.length) return;

    set((state) => {
      const next = new Map(state.history);
      for (const update of updates) {
        const existing = next.get(update.countryCode) ?? [];
        next.set(update.countryCode, [...existing, update.historyPoint]);
      }
      return { history: next };
    });
  },

  getHistory: (countryCode) => {
    return get().history.get(countryCode) ?? [];
  },

  setTimePreset: (preset) => {
    set({
      activeTimePreset: preset,
      historyResolution: PRESET_RESOLUTION[preset],
    });
  },
});
