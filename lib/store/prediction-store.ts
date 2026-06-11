import { create } from "zustand";
import { createPredictionSlice, type PredictionSlice } from "./prediction";

export const usePredictionStore = create<PredictionSlice>()((...args) => ({
  ...createPredictionSlice(...args),
}));
