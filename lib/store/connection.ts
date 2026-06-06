import type { StateCreator } from "zustand";
import type { StoreState } from "./index";

export type ConnectionStatus = "connected" | "stale" | "disconnected" | "initializing";

export interface ConnectionSlice {
  status: ConnectionStatus;
  lastUpdateTimestamp: number | null;
  updateCount: number;
  latency: number;

  setStatus: (status: ConnectionStatus) => void;
  recordUpdate: (timestamp: number, latency: number) => void;
}

export const createConnectionSlice: StateCreator<
  StoreState, [], [], ConnectionSlice
> = (set) => ({
  status: "initializing",
  lastUpdateTimestamp: null,
  updateCount: 0,
  latency: 0,

  setStatus: (status) =>
    set((state) => (state.status === status ? state : { status })),

  recordUpdate: (timestamp, latency) =>
    set((state) => ({
      lastUpdateTimestamp: timestamp,
      updateCount: state.updateCount + 1,
      latency: latency,
    })),
});
