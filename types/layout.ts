export interface GridSlot {
  id: string;                   // Unique slot ID: "slot-1"
  moduleId: string;             // Registry key: "probability-map"
  position: { x: number; y: number };
  size: { w: number; h: number };
  config?: Record<string, unknown>;  // Module-specific config
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  slots: GridSlot[];
}

export const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Standard trading view with all four modules",
    slots: [
      { id: "ticker",   moduleId: "live-ticker",       position: { x: 0, y: 0 }, size: { w: 12, h: 1 } },
      { id: "map",      moduleId: "probability-map",   position: { x: 0, y: 1 }, size: { w: 8, h: 6 } },
      { id: "rankings", moduleId: "ranking-flow",      position: { x: 8, y: 1 }, size: { w: 4, h: 6 } },
      { id: "timeline", moduleId: "odds-timeline",     position: { x: 0, y: 7 }, size: { w: 12, h: 3 } },
    ],
  },
  {
    id: "analysis",
    name: "Analysis",
    description: "Timeline-focused layout for deep research",
    slots: [
      { id: "ticker",   moduleId: "live-ticker",       position: { x: 0, y: 0 }, size: { w: 12, h: 1 } },
      { id: "timeline", moduleId: "odds-timeline",     position: { x: 0, y: 1 }, size: { w: 12, h: 5 } },
      { id: "map",      moduleId: "probability-map",   position: { x: 0, y: 6 }, size: { w: 7, h: 3 } },
      { id: "rankings", moduleId: "ranking-flow",      position: { x: 7, y: 6 }, size: { w: 5, h: 3 } },
    ],
  },
];
