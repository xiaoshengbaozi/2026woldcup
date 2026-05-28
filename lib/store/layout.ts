import type { StateCreator } from "zustand";
import type { GridSlot } from "@/types/layout";
import { BUILT_IN_PRESETS } from "@/types/layout";
import type { StoreState } from "./index";

export interface LayoutSlice {
  slots: GridSlot[];
  activePresetId: string;
  isSettingsOpen: boolean;

  loadPreset: (presetId: string) => void;
  updateSlot: (slotId: string, updates: Partial<GridSlot>) => void;
  toggleSettings: () => void;
  resetLayout: () => void;
}

const STORAGE_KEY = "worldcup-layout";

function loadSavedSlots(): GridSlot[] | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveSlots(slots: GridSlot[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // silently fail
  }
}

export const createLayoutSlice: StateCreator<
  StoreState, [], [], LayoutSlice
> = (set, get) => {
  const savedSlots = loadSavedSlots();
  const defaultPreset = BUILT_IN_PRESETS[0];

  return {
    slots: savedSlots ?? defaultPreset.slots,
    activePresetId: defaultPreset.id,
    isSettingsOpen: false,

    loadPreset: (presetId) => {
      const preset = BUILT_IN_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      set({ slots: preset.slots, activePresetId: presetId });
      saveSlots(preset.slots);
    },

    updateSlot: (slotId, updates) => {
      set((state) => {
        const next = state.slots.map((s) =>
          s.id === slotId ? { ...s, ...updates } : s
        );
        saveSlots(next);
        return { slots: next };
      });
    },

    toggleSettings: () => {
      set((state) => ({ isSettingsOpen: !state.isSettingsOpen }));
    },

    resetLayout: () => {
      const preset = BUILT_IN_PRESETS[0];
      set({ slots: preset.slots, activePresetId: preset.id });
      saveSlots(preset.slots);
    },
  };
};
