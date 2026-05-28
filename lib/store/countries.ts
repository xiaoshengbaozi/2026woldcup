import type { StateCreator } from "zustand";
import type { CountryData } from "@/types/country";
import type { StoreState } from "./index";

export interface CountriesSlice {
  countries: Map<string, CountryData>;
  lastSequenceNumber: number | null;

  updateCountries: (data: CountryData[]) => void;
  updateCountriesFromDelta: (
    updates: Array<Partial<CountryData> & { countryCode: string }>
  ) => void;
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
  },

  updateCountriesFromDelta: (updates) => {
    set((state) => {
      const next = new Map(state.countries);
      for (const u of updates) {
        const existing = next.get(u.countryCode);
        if (existing) {
          next.set(u.countryCode, { ...existing, ...u } as CountryData);
        }
      }
      return { countries: next };
    });
  },

  getCountry: (code) => get().countries.get(code),

  getAllCountries: () => Array.from(get().countries.values()),
});
