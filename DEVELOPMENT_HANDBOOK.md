# World Cup Prediction OS — Developer Handbook

**Last Updated:** 2026-05-27
**Purpose:** Complete development setup guide. Read this first on any new machine.

---

## Table of Contents

1. [Quick Start (5 Minutes)](#1-quick-start-5-minutes)
2. [Directory Structure](#2-directory-structure)
3. [Dependencies (package.json)](#3-dependencies-packagejson)
4. [Configuration Files](#4-configuration-files)
5. [Core Type Definitions](#5-core-type-definitions)
6. [Zustand Store Scaffolding](#6-zustand-store-scaffolding)
7. [Backend Service Scaffolding](#7-backend-service-scaffolding)
8. [Development Build Order](#8-development-build-order)
9. [Design Specs Reference](#9-design-specs-reference)
10. [Development Checklist](#10-development-checklist)
11. [Gotchas & Notes](#11-gotchas--notes)

---

## 1. Quick Start (5 Minutes)

```bash
# 1. Clone the repo
git clone <repo-url> worldcup-prediction-os
cd worldcup-prediction-os

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Start development server
npm run dev

# 5. In a separate terminal, start the backend
cd backend
npm install
npm run dev
```

Open `http://localhost:5173` — you should see the skeleton dashboard with a loading ticker strip and grid placeholders.

**Prerequisites:**
- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- A Polymarket API key (free tier) — get one at https://polymarket.com/settings/api

---

## 2. Directory Structure

```
worldcup-prediction-os/
│
├── index.html                         # Entry HTML (Vite)
├── package.json                       # Frontend dependencies
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # TypeScript configuration
├── tsconfig.node.json                 # TypeScript config for Vite/Node
├── tailwind.config.ts                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS (for Tailwind)
├── .env.example                       # Environment variables template
├── .eslintrc.cjs                      # ESLint configuration
├── .prettierrc                        # Prettier configuration
│
├── public/
│   ├── favicon.svg
│   └── geo/
│       └── world-110m.json            # Natural Earth GeoJSON (simplified)
│
├── src/
│   ├── main.tsx                       # React entry point
│   ├── App.tsx                        # Root component
│   ├── index.css                      # Tailwind directives + CSS custom properties
│   │
│   ├── types/
│   │   ├── index.ts                   # Re-exports everything
│   │   ├── country.ts                 # CountryData, HistoryPoint interfaces
│   │   ├── events.ts                  # ChartEvent interface
│   │   ├── layout.ts                  # GridSlot, LayoutPreset interfaces
│   │   └── messages.ts               # WebSocket message types
│   │
│   ├── store/
│   │   ├── index.ts                   # Combined Zustand store
│   │   ├── countries.ts              # Countries slice
│   │   ├── rankings.ts              # Rankings slice (derived)
│   │   ├── selection.ts             # Selection slice (cross-module)
│   │   ├── history.ts               # History slice (time series)
│   │   ├── events.ts                # Events slice (markers)
│   │   ├── connection.ts            # Connection slice (WS health)
│   │   └── layout.ts                # Layout slice (dashboard config)
│   │
│   ├── services/
│   │   ├── websocket.ts             # WebSocket manager
│   │   ├── restPoller.ts            # REST API fallback poller
│   │   └── polymarket.ts            # Polymarket API client (backend)
│   │
│   ├── hooks/
│   │   ├── useCountry.ts            # Hook: single country data
│   │   ├── useRankings.ts           # Hook: rankings + squeeze pairs
│   │   ├── useSelection.ts          # Hook: selection state
│   │   ├── useHistory.ts            # Hook: time series data
│   │   ├── useAnimationLoop.ts      # Hook: rAF loop management
│   │   └── useConnectionStatus.ts   # Hook: connection state
│   │
│   ├── modules/
│   │   ├── registry.ts              # Module registry (definitions)
│   │   │
│   │   ├── module-a/                # Probability Map (WebGL)
│   │   │   ├── index.tsx            # Module entry, lazy export
│   │   │   ├── ModuleA_ProbabilityMap.tsx  # Main component
│   │   │   ├── MapCanvas.tsx        # deck.gl canvas wrapper
│   │   │   ├── MapHeader.tsx        # Title + projection toggle
│   │   │   ├── MapLegend.tsx        # Probability color gradient
│   │   │   ├── MapTooltip.tsx       # Hover detail card
│   │   │   ├── MapStatusDot.tsx     # Connection status indicator
│   │   │   ├── layers/
│   │   │   │   ├── GeoJsonLayer.ts  # Country polygon layer
│   │   │   │   ├── ParticleLayer.ts # Particle system layer
│   │   │   │   └── FlowLineLayer.ts # Energy flow layer
│   │   │   ├── shaders/
│   │   │   │   ├── glowBlur.vert   # Glow blur vertex shader
│   │   │   │   ├── glowBlur.frag   # Glow blur fragment shader
│   │   │   │   ├── particle.vert   # Particle vertex shader
│   │   │   │   └── particle.frag   # Particle fragment shader
│   │   │   └── colors.ts           # Color spectrum LUT
│   │   │
│   │   ├── module-b/                # Ranking Flow (DOM)
│   │   │   ├── index.tsx
│   │   │   ├── ModuleB_RankingFlow.tsx
│   │   │   ├── RankingHeader.tsx    # Title + sort + row count
│   │   │   ├── RankingList.tsx      # Virtualized list
│   │   │   ├── RankingRow.tsx       # Single row component
│   │   │   ├── RankNumber.tsx       # Odometer rank number
│   │   │   ├── CountryIdentity.tsx  # Flag + name
│   │   │   ├── Sparkline.tsx        # Mini trend chart
│   │   │   ├── DataBar.tsx          # Probability bar
│   │   │   ├── ProbabilityValue.tsx # Odometer probability
│   │   │   ├── DeltaAndVolume.tsx   # Change + volume display
│   │   │   ├── RankingFooter.tsx    # Row count + timestamp
│   │   │   ├── DetailOverlay.tsx    # Slide-in detail panel
│   │   │   ├── CountryHero.tsx      # Detail header
│   │   │   ├── HistoricalChart.tsx  # Detail chart
│   │   │   ├── StatisticsPanel.tsx  # Detail stats
│   │   │   └── EventsTimeline.tsx   # Detail events
│   │   │
│   │   ├── module-c/                # Odds Timeline (Canvas 2D)
│   │   │   ├── index.tsx
│   │   │   ├── ModuleC_OddsTimeline.tsx
│   │   │   ├── TimelineHeader.tsx   # Title + presets + focus
│   │   │   ├── TimelineCanvas.tsx   # Canvas 2D chart
│   │   │   ├── EventStrip.tsx       # Event marker strip
│   │   │   ├── TimelineLegend.tsx   # Country line toggles
│   │   │   ├── CrosshairTooltip.tsx # Hover readout
│   │   │   ├── renderer/
│   │   │   │   ├── lineRenderer.ts  # Multi-line draw engine
│   │   │   │   ├── axesRenderer.ts  # Grid + axis draw
│   │   │   │   ├── eventRenderer.ts # Event marker draw
│   │   │   │   └── crosshairRenderer.ts # Crosshair draw
│   │   │   └── spline.ts           # Catmull-Rom interpolation
│   │   │
│   │   └── module-d/                # Live Ticker (DOM + rAF)
│   │       ├── index.tsx
│   │       ├── ModuleD_Ticker.tsx
│   │       ├── TickerLeftDock.tsx   # Live indicator + timestamp
│   │       ├── TickerStream.tsx     # Scrolling container
│   │       ├── TickerItem.tsx       # Single item
│   │       ├── ItemIdentity.tsx     # Flag + code
│   │       ├── ItemProbability.tsx  # Odometer probability
│   │       ├── ItemDelta.tsx        # Arrow + change
│   │       ├── ItemDirectionBar.tsx # Color bar
│   │       ├── ItemVolume.tsx       # Volume + mini-bar
│   │       ├── TickerRightDock.tsx  # Pause + filter
│   │       └── tickerLoop.ts       # rAF scroll loop
│   │
│   ├── components/
│   │   ├── DashboardShell.tsx       # Top-level layout wrapper
│   │   ├── DashboardGrid.tsx        # Grid layout container
│   │   ├── GridSlot.tsx             # Individual resizable slot
│   │   ├── SearchPalette.tsx        # Cmd+K country search
│   │   ├── SettingsPanel.tsx        # Global settings slide-out
│   │   ├── StatusBar.tsx            # Bottom status bar
│   │   ├── ToastContainer.tsx       # Alert notifications
│   │   └── Skeleton.tsx             # Loading placeholder
│   │
│   ├── styles/
│   │   ├── colors.css               # CSS custom properties (all colors)
│   │   ├── typography.css           # Font faces + type scale
│   │   ├── animations.css           # Shared keyframes
│   │   └── ticker.css               # Ticker-specific styles
│   │
│   └── utils/
│       ├── color.ts                 # OKLCH interpolation, LUT lookup
│       ├── format.ts                # Number formatting ($14.2M, 0.1%)
│       ├── constants.ts             # Magic numbers, thresholds
│       └── geo.ts                   # Country centroid data
│
├── backend/
│   ├── package.json                 # Backend dependencies
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                 # Entry: HTTP + WebSocket server
│   │   ├── polymarket.ts            # Polymarket CLOB WS client
│   │   ├── deltaEngine.ts           # Compute 1m/5m/1h/24h deltas
│   │   ├── eventDetector.ts         # Threshold/spike/surge detection
│   │   ├── historyBuffer.ts         # Multi-resolution history storage
│   │   ├── snapshotCache.ts         # Latest snapshot for new clients
│   │   ├── wsServer.ts              # WebSocket message handling
│   │   └── types.ts                 # Shared types (mirrors client types/)
│   └── .env.example
│
└── docs/                             # Design specifications
    ├── VISUALIZATION_SYSTEM_DESIGN.md
    ├── MODULE_A_PROBABILITY_MAP_DESIGN.md
    ├── MODULE_B_RANKING_FLOW_DESIGN.md
    ├── MODULE_C_TIMELINE_DESIGN.md
    ├── MODULE_D_TICKER_DESIGN.md
    ├── SYSTEM_ARCHITECTURE.md
    └── DEVELOPMENT_HANDBOOK.md       # <- You are here
```

---

## 3. Dependencies (package.json)

### Frontend

```json
{
  "name": "worldcup-prediction-os",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",

    "zustand": "^4.5.2",

    "@deck.gl/core": "^9.0.14",
    "@deck.gl/layers": "^9.0.14",
    "@deck.gl/geo-layers": "^9.0.14",
    "@deck.gl/react": "^9.0.14",
    "@loaders.gl/core": "^4.2.2",

    "d3-geo": "^3.1.1",
    "d3-geo-projection": "^4.0.0",
    "topojson-client": "^3.1.0",

    "framer-motion": "^11.2.4",

    "react-grid-layout": "^1.4.4",

    "react-window": "^1.8.10",

    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/react-grid-layout": "^1.3.5",
    "@types/react-window": "^1.8.8",
    "@types/d3-geo": "^3.1.0",
    "@types/topojson-client": "^3.1.4",

    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.3.1",

    "typescript": "^5.4.5",

    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",

    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.13.0",
    "@typescript-eslint/parser": "^7.13.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",

    "prettier": "^3.3.2",
    "prettier-plugin-tailwindcss": "^0.6.5",

    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.7",
    "@testing-library/jest-dom": "^6.4.6"
  }
}
```

### Backend

```json
{
  "name": "worldcup-prediction-os-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "start": "bun dist/index.js"
  },
  "dependencies": {
    "ws": "^8.17.1"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10",
    "bun-types": "^1.1.12"
  }
}
```

---

## 4. Configuration Files

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          deckgl: ["@deck.gl/core", "@deck.gl/layers", "@deck.gl/geo-layers"],
        },
      },
    },
  },
});
```

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0A0F",
          secondary: "#14141F",
          tertiary: "#1C1C2E",
        },
        ticker: {
          bg: "#08080F",
          border: "#1C1C2E",
        },
        text: {
          primary: "#EAEAEA",
          secondary: "#8899AA",
          muted: "#556677",
        },
        sentiment: {
          up: "#00E676",
          down: "#FF1744",
          flat: "#78909C",
          gold: "#FFD700",
          silver: "#C0C0C0",
          bronze: "#CD7F32",
          alert: "#FF3D00",
        },
        probability: {
          cold: "#1A1A24",
          deep: "#1E3A5F",
          blue: "#2563C7",
          blueGold: "#4A7FB5",
          olive: "#7B9E4A",
          gold: "#E8B830",
          orange: "#F08020",
          red: "#E03030",
          peak: "#C00000",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Inter"', "sans-serif"],
        display: ['"Inter Display"', "sans-serif"],
      },
      fontSize: {
        "ticker-sm": ["9px", { lineHeight: "1.2" }],
        "ticker": ["11px", { lineHeight: "1.2" }],
        "ticker-lg": ["13px", { lineHeight: "1.2" }],
        "rank": ["14px", { lineHeight: "1.1" }],
        "rank-lg": ["18px", { lineHeight: "1.1" }],
        "prob": ["24px", { lineHeight: "1.1" }],
        "prob-hero": ["28px", { lineHeight: "1.0" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### src/index.css (Critical CSS custom properties)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap");

:root {
  /* Background scale */
  --bg-primary: #0A0A0F;
  --bg-secondary: #14141F;
  --bg-tertiary: #1C1C2E;
  --bg-ticker: #08080F;

  /* Text scale */
  --text-primary: #EAEAEA;
  --text-secondary: #8899AA;
  --text-muted: #556677;

  /* Sentiment */
  --sentiment-up: #00E676;
  --sentiment-down: #FF1744;
  --sentiment-flat: #78909C;
  --sentiment-gold: #FFD700;
  --sentiment-silver: #C0C0C0;
  --sentiment-bronze: #CD7F32;
  --sentiment-alert: #FF3D00;

  /* Animation durations */
  --anim-fast: 150ms;
  --anim-normal: 400ms;
  --anim-slow: 600ms;
  --anim-breath: 3200ms;
  --anim-heat-decay: 30000ms;

  /* Layout */
  --ticker-height: 36px;
  --row-height-compact: 52px;
  --row-height-expanded: 64px;
  --grid-gap: 8px;
  --grid-cols: 12;
  --grid-row-height: 48px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: "Inter", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: #0D0D18;
}
::-webkit-scrollbar-thumb {
  background: #2A2A3A;
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3A3A4A;
}

/* Selection */
::selection {
  background: rgba(255, 215, 0, 0.3);
  color: #FFFFFF;
}
```

---

## 5. Core Type Definitions

### src/types/country.ts

```typescript
export interface CountryData {
  countryCode: string;          // ISO 3166-1 alpha-3: "BRA"
  countryName: string;          // Display: "Brazil"
  flagEmoji: string;            // "🇧🇷"

  // Current market state
  yesPrice: number;             // 0-100 cents
  impliedProbability: number;   // 0-100
  lastUpdated: number;          // Unix ms

  // Computed deltas (signed percentages)
  delta1m: number;
  delta5m: number;
  delta1h: number;
  delta24h: number;

  // Market metrics
  volume24h: number;            // USD
  volume5m: number;
  spread: number;               // Bid-ask in cents
  liquidity: number;            // Order book depth USD
  marketCount: number;          // Active contracts

  // Spatial
  centroid: [number, number];   // [longitude, latitude]
}

export interface HistoryPoint {
  timestamp: number;            // Unix ms
  probability: number;          // 0-100
  volume: number;               // USD at this point
}
```

### src/types/events.ts

```typescript
export type EventType =
  | "tournament"
  | "injury"
  | "volume_spike"
  | "price_shock"
  | "threshold"
  | "news"
  | "social";

export type EventSeverity = "low" | "medium" | "high";

export interface ChartEvent {
  id: string;
  timestamp: number;
  type: EventType;
  title: string;
  description: string;
  severity: EventSeverity;
  affectedCountries: string[];
  source: "manual" | "auto" | "polymarket";
  probabilityImpact?: Array<{
    countryCode: string;
    direction: "up" | "down";
    magnitude: number;
  }>;
}
```

### src/types/layout.ts

```typescript
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
```

### src/types/messages.ts

```typescript
import type { CountryData, HistoryPoint } from "./country";
import type { ChartEvent } from "./events";

// Server → Client
export interface SnapshotMessage {
  type: "snapshot";
  timestamp: number;
  countries: CountryData[];
  events: ChartEvent[];
  history: Record<string, HistoryPoint[]>;
}

export interface DeltaMessage {
  type: "delta";
  timestamp: number;
  sequenceNumber: number;
  updates: Array<{
    countryCode: string;
    yesPrice: number;
    impliedProbability: number;
    delta1m: number;
    delta5m: number;
    delta1h: number;
    delta24h: number;
    volume24h: number;
    volume5m: number;
    spread: number;
    historyPoint: HistoryPoint;
  }>;
  newEvents: ChartEvent[];
}

export interface HistoryResponseMessage {
  type: "history_response";
  countryCode: string;
  resolution: "raw" | "1m" | "1h" | "1d";
  data: HistoryPoint[];
}

// Client → Server
export interface SubscribeMessage {
  type: "subscribe";
  clientId: string;
}

export interface HistoryRequestMessage {
  type: "history_request";
  countryCode: string;
  resolution: "raw" | "1m" | "1h" | "1d";
  from: number;
  to: number;
}

export type ServerMessage = SnapshotMessage | DeltaMessage | HistoryResponseMessage;
export type ClientMessage = SubscribeMessage | HistoryRequestMessage;
```

---

## 6. Zustand Store Scaffolding

### src/store/index.ts

```typescript
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
```

### src/store/countries.ts (template)

```typescript
import type { StateCreator } from "zustand";
import type { CountryData } from "@/types/country";
import type { StoreState } from "./index";

export interface CountriesSlice {
  countries: Map<string, CountryData>;
  lastSequenceNumber: number | null;

  // Full snapshot update (connection init)
  updateCountries: (data: CountryData[]) => void;

  // Delta update (each cycle)
  updateCountriesFromDelta: (
    updates: Array<Partial<CountryData> & { countryCode: string }>
  ) => void;

  // Read
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
```

### src/store/selection.ts (template)

```typescript
import type { StateCreator } from "zustand";
import type { StoreState } from "./index";

export interface SelectionSlice {
  selectedCountry: string | null;
  focusedModule: string | null;

  selectCountry: (code: string, source: string) => void;
  deselectCountry: () => void;
  isSelected: (code: string) => boolean;
}

export const createSelectionSlice: StateCreator<
  StoreState, [], [], SelectionSlice
> = (set, get) => ({
  selectedCountry: null,
  focusedModule: null,

  selectCountry: (code, source) => {
    set({ selectedCountry: code, focusedModule: source });
    // Update URL hash for deep-linking
    window.location.hash = code;
  },

  deselectCountry: () => {
    set({ selectedCountry: null, focusedModule: null });
    window.location.hash = "";
  },

  isSelected: (code) => get().selectedCountry === code,
});
```

### src/store/connection.ts (template)

```typescript
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

  setStatus: (status) => set({ status }),

  recordUpdate: (timestamp, latency) =>
    set((state) => ({
      lastUpdateTimestamp: timestamp,
      updateCount: state.updateCount + 1,
      latency: latency,
    })),
});
```

---

## 7. Backend Service Scaffolding

### backend/src/index.ts

```typescript
import { WebSocketServer } from "ws";
import http from "http";
import { connectPolymarket } from "./polymarket";
import { createDeltaEngine } from "./deltaEngine";
import { createEventDetector } from "./eventDetector";
import { createHistoryBuffer } from "./historyBuffer";
import { createSnapshotCache } from "./snapshotCache";
import { handleWebSocket } from "./wsServer";

const PORT = parseInt(process.env.PORT || "3001");
const POLYMARKET_API_KEY = process.env.POLYMARKET_API_KEY || "";

async function main() {
  // 1. Initialize data pipeline components
  const historyBuffer = createHistoryBuffer();
  const deltaEngine = createDeltaEngine(historyBuffer);
  const eventDetector = createEventDetector();
  const snapshotCache = createSnapshotCache();

  // 2. Connect to Polymarket
  const polymarket = await connectPolymarket(POLYMARKET_API_KEY);

  // 3. Data processing loop
  polymarket.on("orderBookUpdate", (rawUpdate) => {
    // Store raw update in history buffer
    historyBuffer.append(rawUpdate);

    // Every 3 seconds, compute and broadcast
    // (timing logic here — see full implementation)
  });

  // 4. HTTP server + WebSocket
  const server = http.createServer((req, res) => {
    // REST API fallback routes
    if (req.url === "/api/snapshot") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(snapshotCache.getLatest()));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    handleWebSocket(ws, snapshotCache);
  });

  server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

main().catch(console.error);
```

### backend/src/deltaEngine.ts

```typescript
// Computes 1-minute, 5-minute, 1-hour, and 24-hour probability deltas
// for each country by comparing current state against historical snapshots.

import type { CountryData } from "../../src/types/country";
import type { HistoryBuffer } from "./historyBuffer";

export interface DeltaEngine {
  computeDeltas(current: CountryData[]): CountryData[];
}

export function createDeltaEngine(history: HistoryBuffer): DeltaEngine {
  // Look back at historical snapshots:
  //   T-1min, T-5min, T-1hr, T-24hr
  // Compute difference for each country.
  // Attach delta1m, delta5m, delta1h, delta24h to each CountryData.

  return {
    computeDeltas(current) {
      return current.map((country) => {
        const prev1m = history.getSnapshot(Date.now() - 60_000);
        const prev5m = history.getSnapshot(Date.now() - 300_000);
        const prev1h = history.getSnapshot(Date.now() - 3_600_000);
        const prev24h = history.getSnapshot(Date.now() - 86_400_000);

        return {
          ...country,
          delta1m: computeDelta(country, prev1m?.get(country.countryCode)),
          delta5m: computeDelta(country, prev5m?.get(country.countryCode)),
          delta1h: computeDelta(country, prev1h?.get(country.countryCode)),
          delta24h: computeDelta(country, prev24h?.get(country.countryCode)),
        };
      });
    },
  };
}

function computeDelta(current: CountryData, previous?: CountryData): number {
  if (!previous) return 0;
  return current.impliedProbability - previous.impliedProbability;
}
```

---

## 8. Development Build Order

Build the system in this sequence. Each phase produces something runnable and testable. Do NOT skip phases.

### Phase 0: Skeleton (Day 0.5)

**Goal:** Empty dashboard that renders without errors.

```
1.  Initialize Vite + React + TypeScript project.
2.  Install all dependencies (copy package.json from Section 3).
3.  Set up Tailwind + CSS custom properties (Section 4).
4.  Create directory structure (Section 2 — empty files, just the folders).
5.  Create types/ files (Section 5).
6.  Create src/App.tsx: renders a single <div> with the dark background.
7.  Create src/main.tsx: mounts App.

✅ Verify: `npm run dev` shows a black screen. No errors.
```

### Phase 1: Store + Data Layer (Day 1)

**Goal:** Zustand store that can receive and hold data. No UI yet.

```
1.  Implement all 7 store slices (Section 6 — copy-paste the templates,
    then fill in the remaining slices: rankings, history, events, layout).
2.  Create services/websocket.ts (stub — logs messages to console).
3.  Create services/restPoller.ts (stub).
4.  Create a test helper that injects mock CountryData into the store.
5.  Write a quick App.tsx that dumps store data as JSON to verify.

✅ Verify: Open browser console. Inject mock data. Store holds it correctly.
✅ Verify: Change mock probability. Rankings recalculate. Selection works.
```

### Phase 2: Ticker (Module D) — Day 2

**Goal:** A working, scrolling ticker strip. Build this first because:
- It's the simplest module (pure DOM).
- It provides instant visual feedback that the system is alive.
- It validates the store → UI pipeline end-to-end.

```
1.  Create ModuleD_Ticker.tsx with left dock + stream + right dock layout.
2.  Create TickerItem.tsx (flag, code, probability, delta, direction bar, volume).
3.  Implement tickerLoop.ts: rAF loop that translates the stream container.
4.  Implement seamless loop (duplicate content, reset on threshold).
5.  Hook into store.countries for data.
6.  Hook into store.selection for click-to-select.

✅ Verify: Ticker scrolls smoothly. Items show mock data.
✅ Verify: Clicking an item selects the country (check store.selection).
✅ Verify: Pause button works. Filter dropdown exists.
```

### Phase 3: Rankings (Module B) — Day 3-4

**Goal:** Working ranking list with data bars. Build second because:
- It's DOM-based (no Canvas complexity).
- It validates the rankings slice and animation pipeline.
- The squeeze mechanic and vibration system are complex but self-contained.

```
1.  Create RankingRow.tsx (all sub-components).
2.  Create DataBar.tsx with probability-to-width mapping and ghost line.
3.  Create Sparkline.tsx (SVG-based mini chart).
4.  Implement spring animations via framer-motion (translateY for rank changes).
5.  Implement odometer effect for rank numbers and probability values.
6.  Implement squeeze mechanic (gap calculation + CSS transforms).
7.  Implement vibration feedback (damped sine wave on translateX).
8.  Implement top-3 podium effects.
9.  Create DetailOverlay.tsx (slide-in panel with historical chart + stats).
10. Hook into store.rankings, store.squeezePairs, store.vibrationTriggers.

✅ Verify: Rows render in correct order. Data bars proportional to probability.
✅ Verify: Change mock data. Ranks animate with spring physics.
✅ Verify: Squeeze pairs show compressed gaps.
✅ Verify: >1% change triggers vibration animation.
✅ Verify: Click row opens detail overlay. Click overlay back button closes it.
```

### Phase 4: Timeline (Module C) — Day 5-6

**Goal:** Working multi-line time series chart. Build third because:
- Canvas 2D rendering requires custom draw code.
- It validates the history slice and event system.
- The spline interpolation and acceleration effects are compute-intensive.

```
1.  Set up TimelineCanvas.tsx with Canvas 2D context.
2.  Implement axesRenderer.ts: grid lines, axis labels, dynamic scaling.
3.  Implement lineRenderer.ts: Catmull-Rom spline, multi-pass glow, tier widths.
4.  Implement acceleration color modulation per segment.
5.  Implement time presets (1H/24H/7D/30D) with data resolution switching.
6.  Implement pan (drag) and zoom (scroll wheel).
7.  Implement crosshair with tooltip.
8.  Implement event markers (diamonds + guidelines + tooltip).
9.  Implement single-country focus mode.
10. Hook into store.history, store.events, store.selection.

✅ Verify: Lines render. Multiple countries visible with correct colors.
✅ Verify: Switch time presets. Lines morph smoothly.
✅ Verify: Hover shows crosshair and tooltip with correct values.
✅ Verify: Event markers appear. Hover shows event detail.
✅ Verify: Focus mode isolates one country. Exit restores all lines.
```

### Phase 5: Map (Module A) — Day 7-9

**Goal:** Working WebGL choropleth map. Build last because:
- deck.gl has the steepest learning curve.
- Multi-pass glow rendering requires custom shaders.
- Particle simulation is a mini physics engine.
- Energy flow paths require bezier math + dash animation.

```
1.  Load world-110m.json GeoJSON (Natural Earth, simplified).
2.  Set up MapCanvas.tsx with deck.gl DeckGL component.
3.  Implement GeoJsonLayer.ts: fill color by probability, stroke boundaries.
4.  Implement glow rendering (offscreen FBO, 3-pass Gaussian blur).
5.  Implement breathing animation (shader uniform, 3.2s sine wave).
6.  Implement ParticleLayer.ts: spawn, simulate, render particles.
7.  Implement particle direction logic (inward/orbital/outward by delta).
8.  Implement FlowLineLayer.ts: 12 strongest flow pairs, bezier curves, dash animation.
9.  Implement hover: GPU pick buffer, spotlight dim, tooltip card.
10. Implement ripple effect on significant change.
11. Implement globe/flat projection toggle.
12. Hook into store.countries, store.selection, store.connection.

✅ Verify: Map renders. Countries colored by probability.
✅ Verify: Glow visible on top countries. Breathing animation plays.
✅ Verify: Particles move correctly based on probability direction.
✅ Verify: Flow lines connect top countries. Dashes animate along paths.
✅ Verify: Hover shows tooltip with probability, delta, 7d range.
✅ Verify: Click selects country (cross-module propagation works).
```

### Phase 6: Integration — Day 10

**Goal:** Everything works together.

```
1.  Create DashboardShell.tsx: wraps ticker + grid + status bar.
2.  Create DashboardGrid.tsx: react-grid-layout container.
3.  Create GridSlot.tsx: resizable wrapper around each module.
4.  Create SearchPalette.tsx: Cmd+K fuzzy search.
5.  Create StatusBar.tsx: connection status, total volume, last update.
6.  Implement layout persistence (localStorage).
7.  Implement URL deep-linking (hash → selection state).
8.  Test cross-module selection: click in map → ranking scrolls → timeline focuses → ticker highlights.
9.  Test all edge states: loading, empty, stale, disconnected, error.
10. Test responsive breakpoints (desktop, tablet, mobile).

✅ Verify: All four modules on screen. Data updates propagate correctly.
✅ Verify: Drag and resize modules. Layout persists across reload.
✅ Verify: Selection propagates across all modules simultaneously.
✅ Verify: Stale connection shows warning. Reconnect restores data.
```

### Phase 7: Backend — Day 11-12

**Goal:** Real data from Polymarket instead of mock data.

```
1.  Implement polymarket.ts: CLOB WebSocket connection.
2.  Implement deltaEngine.ts: compute all four time deltas.
3.  Implement eventDetector.ts: threshold, spike, volume surge detection.
4.  Implement historyBuffer.ts: multi-resolution storage with pruning.
5.  Implement snapshotCache.ts: latest state for new client connections.
6.  Implement wsServer.ts: handle subscribe, push snapshots and deltas.
7.  Test with real Polymarket data.
8.  Deploy backend to Fly.io / Railway.

✅ Verify: Client connects to backend WebSocket. Receives snapshot.
✅ Verify: Client receives deltas every 3 seconds.
✅ Verify: Events are detected and pushed.
✅ Verify: Client gracefully handles disconnect and reconnect.
```

### Phase 8: Polish — Day 13-14

**Goal:** Production quality.

```
1.  Performance audit (Lighthouse, React Profiler, frame timing).
2.  Accessibility audit (keyboard navigation, screen reader, color contrast).
3.  Add loading skeletons (Skeleton.tsx) for each module.
4.  Add error boundaries around each module.
5.  Add favicon, meta tags, PWA manifest.
6.  Bundle size optimization (check chunk sizes, tree shaking).
7.  Cross-browser testing (Chrome, Firefox, Safari, Edge).
8.  Mobile responsive polish.
9.  Write README.md with screenshots.
10. Tag v1.0.0.
```

---

## 9. Design Specs Reference

All design specifications are in the `docs/` directory. Read them in this order:

| # | Document | What It Covers | Read Before Building |
|---|----------|---------------|---------------------|
| 1 | `VISUALIZATION_SYSTEM_DESIGN.md` | Overview: philosophy, information architecture, visual system, all four modules at a glance | Everything |
| 2 | `SYSTEM_ARCHITECTURE.md` | Integration: store, data pipeline, component tree, layout system | Phase 1, 6 |
| 3 | `MODULE_D_TICKER_DESIGN.md` | Ticker: item anatomy, variable-speed scroll, sentiment system, event animations | Phase 2 |
| 4 | `MODULE_B_RANKING_FLOW_DESIGN.md` | Rankings: row anatomy, spring animations, squeeze, vibration, top-3 effects | Phase 3 |
| 5 | `MODULE_C_TIMELINE_DESIGN.md` | Timeline: line rendering, acceleration cues, time nav, events, focus mode | Phase 4 |
| 6 | `MODULE_A_PROBABILITY_MAP_DESIGN.md` | Map: triple expression, particles, energy flows, projection, hover | Phase 5 |

**Key numbers to memorize:**

```
Ticker:       base speed 50px/s, item width 180px, height 36px
Ranking row:  52px height, data bar 6px, spring stiffness 200/damping 24
Timeline:     3-pass line render (glow/core/accel), Catmull-Rom tension 0.5
Map:          glow 3-layer blur (12/28/56px sigma), 1200 max particles, 12 max flows
Store:        7 slices, <5ms re-render budget, 3s update cycle
```

---

## 10. Development Checklist

Use this as your task tracker. Check off items as you complete them.

### Phase 0: Skeleton
- [ ] Vite + React + TS project initialized
- [ ] Dependencies installed
- [ ] Tailwind + CSS custom properties configured
- [ ] Directory structure created
- [ ] Types defined (country, events, layout, messages)
- [ ] App.tsx renders black screen without errors

### Phase 1: Store + Data Layer
- [ ] All 7 store slices implemented
- [ ] WebSocket service stub working
- [ ] Mock data injection working
- [ ] Store verified: CRUD, rankings, selection

### Phase 2: Ticker
- [ ] Ticker strip renders
- [ ] Items show flag, code, probability, delta, direction bar, volume
- [ ] Seamless scroll loop works
- [ ] Pause button works
- [ ] Filter dropdown exists
- [ ] Click to select propagates to store

### Phase 3: Rankings
- [ ] Ranking rows render in correct order
- [ ] Data bars proportional to probability
- [ ] Rank change spring animation works
- [ ] Odometer effect works
- [ ] Squeeze mechanic works
- [ ] Vibration feedback works
- [ ] Top-3 podium effects visible
- [ ] Detail overlay opens/closes
- [ ] Detail overlay chart and stats render

### Phase 4: Timeline
- [ ] Multi-line chart renders
- [ ] Grid lines and axis labels correct
- [ ] Glow layer visible on primary lines
- [ ] Acceleration modulation visible
- [ ] Time presets switch smoothly
- [ ] Pan and zoom work
- [ ] Crosshair + tooltip correct
- [ ] Event markers visible and interactive
- [ ] Single-country focus mode works

### Phase 5: Map
- [ ] World map renders with country polygons
- [ ] Fill colors correct by probability
- [ ] Glow visible on top countries
- [ ] Breathing animation plays
- [ ] Particles simulate correctly by direction
- [ ] Flow lines connect top countries
- [ ] Hover shows tooltip card
- [ ] Ripple effect on significant change
- [ ] Globe/flat toggle works

### Phase 6: Integration
- [ ] Dashboard shell wraps all modules
- [ ] Grid layout with drag/resize works
- [ ] Layout persists across reload
- [ ] Search palette works (Cmd+K)
- [ ] Status bar shows connection health
- [ ] Cross-module selection works
- [ ] URL deep-linking works
- [ ] All edge states handled (loading/empty/stale/error)
- [ ] Responsive breakpoints work

### Phase 7: Backend
- [ ] Polymarket CLOB connection established
- [ ] Delta engine computes all four timeframes
- [ ] Event detector identifies threshold/spike/surge
- [ ] History buffer stores multi-resolution data
- [ ] WebSocket push working (snapshot + deltas)
- [ ] Client receives and processes real data

### Phase 8: Polish
- [ ] Performance audit passed (60fps all modules)
- [ ] Accessibility audit passed
- [ ] Loading skeletons for all modules
- [ ] Error boundaries around all modules
- [ ] Bundle size checked (<250KB gzipped total)
- [ ] Cross-browser tested
- [ ] Mobile responsive
- [ ] README written
- [ ] v1.0.0 tagged

---

## 11. Gotchas & Notes

### Things that WILL trip you up

1. **deck.gl + Vite:** deck.gl uses some Node.js-isms. Add this to vite.config.ts:
   ```typescript
   define: { global: "globalThis" },
   optimizeDeps: { include: ["@deck.gl/core", "@deck.gl/layers"] },
   ```

2. **Canvas 2D `filter: blur()`:** Not supported in Firefox < 116. Use the multi-stroke fallback for the glow effect (draw the line 6 times with increasing lineWidth and decreasing opacity). Feature-detect with:
   ```typescript
   const supportsFilter = typeof ctx.filter !== "undefined";
   ```

3. **framer-motion `layout` animations:** The `layout` prop triggers layout thrash. For the ranking list, do NOT use `layout` — use explicit `animate={{ y: targetY }}` with spring transition instead. This is the whole reason the ranking system uses absolute positioning + translateY.

4. **Seamless ticker loop:** If you use CSS `animation` for the scroll, the reset at the loop point will be visible as a stutter. Use `requestAnimationFrame` + `transform: translateX()` with manual loop detection instead. The reset must happen in a single frame when the translation reaches exactly -50% of the total width.

5. **Map GeoJSON size:** Natural Earth 110m resolution is ~800KB unzipped. Simplify further with `mapshaper` to ~200KB using Douglas-Peucker with `interval=0.05`. Only include country geometries that have markets.

6. **WebSocket reconnection:** Don't use exponential backoff with jitter. Use a fixed sequence: 1s, 2s, 5s, 10s, 30s, 30s, 30s... (cap at 30s). Pure exponential backoff leads to 8+ minute gaps after a few reconnections.

7. **Zustand + Maps:** The `countries` slice uses `Map<string, CountryData>`. Zustand's equality check is `Object.is` — a new `Map` instance always triggers re-render. Use `Map` anyway (it's the right data structure for keyed lookups) but make sure selectors are fine-grained enough that only components that actually read changed data re-render.

8. **Particle system performance:** 1200 particles × 60fps = 72,000 position updates per second. Keep the simulation in a single typed array (Float32Array of [x, y, vx, vy, phase, life] per particle). Use a Web Worker if CPU time exceeds 2ms.

9. **Time zones:** All timestamps are Unix ms (UTC). Display times in the user's local timezone (detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`). Event dates are stored in UTC. The "last updated" timestamp in the status bar shows the user's local time.

10. **Font loading:** JetBrains Mono and Inter are loaded from Google Fonts in `index.css`. On first load, there may be a flash of unstyled text. Add `font-display: swap` to the @import URL and accept the FOUT. The alternative (blocking render until fonts load) is worse for perceived performance.

### Dev workflow tips

```bash
# Run frontend + backend concurrently
npm run dev          # Terminal 1: Vite dev server
cd backend && npm run dev  # Terminal 2: Backend

# Inject mock data for UI development (no backend needed)
# In browser console:
window.__injectMockData()  # Fills store with 48 fake countries

# Check store state at any time:
window.__store = useStore  # Then: __store.getState().countries

# Profile frame rate:
# Chrome DevTools → Rendering → FPS Meter
# Target: solid 60fps green bar across all modules
```

---

*End of Developer Handbook*
