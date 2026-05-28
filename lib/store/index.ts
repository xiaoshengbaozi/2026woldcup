import { create } from "zustand";
import { createCountriesSlice, type CountriesSlice } from "./countries";
import { createRankingsSlice, type RankingsSlice } from "./rankings";
import { createSelectionSlice, type SelectionSlice } from "./selection";
import { createHistorySlice, type HistorySlice } from "./history";
import { createEventsSlice, type EventsSlice } from "./events";
import { createConnectionSlice, type ConnectionSlice } from "./connection";
import { createLayoutSlice, type LayoutSlice } from "./layout";

export type StoreState =
  CountriesSlice &
  RankingsSlice &
  SelectionSlice &
  HistorySlice &
  EventsSlice &
  ConnectionSlice &
  LayoutSlice;

export const useStore = create<StoreState>()((...args) => ({
  ...createCountriesSlice(...args),
  ...createRankingsSlice(...args),
  ...createSelectionSlice(...args),
  ...createHistorySlice(...args),
  ...createEventsSlice(...args),
  ...createConnectionSlice(...args),
  ...createLayoutSlice(...args),
}));
