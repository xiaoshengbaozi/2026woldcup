import type { StateCreator } from "zustand";
import type { CountryData } from "@/types/country";
import type { StoreState } from "./index";

export interface CountriesSlice {
  countries: Map<string, CountryData>;
  lastSequenceNumber: number | null;

  updateCountries: (data: CountryData[]) => string[];
  updateCountriesFromDelta: (
    updates: Array<Partial<CountryData> & { countryCode: string }>
  ) => string[];
  getCountry: (code: string) => CountryData | undefined;
  getAllCountries: () => CountryData[];
}

export const createCountriesSlice: StateCreator<
  StoreState, [], [], CountriesSlice
> = (set, get) => ({
  countries: new Map(),
  lastSequenceNumber: null,

  updateCountries: (data) => {
    const map = new Map<string, CountryData>();
    for (const c of data) map.set(c.countryCode, c);
    set({ countries: map });
    return data.map((c) => c.countryCode);
  },

  updateCountriesFromDelta: (updates) => {
    if (!updates.length) return [];

    const { countries } = get();
    const next = new Map(countries);
    const changedCountryCodes: string[] = [];

    for (const u of updates) {
      const existing = next.get(u.countryCode);
      if (!existing) continue;
      const { historyPoint: _historyPoint, ...countryPatch } = u as typeof u & {
        historyPoint?: unknown;
      };

      let changed = false;
      for (const [key, value] of Object.entries(countryPatch)) {
        if (existing[key as keyof CountryData] !== value) {
          changed = true;
          break;
        }
      }

      if (changed) {
        next.set(u.countryCode, { ...existing, ...countryPatch } as CountryData);
        changedCountryCodes.push(u.countryCode);
      }
    }

    if (changedCountryCodes.length) {
      set({ countries: next });
    }

    return changedCountryCodes;
  },

  getCountry: (code) => get().countries.get(code),

  getAllCountries: () => Array.from(get().countries.values()),
});
