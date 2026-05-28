import type { StateCreator } from "zustand";
import type { ChartEvent } from "@/types/events";
import type { StoreState } from "./index";

export interface EventsSlice {
  events: ChartEvent[];
  visibleEventTypes: Set<ChartEvent["type"]>;

  setEvents: (events: ChartEvent[]) => void;
  addEvent: (event: ChartEvent) => void;
  addEvents: (events: ChartEvent[]) => void;
  toggleEventType: (type: ChartEvent["type"]) => void;
  getVisibleEvents: () => ChartEvent[];
}

export const createEventsSlice: StateCreator<
  StoreState, [], [], EventsSlice
> = (set, get) => ({
  events: [],
  visibleEventTypes: new Set([
    "tournament",
    "injury",
    "volume_spike",
    "price_shock",
    "threshold",
    "news",
    "social",
  ]),

  setEvents: (events) => set({ events }),

  addEvent: (event) => {
    set((state) => ({
      events: [...state.events, event],
    }));
  },

  addEvents: (newEvents) => {
    set((state) => ({
      events: [...state.events, ...newEvents],
    }));
  },

  toggleEventType: (type) => {
    set((state) => {
      const next = new Set(state.visibleEventTypes);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return { visibleEventTypes: next };
    });
  },

  getVisibleEvents: () => {
    const { events, visibleEventTypes } = get();
    return events.filter((e) => visibleEventTypes.has(e.type));
  },
});
