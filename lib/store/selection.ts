import type { StateCreator } from "zustand";
import type { StoreState } from "./index";

export interface SelectionSlice {
  selectedCountry: string | null;
  hoveredCountry: string | null;
  focusedModule: string | null;

  selectCountry: (code: string, source: string) => void;
  hoverCountry: (code: string | null, source: string) => void;
  deselectCountry: () => void;
  isSelected: (code: string) => boolean;
}

export const createSelectionSlice: StateCreator<
  StoreState, [], [], SelectionSlice
> = (set, get) => ({
  selectedCountry: null,
  hoveredCountry: null,
  focusedModule: null,

  selectCountry: (code, source) => {
    set({ selectedCountry: code, focusedModule: source });
    // Update URL hash for deep-linking
    if (typeof window !== "undefined") {
      window.location.hash = code;
    }
  },

  hoverCountry: (code, source) => {
    set({ hoveredCountry: code, focusedModule: code ? source : get().focusedModule });
  },

  deselectCountry: () => {
    set({ selectedCountry: null, hoveredCountry: null, focusedModule: null });
    if (typeof window !== "undefined") {
      window.location.hash = "";
    }
  },

  isSelected: (code) => get().selectedCountry === code,
});
