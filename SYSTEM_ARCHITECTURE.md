# World Cup Prediction OS — System Architecture & Integration Specification

**Version:** 1.0 | **Date:** 2026-05-27
**Code Name:** "The Terminal"

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Product Architecture](#2-product-architecture)
3. [Frontend Component Architecture](#3-frontend-component-architecture)
4. [State Management Architecture](#4-state-management-architecture)
5. [Data Pipeline: API → State → UI](#5-data-pipeline-api--state--ui)
6. [Dashboard Layout System](#6-dashboard-layout-system)
7. [Module Communication Protocol](#7-module-communication-protocol)
8. [Real-Time Update Lifecycle](#8-real-time-update-lifecycle)
9. [Build & Deployment Architecture](#9-build--deployment-architecture)

---

## 1. System Overview

### What This System Is

The World Cup Prediction OS is a single-page web application that functions as a **real-time prediction market terminal** for the 2026 FIFA World Cup. It ingests live probability data from Polymarket, processes it through a server-side delta engine, and renders it across four specialized visualization modules — a probability map, a dynamic ranking leaderboard, a historical timeline chart, and a live ticker stream — all sharing a unified data layer and synchronized selection state.

The system treats prediction market data with the same gravity that a Bloomberg Terminal treats financial instruments. Every number has a direction, every change has a velocity, and every module answers a distinct analytical question.

### The Four Questions

| Module | Question Answered | Primary Encoding | Render Tech |
|--------|------------------|-----------------|-------------|
| **A — Probability Map** | *Where is confidence concentrated?* | Spatial (choropleth + glow + particles) | WebGL (deck.gl) |
| **B — Ranking Flow** | *Who is winning, and by how much?* | Ordinal (sorted list + data bars) | DOM (React + framer-motion) |
| **C — Odds Timeline** | *How did we get here?* | Temporal (multi-line time series) | Canvas 2D |
| **D — Live Ticker** | *What's moving right now?* | Streaming (horizontal scroll + speed) | DOM (React + rAF) |

### Architecture Principles

1. **Single source of truth.** One Zustand store. All four modules read from it. No module-to-module data passing. No duplicated state. No out-of-sync views.

2. **Push, don't poll.** The client opens one WebSocket connection to the backend. The backend pushes differential updates. The client never asks "has anything changed?" — it is told.

3. **Modules are islands.** Each module is a self-contained React component with its own rendering strategy, its own animation loop, and its own subscription to the store. Modules know nothing about each other. They communicate only through the shared store (selection state).

4. **Layout is data.** The dashboard arrangement is user-configurable, persisted to localStorage, and expressed as a JSON layout object. Layout is not hard-coded. Users can rearrange, resize, add, and remove modules like Notion blocks.

5. **Graceful degradation at every layer.** If WebSocket fails, fall back to REST polling. If WebGL is unavailable, fall back to Canvas 2D. If Canvas 2D is unavailable, fall back to SVG. If the browser is ancient, serve a static HTML snapshot. The system never shows a blank screen.

---

## 2. Product Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Module A │  │ Module B │  │ Module C │  │    Module D      │   │
│  │  (Map)   │  │(Rankings)│  │(Timeline)│  │    (Ticker)      │   │
│  │ WebGL    │  │ DOM+CSS  │  │ Canvas2D │  │    DOM+rAF       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────────┘   │
│       │              │              │              │                 │
│       └──────────────┴──────────────┴──────────────┘                 │
│                          │                                           │
│              Cross-module coordinator (selection, focus)             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ZUSTAND STORE                            │   │
│  │                                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │   │
│  │  │ countries│  │  rankings│  │ selection│  │   layout    │ │   │
│  │  │  slice   │  │  slice   │  │  slice   │  │   slice     │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │   │
│  │  │  history │  │  events  │  │connection│                 │   │
│  │  │  slice   │  │  slice   │  │  slice   │                 │   │
│  │  └──────────┘  └──────────┘  └────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                 │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  WebSocket      │  │  Delta Engine    │  │  Event Detector  │   │
│  │  Client         │  │  (compute Δ1m,   │  │  (threshold,     │   │
│  │  (reconnection, │  │   Δ5m, Δ1h, Δ24h)│  │   spike, surge)  │   │
│  │   backpressure) │  │                  │  │                  │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           │                    │                      │              │
│           └────────────────────┴──────────────────────┘              │
│                                │                                     │
├────────────────────────────────┼─────────────────────────────────────┤
│                          API GATEWAY LAYER                           │
│                                │                                     │
│  ┌─────────────────────────────┴────────────────────────────────┐   │
│  │              Backend Service (Node.js / Bun)                  │   │
│  │                                                               │   │
│  │  POST /api/ws            WebSocket upgrade endpoint           │   │
│  │  GET  /api/snapshot      Full state snapshot (REST fallback)  │   │
│  │  GET  /api/history/:code Historical data for one country      │   │
│  │  GET  /api/events        Event marker dataset                 │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                │                                     │
├────────────────────────────────┼─────────────────────────────────────┤
│                        EXTERNAL DATA SOURCES                         │
│                                │                                     │
│  ┌──────────────────┐  ┌──────┴────────┐  ┌────────────────────┐    │
│  │ Polymarket CLOB  │  │ Polymarket    │  │ FIFA / News API    │    │
│  │ WebSocket        │  │ REST API      │  │ (event curation)   │    │
│  │ (real-time order │  │ (historical,  │  │                    │    │
│  │  book updates)   │  │  market list) │  │                    │    │
│  └──────────────────┘  └───────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Volumes

| Metric | Estimate |
|--------|----------|
| Active country markets | ~48 (one per qualified team) |
| Updates per second (peak) | ~100-300 order book events from Polymarket CLOB |
| Processed snapshots per second | ~0.33 (one snapshot every 3s) |
| Historical data points per country per day | ~28,800 (raw, at 3s interval) |
| Client memory (all data, all resolutions) | ~8-12 MB |
| WebSocket message size (delta) | ~2-5 KB per push |
| Initial snapshot size | ~15-25 KB |

---

## 3. Frontend Component Architecture

### Technology Choices

```
Framework:       React 18.3+ (with TypeScript 5.x)
Build Tool:      Vite 5.x
Styling:         Tailwind CSS 3.x + CSS custom properties
State:           Zustand 4.x
Animation:       framer-motion 11.x (DOM), custom rAF loops (Canvas/WebGL)
Map:             deck.gl 9.x + d3-geo 3.x
Charts:          Custom Canvas 2D (no library — full control over rendering)
Data Fetching:   Native WebSocket + custom reconnection manager
Routing:         React Router 6.x (for deep-linking selection state)
Testing:         Vitest + React Testing Library
```

### Full Component Tree

```
<App>
├── <WebSocketProvider>             // Manages WS lifecycle, injects into store
│
├── <DashboardShell>                // Top-level layout container
│   │
│   ├── <ModuleD_TickerStrip />     // Always at top, full width, z-index: 100
│   │   ├── <TickerLeftDock />      // Live indicator + timestamp
│   │   ├── <TickerStream />        // The scrolling item stream
│   │   │   └── <TickerItem />      // × N (one per country in visible set)
│   │   │       ├── <ItemIdentity />    // Flag + country code
│   │   │       ├── <ItemProbability /> // Hero number with odometer
│   │   │       ├── <ItemDelta />       // Arrow + signed change
│   │   │       ├── <ItemDirectionBar />// Color-coded direction indicator
│   │   │       └── <ItemVolume />      // Volume label + mini-bar
│   │   └── <TickerRightDock />     // Pause + filter controls
│   │
│   ├── <DashboardGrid>             // CSS Grid / react-grid-layout container
│   │   │
│   │   ├── <GridSlot id="module-a">        // Resizable, draggable slot
│   │   │   └── <ModuleA_ProbabilityMap />
│   │   │       ├── <MapHeader />           // Title + projection toggle
│   │   │       ├── <MapCanvas />           // deck.gl canvas
│   │   │       │   ├── <GeoJsonLayer />    // Country polygons
│   │   │       │   ├── <ParticleLayer />   // Per-country particle systems
│   │   │       │   └── <FlowLineLayer />   // Energy flow paths
│   │   │       ├── <MapLegend />           // Probability color gradient
│   │   │       ├── <MapTooltip />          // Hover detail card
│   │   │       └── <MapStatusDot />        // Connection status
│   │   │
│   │   ├── <GridSlot id="module-b">        // Resizable, draggable slot
│   │   │   └── <ModuleB_RankingFlow />
│   │   │       ├── <RankingHeader />       // Title + sort controls + row count
│   │   │       ├── <RankingList />         // Virtualized list container
│   │   │       │   └── <RankingRow />      // × N (one per visible country)
│   │   │       │       ├── <RankNumber />  // With odometer animation
│   │   │       │       ├── <CountryIdentity /> // Flag + name
│   │   │       │       ├── <Sparkline />   // 24h mini trend chart
│   │   │       │       ├── <DataBar />     // Probability bar with ghost
│   │   │       │       ├── <ProbabilityValue /> // Large odometer number
│   │   │       │       └── <DeltaAndVolume />   // Change + volume
│   │   │       ├── <RankingFooter />       // Row count + timestamp
│   │   │       └── <DetailOverlay />       // Slide-in country detail panel
│   │   │           ├── <CountryHero />     // Flag + name + rank + prob
│   │   │           ├── <HistoricalChart /> // Interactive time series
│   │   │           ├── <StatisticsPanel /> // 7d/30d/all-time stats
│   │   │           └── <EventsTimeline />  // Recent events for this country
│   │   │
│   │   ├── <GridSlot id="module-c">        // Resizable, draggable slot
│   │   │   └── <ModuleC_OddsTimeline />
│   │   │       ├── <TimelineHeader />      // Title + time presets + focus btn
│   │   │       ├── <TimelineCanvas />      // Canvas 2D chart
│   │   │       ├── <EventStrip />          // Event markers below chart
│   │   │       ├── <TimelineLegend />      // Country line toggles
│   │   │       └── <CrosshairTooltip />    // Hover readout
│   │   │
│   │   └── ... additional slots as needed
│   │
│   └── <StatusBar />                // Bottom: connection, volume, alerts
│
├── <SearchPalette />                // Cmd+K fuzzy country search
├── <SettingsPanel />                // Slide-out global settings
└── <ToastContainer />               // Alert notifications
```

### Module Registry

Each module is registered in a central module registry that the dashboard grid uses to discover available modules:

```typescript
// modules/registry.ts

interface ModuleDefinition {
  id: string;                    // Unique module ID: "probability-map"
  name: string;                  // Display name: "Probability Map"
  description: string;           // One-liner for the module picker
  icon: string;                  // Icon component name
  component: React.LazyComponent; // Lazy-loaded component
  defaultSize: { w: number; h: number }; // In grid units
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  allowedPositions: ("top" | "middle" | "bottom")[];
  requiredData: string[];        // Store slices this module needs
  renderMode: "webgl" | "canvas2d" | "dom";
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  "probability-map": {
    id: "probability-map",
    name: "Championship Probability Map",
    description: "World map showing probability distribution by country",
    icon: "Globe",
    component: React.lazy(() => import("./ModuleA_ProbabilityMap")),
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 12 },
    allowedPositions: ["top", "middle"],
    requiredData: ["countries", "selection", "connection"],
    renderMode: "webgl",
  },
  "ranking-flow": {
    id: "ranking-flow",
    name: "Ranking Dynamic Flow",
    description: "Live leaderboard with animated rank changes",
    icon: "ListOrdered",
    component: React.lazy(() => import("./ModuleB_RankingFlow")),
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
    maxSize: { w: 6, h: 12 },
    allowedPositions: ["top", "middle"],
    requiredData: ["countries", "rankings", "selection", "connection"],
    renderMode: "dom",
  },
  "odds-timeline": {
    id: "odds-timeline",
    name: "Odds Timeline",
    description: "Historical probability trends with event markers",
    icon: "Timeline",
    component: React.lazy(() => import("./ModuleC_OddsTimeline")),
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
    maxSize: { w: 12, h: 8 },
    allowedPositions: ["middle", "bottom"],
    requiredData: ["countries", "history", "events", "selection", "connection"],
    renderMode: "canvas2d",
  },
  "live-ticker": {
    id: "live-ticker",
    name: "Live Ticker Stream",
    description: "Real-time scrolling market data strip",
    icon: "Activity",
    component: React.lazy(() => import("./ModuleD_Ticker")),
    defaultSize: { w: 12, h: 1 },
    minSize: { w: 12, h: 1 },
    maxSize: { w: 12, h: 1 },
    allowedPositions: ["top"],
    requiredData: ["countries", "rankings", "selection", "connection"],
    renderMode: "dom",
  },
};
```

### Lazy Loading Strategy

All four modules are lazy-loaded via `React.lazy()`. The dashboard shell renders immediately with skeleton placeholders in each grid slot. As modules load, skeletons fade out and real content fades in. The loading order is:

```
1. DashboardShell (immediate — shows skeleton grid)
2. ModuleD_Ticker     (loads first — fast, DOM-only, appears within ~200ms)
3. ModuleB_RankingFlow (loads second — DOM, appears within ~500ms)
4. ModuleC_OddsTimeline (loads third — Canvas 2D, appears within ~800ms)
5. ModuleA_ProbabilityMap (loads last — WebGL/deck.gl, appears within ~1.5s)
```

Each module's loading state is a deliberate part of the UX — the system "wakes up" progressively from top to bottom.

---

## 4. State Management Architecture

### Store Structure

The Zustand store is organized into **six slices**, each managed by a separate slice creator function and combined into a single store:

```typescript
// store/index.ts

import { create } from "zustand";
import { createCountriesSlice, CountriesSlice } from "./countries";
import { createRankingsSlice, RankingsSlice } from "./rankings";
import { createSelectionSlice, SelectionSlice } from "./selection";
import { createLayoutSlice, LayoutSlice } from "./layout";
import { createHistorySlice, HistorySlice } from "./history";
import { createEventsSlice, EventsSlice } from "./events";
import { createConnectionSlice, ConnectionSlice } from "./connection";

export type StoreState =
  CountriesSlice &
  RankingsSlice &
  SelectionSlice &
  LayoutSlice &
  HistorySlice &
  EventsSlice &
  ConnectionSlice;

export const useStore = create<StoreState>()((...args) => ({
  ...createCountriesSlice(...args),
  ...createRankingsSlice(...args),
  ...createSelectionSlice(...args),
  ...createLayoutSlice(...args),
  ...createHistorySlice(...args),
  ...createEventsSlice(...args),
  ...createConnectionSlice(...args),
}));
```

### Slice: Countries (Core Data)

```typescript
// store/countries.ts

export interface CountryData {
  countryCode: string;           // "BRA"
  countryName: string;           // "Brazil"
  flagEmoji: string;             // "🇧🇷"

  // Current market state
  yesPrice: number;              // Polymarket YES price in cents
  impliedProbability: number;    // 0-100
  lastUpdated: number;           // Unix ms

  // Computed deltas
  delta1m: number;               // Signed % change in 1 minute
  delta5m: number;
  delta1h: number;
  delta24h: number;

  // Market metrics
  volume24h: number;             // USD
  volume5m: number;
  spread: number;                // Bid-ask in cents
  liquidity: number;             // Order book depth in USD
  marketCount: number;           // Number of active contracts

  // Spatial
  centroid: [number, number];    // [lon, lat]
}

export interface CountriesSlice {
  countries: Map<string, CountryData>;
  updateCountries: (updates: CountryData[]) => void;
  getCountry: (code: string) => CountryData | undefined;
  getAllCountries: () => CountryData[];
}
```

### Slice: Rankings (Derived)

```typescript
// store/rankings.ts

export interface RankingsSlice {
  // Current ranking (sorted by impliedProbability desc)
  rankings: CountryData[];

  // Previous ranking (for animation diffs)
  previousRankings: CountryData[];

  // Squeeze pairs (adjacent countries with gap < 1%)
  squeezePairs: Array<{ upper: string; lower: string; gap: number }>;

  // Vibration triggers (countries with >1% change in one update)
  vibrationTriggers: Array<{
    countryCode: string;
    magnitude: number;
    direction: "up" | "down";
    timestamp: number;
  }>;

  // Derived
  recalculateRankings: () => void;
  getRank: (code: string) => number;
}
```

### Slice: Selection (Cross-Module)

```typescript
// store/selection.ts

export interface SelectionSlice {
  selectedCountry: string | null;  // Country code or null
  focusedModule: string | null;    // Which module initiated the selection

  selectCountry: (code: string, source: string) => void;
  deselectCountry: () => void;
  isSelected: (code: string) => boolean;
}
```

### Slice: History (Time Series)

```typescript
// store/history.ts

export interface HistoryPoint {
  timestamp: number;
  probability: number;
  volume: number;
}

export interface HistorySlice {
  // Raw history: per-country, full-resolution (last 24h only)
  history: Map<string, HistoryPoint[]>;

  // Aggregated history at multiple resolutions
  history1m: Map<string, HistoryPoint[]>;   // Per-minute, last 7 days
  history1h: Map<string, HistoryPoint[]>;   // Per-hour, last 30 days
  history1d: Map<string, HistoryPoint[]>;   // Per-day, all time

  appendHistoryPoint: (code: string, point: HistoryPoint) => void;
  getHistory: (code: string, resolution: "raw" | "1m" | "1h" | "1d") => HistoryPoint[];
  pruneHistory: () => void;  // Called every 5 min to aggregate old data
}
```

### Slice: Events (Markers)

```typescript
// store/events.ts

export interface ChartEvent {
  id: string;
  timestamp: number;
  type: "tournament" | "injury" | "volume_spike" | "price_shock" | "threshold" | "news";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  affectedCountries: string[];
  probabilityImpact?: Array<{
    countryCode: string;
    direction: "up" | "down";
    magnitude: number;
  }>;
}

export interface EventsSlice {
  events: ChartEvent[];
  eventFilter: string | null;       // Current filter: "tournament" | "volume_spike" | null
  addEvent: (event: ChartEvent) => void;
  setEventFilter: (filter: string | null) => void;
  getVisibleEvents: () => ChartEvent[];
}
```

### Slice: Connection (System Health)

```typescript
// store/connection.ts

export type ConnectionStatus = "connected" | "stale" | "disconnected" | "initializing";

export interface ConnectionSlice {
  status: ConnectionStatus;
  lastUpdateTimestamp: number | null;
  updateCount: number;              // Total number of updates received
  latency: number;                  // Last round-trip time in ms

  setStatus: (status: ConnectionStatus) => void;
  recordUpdate: (timestamp: number, latency: number) => void;
}
```

### Slice: Layout (Dashboard Configuration)

```typescript
// store/layout.ts

export interface GridSlot {
  id: string;                       // Unique slot ID
  moduleId: string;                 // Which module: "probability-map" | "ranking-flow" | ...
  position: { x: number; y: number }; // Grid coordinates
  size: { w: number; h: number };   // Grid dimensions
}

export interface LayoutPreset {
  id: string;
  name: string;                     // "Default", "Analysis", "Compact", "Map Focus"
  slots: GridSlot[];
}

export interface LayoutSlice {
  currentLayout: GridSlot[];
  presets: LayoutPreset[];
  activePresetId: string;

  setLayout: (slots: GridSlot[]) => void;
  addModule: (moduleId: string) => void;
  removeModule: (slotId: string) => void;
  resizeSlot: (slotId: string, size: { w: number; h: number }) => void;
  moveSlot: (slotId: string, position: { x: number; y: number }) => void;
  applyPreset: (presetId: string) => void;
  savePreset: (name: string) => void;
}
```

### Selector Pattern (Performance)

All module components use fine-grained selectors to avoid unnecessary re-renders:

```typescript
// Module A only subscribes to what it needs:
const countries = useStore(state => state.countries);
const selectedCountry = useStore(state => state.selectedCountry);
const connectionStatus = useStore(state => state.status);

// Module B additionally needs rankings:
const rankings = useStore(state => state.rankings);
const squeezePairs = useStore(state => state.squeezePairs);
const vibrationTriggers = useStore(state => state.vibrationTriggers);

// Module C additionally needs history and events:
const history = useStore(state => state.history);
const events = useStore(state => state.events);

// No module subscribes to layout — layout is handled by the DashboardGrid,
// which is the only component that reads layout state.
```

Zustand's default selector comparison (`Object.is`) ensures that a module only re-renders when its subscribed slice actually changes — not when any other slice changes. For example, Module A (the map) does not re-render when Module C's history data updates.

---

## 5. Data Pipeline: API → State → UI

### End-to-End Data Flow

```
 Polymarket CLOB WS ──┐
                      ├──► Backend Service ──► WebSocket ──► Zustand Store ──► React UI
 Polymarket REST ─────┘         │                  ▲              │              │
                                │                  │              │              │
                                ├─ Delta Engine    │              │              │
                                ├─ Event Detector  │              ├─ Module A ───┤
                                ├─ History Buffer  │              ├─ Module B ───┤
                                └─ Snapshot Cache  │              ├─ Module C ───┤
                                                   │              └─ Module D ───┘
                                                   │
                                          Client-side reconnection
                                          with exponential backoff
```

### Backend Service (Server)

The backend service bridges Polymarket's raw order book data and the client's visualization needs:

```
Technology: Node.js + Bun runtime + ws library

Responsibilities:
  1. Connect to Polymarket CLOB WebSocket for real-time order book updates.
  2. Poll Polymarket REST API for market listings and historical data.
  3. Maintain a unified state model for all 48 country markets.
  4. Compute deltas (1m, 5m, 1h, 24h) on each update.
  5. Detect events (threshold crosses, volume spikes, price shocks).
  6. Buffer historical data at multiple resolutions.
  7. Push differential updates to connected clients via WebSocket.
  8. Serve full snapshots for new client connections and REST fallback.

Connection count: Each backend instance can handle ~500-1000 concurrent
  WebSocket clients (lightweight — only pushes data, no client state beyond
  the WebSocket connection itself).
```

### WebSocket Message Protocol

```typescript
// ── Client → Server ──

// Subscribe to the data stream
interface SubscribeMessage {
  type: "subscribe";
  clientId: string;
  requestedModules: string[];  // Which modules the client will render
}

// Request a specific history range
interface HistoryRequestMessage {
  type: "history_request";
  countryCode: string;
  resolution: "raw" | "1m" | "1h" | "1d";
  from: number;  // Unix ms
  to: number;    // Unix ms
}

// ── Server → Client ──

// Full state snapshot (sent once on connection)
interface SnapshotMessage {
  type: "snapshot";
  timestamp: number;
  countries: CountryData[];
  rankings: CountryData[];     // Pre-sorted
  events: ChartEvent[];        // All known events
  history: Record<string, HistoryPoint[]>;  // Last 24h raw history
}

// Differential update (sent every ~3 seconds)
interface DeltaMessage {
  type: "delta";
  timestamp: number;
  sequenceNumber: number;      // Monotonic — detect missed updates
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
    historyPoint: HistoryPoint; // The new data point for this update cycle
  }>;
  newEvents: ChartEvent[];     // Any events detected in this cycle
}

// History response
interface HistoryResponseMessage {
  type: "history_response";
  countryCode: string;
  resolution: string;
  data: HistoryPoint[];
}
```

### Client WebSocket Manager

```typescript
// services/websocket.ts

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // 1 second
  private maxReconnectDelay = 30000;  // 30 seconds

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      useStore.getState().setStatus("connected");

      // Send subscribe message
      this.ws?.send(JSON.stringify({
        type: "subscribe",
        clientId: this.clientId,
        requestedModules: ["probability-map", "ranking-flow", "odds-timeline", "live-ticker"],
      }));
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      useStore.getState().setStatus("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror — reconnect handled there
    };
  }

  private handleMessage(msg: SnapshotMessage | DeltaMessage | HistoryResponseMessage) {
    const store = useStore.getState();
    const startTime = performance.now();

    switch (msg.type) {
      case "snapshot":
        store.updateCountries(msg.countries);
        store.recalculateRankings();  // This also computes squeezePairs
        // Batch history writes for performance
        for (const [code, points] of Object.entries(msg.history)) {
          // Points are already sorted chronologically
          store.batchAppendHistory(code, points);
        }
        break;

      case "delta":
        // Check sequence number for missed updates
        if (msg.sequenceNumber !== store.lastSequenceNumber + 1) {
          console.warn("Missed update(s) — requesting full snapshot");
          this.requestSnapshot();
          return;
        }
        store.lastSequenceNumber = msg.sequenceNumber;

        // Apply updates (single state mutation for all countries)
        store.updateCountriesFromDelta(msg.updates);

        // Append history points (batched)
        for (const update of msg.updates) {
          store.appendHistoryPoint(update.countryCode, update.historyPoint);
        }

        // Add any new events
        for (const event of msg.newEvents) {
          store.addEvent(event);
        }

        // Recalculate derived data
        store.recalculateRankings();
        // This triggers: rankings re-sort, squeezePairs recompute,
        // vibrationTriggers detection.

        // Record update metrics
        const latency = performance.now() - startTime;
        store.recordUpdate(msg.timestamp, latency);
        break;

      case "history_response":
        store.setHistoryForCountry(
          msg.countryCode,
          msg.resolution as "raw" | "1m" | "1h" | "1d",
          msg.data
        );
        break;
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    setTimeout(() => this.connect(this.url), delay);
  }

  private requestSnapshot() {
    // Fall back to REST API for a full snapshot
    fetch("/api/snapshot")
      .then(res => res.json())
      .then(snapshot => this.handleMessage(snapshot));
  }
}
```

### REST API Fallback

When WebSocket is unavailable (corporate firewall, proxy issues), the client falls back to REST polling:

```typescript
// services/restPoller.ts

class RestPoller {
  private intervalId: number | null = null;
  private pollInterval = 3000; // 3 seconds (same as WS push interval)

  start() {
    // Fetch initial snapshot
    this.fetchSnapshot();

    // Poll for deltas
    this.intervalId = window.setInterval(() => {
      this.fetchDelta();
    }, this.pollInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async fetchSnapshot() {
    const res = await fetch("/api/snapshot");
    const snapshot = await res.json();
    // Process same as WS snapshot message
  }

  private async fetchDelta() {
    const lastSeq = useStore.getState().lastSequenceNumber ?? 0;
    const res = await fetch(`/api/delta?since=${lastSeq}`);
    const delta = await res.json();
    // Process same as WS delta message
  }
}
```

---

## 6. Dashboard Layout System

### Grid Engine

The dashboard uses a **12-column CSS Grid** with 8px gap. Each module slot occupies a rectangular region defined by grid coordinates and spans. The layout is managed by `react-grid-layout` (or a custom lightweight implementation if bundle size is a concern).

```
Grid specification:
  Columns:      12
  Row height:   48px
  Gap:          8px
  Padding:      16px (left/right), 8px (top/bottom)
  Breakpoints:
    ≥ 1440px: 12 columns (full layout)
    1024-1439px: 8 columns (reduced)
    768-1023px: 4 columns (stacked)
    < 768px: 1 column (mobile — single module at a time)
```

### Default Layout Presets

**Preset 1: "Default" (Standard Trading View)**

```
┌────────────────────────────────────────────────────────────┐
│  Module D (Ticker)                         12 cols × 1 row │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                 │
│  Module A (Map)          │  Module B (Rankings)            │
│  8 cols × 6 rows         │  4 cols × 6 rows                │
│                          │                                 │
├──────────────────────────┴─────────────────────────────────┤
│                                                             │
│  Module C (Timeline)                      12 cols × 3 rows │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Preset 2: "Analysis" (Timeline Focus)**

```
┌────────────────────────────────────────────────────────────┐
│  Module D (Ticker)                         12 cols × 1 row │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Module C (Timeline)                      12 cols × 5 rows │
│                                                             │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                 │
│  Module A (Map)          │  Module B (Rankings)            │
│  7 cols × 3 rows         │  5 cols × 3 rows                │
│                          │                                 │
└──────────────────────────┴─────────────────────────────────┘
```

**Preset 3: "Compact" (Mobile / Sidebar)**

```
┌────────────────────────────────────────────────────────────┐
│  Module D (Ticker)                         12 cols × 1 row │
├────────────────────────────────────────────────────────────┤
│  Module B (Rankings)                      12 cols × 8 rows │
│  (scrollable)                                               │
└────────────────────────────────────────────────────────────┘

(Modules A and C accessible via tap-to-expand or swipe navigation.)
```

**Preset 4: "Map Focus" (Geospatial Analysis)**

```
┌────────────────────────────────────────────────────────────┐
│  Module D (Ticker)                         12 cols × 1 row │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Module A (Map)                            12 cols × 7 rows│
│                                                             │
├──────────────────────────┬─────────────────────────────────┤
│  Module B (Rankings)     │  Module C (Timeline)            │
│  4 cols × 4 rows         │  8 cols × 4 rows                │
└──────────────────────────┴─────────────────────────────────┘
```

### Layout Persistence

```
The current layout is persisted to localStorage under the key
"wcprediction-os:layout". On application mount, the stored layout
is loaded. If no stored layout exists, the "Default" preset is used.

Layout state includes:
  - activePresetId (or "custom" if user-modified)
  - slots array (id, moduleId, position, size)

When the user modifies the layout (drag, resize, add/remove module),
the layout is debounced (500ms) and saved to localStorage.

Preset switching:
  - Switching to a named preset overwrites the current layout.
  - The user can save their current layout as a custom preset
    (stored in localStorage alongside built-in presets).
  - Custom presets appear in the preset dropdown with a "✎" prefix.
```

### Module Add/Remove

A "+" button in the dashboard header opens a module picker:

```
┌─────────────────────────────────────┐
│  Add Module                         │
│                                     │
│  🗺  Probability Map                │
│     World map choropleth            │
│                                     │
│  📊  Ranking Dynamic Flow           │
│     Live leaderboard                │
│                                     │
│  📈  Odds Timeline                  │
│     Historical trends               │
│                                     │
│  📟  Live Ticker                    │
│     (already active)                │
│                                     │
│  [Cancel]                           │
└─────────────────────────────────────┘
```

Selecting a module inserts it into the grid at the first available space (bottom-right). The user can then drag it to the desired position. Modules can be instantiated multiple times (e.g., two Ranking Flows with different sort orders), but the default configuration includes one of each.

Each grid slot has a "⋮" handle for dragging and an "✕" button for removal. Removing the last instance of a module is allowed — the dashboard can function with any subset of modules.

---

## 7. Module Communication Protocol

### The Golden Rule

**Modules never communicate directly.** No module imports another module. No module calls another module's methods. No module reads another module's DOM state. All inter-module communication flows through the Zustand store.

### Selection State Propagation

This is the primary cross-module interaction. When a user selects a country in any module:

```
USER ACTION (e.g., clicks Brazil in Module A)
       │
       ▼
Module A calls: useStore.getState().selectCountry("BRA", "probability-map")
       │
       ▼
Zustand store updates: selectedCountry = "BRA", focusedModule = "probability-map"
       │
       ├────► Module A re-renders: spotlight Brazil, dim others
       ├────► Module B re-renders: scroll to Brazil, highlight row
       ├────► Module C re-renders: focus Brazil line, dim others
       └────► Module D re-renders: Brazil ticker item gets gold border
```

Each module subscribes to `selectedCountry` and reacts independently. The module that initiated the selection can check `focusedModule` to avoid redundant UI updates (e.g., if Module A already has Brazil spotlighted, it doesn't re-trigger the spotlight animation when `selectedCountry` changes to "BRA" from Module B).

### Selection Code Example

```typescript
// Inside Module B (RankingFlow) — when a row is clicked:

function handleRowClick(countryCode: string) {
  const store = useStore.getState();

  if (store.selectedCountry === countryCode) {
    // Clicking the already-selected country deselects it
    store.deselectCountry();
  } else {
    store.selectCountry(countryCode, "ranking-flow");
  }
}

// Inside Module A (ProbabilityMap) — reacting to selection:

function ModuleA_ProbabilityMap() {
  const selectedCountry = useStore(state => state.selectedCountry);
  const focusedModule = useStore(state => state.focusedModule);
  const countries = useStore(state => state.countries);

  // React to selection changes
  useEffect(() => {
    if (selectedCountry && focusedModule !== "probability-map") {
      // Selection came from another module — animate spotlight to this country
      animateSpotlightTo(selectedCountry);
    }
    if (!selectedCountry) {
      // Deselection — remove spotlight
      removeSpotlight();
    }
  }, [selectedCountry, focusedModule]);

  // ... render logic
}
```

### URL Deep-Linking

The selection state is reflected in the URL hash for shareable links:

```
https://worldcup-prediction.app/#BRA

On mount, the app reads the hash and calls:
  useStore.getState().selectCountry("BRA", "url");
```

This enables:
- Bookmarking a specific country view.
- Sharing a link: "Check out Brazil's odds: https://..."
- Browser back/forward navigation through selection history.

### Cross-Module Timing Coordination

When a global event occurs (e.g., a price shock detected by the backend), all modules should reflect it simultaneously — not staggered by individual render cycles. This is achieved by:

```
1. The WebSocket manager receives a delta message.
2. It calls store.updateCountriesFromDelta() — a SINGLE state mutation
   that updates all country data at once.
3. Zustand notifies all subscribers in the same microtask.
4. React batches all re-renders into a single commit.
5. All four modules paint their updates in the same frame.

The user sees all four modules update simultaneously — the map flashes,
the ranking shifts, the timeline extends, and the ticker surges — all
within the same 16ms frame.
```

---

## 8. Real-Time Update Lifecycle

### A Single Update Cycle (Step by Step)

```
T=0ms      Polymarket CLOB WebSocket emits an order book update for
           the "Brazil wins World Cup" market. YES token price changes
           from 17.8¢ to 18.3¢.

T=5ms      Backend service receives the CLOB event. Updates its internal
           state for Brazil:
             yesPrice: 17.8 → 18.3
             impliedProbability: 17.8% → 18.3%

T=10ms     Backend delta engine computes:
             delta1m:  +0.12%
             delta5m:  +0.58%
             delta1h:   +1.84%
             delta24h:  +3.21%

T=15ms     Backend event detector runs:
             - threshold check: 18.3% has not crossed 20%, 25%, 50% → no event.
             - volume spike check: current 5m volume vs 24h avg → no spike.
             - price shock check: |Δ5m| = 0.58% < 2% → no shock.
             → No new events generated.

T=20ms     Backend buffers this update. It will be included in the next
           delta push at the 3-second cycle boundary.

T=2700ms   The 3-second cycle boundary arrives. Backend assembles a delta
           message with all updates from the last 3 seconds. Sends to
           all connected WebSocket clients.

T=2750ms   Client WebSocket manager receives the delta message.
           Calls store.updateCountriesFromDelta([...]).
           Brazil's probability is now 18.3% (up from 17.8%).

T=2752ms   Zustand notifies all subscribers.

T=2755ms   React reconciliation begins.

           Module A (Map):
             - Brazil's fill color lerps from old color to new color (600ms).
             - Brazil's glow breathing amplitude adjusts.
             - Brazil's particles (if they were falling before) now shift
               to inward drift (probability is rising).

           Module B (Rankings):
             - Brazil's data bar extends: 17.8% width → 18.3% width (400ms, overshoot).
             - Brazil's delta indicator updates: ▼0.2% → ▲0.5% (color: red → green).
             - Brazil's sparkline appends a new data point (200ms write-on).
             - Check: does rank change? Brazil was #2, still #2. No rank animation.
             - Check: squeeze? Gap to #1 Argentina was 3.8%, now 3.8%. No squeeze change.
             - Check: vibration? Δ = 0.5%. Not ≥ 1%. No vibration.

           Module C (Timeline):
             - Brazil's line extends rightward by one interval (200ms write-on).
             - The new segment's acceleration is computed: slope is positive,
               line brightens slightly along the new segment.
             - Y-axis check: max probability across all lines is still 22.1%.
               No rescale needed.

           Module D (Ticker):
             - Brazil's ticker item: probability odometer rolls 17.8 → 18.3.
             - Delta changes: ▼0.2% → ▲0.5%. Arrow flips from red ▼ to green ▲.
             - Direction bar transitions from red to green (400ms).
             - Speed multiplier recalculated: change_factor increases slightly.
             - Brazil's item marginally accelerates in the stream.

T=2800ms   React commit complete. All modules painted.
           Total latency from Polymarket event to screen: ~2.8 seconds.
           (Bottleneck is the 3-second push interval — configurable.)

T=2800ms   The user sees Brazil's probability tick up across all four modules
           simultaneously. The map's Brazil glow brightens, the ranking bar
           extends with a satisfying bounce, the timeline line curves upward,
           and the ticker item flashes green.
```

### Performance Optimizations

```
1. BATCHED STATE UPDATES
   A single delta message updates all countries in one store.setState() call.
   This prevents N re-renders for N countries — one re-render for all.

2. SELECTOR ISOLATION
   Module A subscribes to: countries, selectedCountry, status.
   Module B subscribes to: rankings, squeezePairs, vibrationTriggers, selectedCountry.
   Module C subscribes to: countries, history, events, selectedCountry.
   Module D subscribes to: countries, lastUpdateTimestamp, selectedCountry.

   When countries update, all four modules re-render — but that's correct
   because they all display country data. The point is that Module B does
   NOT re-render when history updates, and Module C does NOT re-render
   when squeezePairs updates.

3. CANVAS ISOLATION
   Module A (WebGL) and Module C (Canvas 2D) render on their own rAF loops,
   decoupled from React's render cycle. They subscribe to store changes
   via useEffect and schedule Canvas redraws independently.

4. DOM ANIMATION ISOLATION
   Module B's ranking animations run on framer-motion (GPU-composited
   transforms). Module D's ticker scroll runs on its own rAF loop.
   Neither triggers React re-renders during animation playback.

5. WEB WORKER OFFLOAD
   The delta computation (ranking, squeeze pairs, vibration detection)
   is fast enough to run on the main thread (< 2ms for 48 countries).
   But if the dataset grows, this can be moved to a Web Worker.
```

---

## 9. Build & Deployment Architecture

### Build Configuration

```
Vite Configuration Highlights:

  - Code splitting: Each module is a separate chunk (lazy-loaded).
  - Vendor chunk: React, deck.gl, d3-geo, framer-motion in a shared vendor bundle.
  - Tree shaking: deck.gl layers are imported individually (not the full library).
  - CSS: Tailwind purges unused classes. Custom CSS variables injected via :root.
  - Target: ES2020+ (modern browsers only — no IE11, no legacy Edge).
  - Source maps: Enabled in development, disabled in production.

Bundle size estimates (gzipped):
  Vendor (React + deps):     ~45 KB
  Module A (deck.gl + geo):  ~120 KB
  Module B (React + motion): ~15 KB
  Module C (Canvas 2D):      ~12 KB
  Module D (DOM + rAF):      ~8 KB
  Core (store + layout):     ~10 KB
  ─────────────────────────────────
  Total (initial load):      ~90 KB (vendor + core + Module D + Module B)
  Total (full load):         ~210 KB

  Initial load is fast because Module A (the heaviest) is lazy-loaded.
  The user sees the ticker and rankings within ~500ms. The map loads
  progressively afterward.
```

### Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CDN (Cloudflare)                     │
│                                                          │
│  Static assets: HTML, JS chunks, CSS, fonts, GeoJSON     │
│  Cached at edge. Cache-Control: immutable for hashed     │
│  assets, no-cache for index.html.                        │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────┐
│              Backend Service (Fly.io / Railway)           │
│                                                          │
│  Single Node.js/Bun process:                             │
│    - Serves /api/ws (WebSocket upgrades)                 │
│    - Serves /api/snapshot, /api/history, /api/events     │
│    - Connects to Polymarket CLOB WS                      │
│    - Runs delta engine and event detector                │
│                                                          │
│  Scaling: 1-3 instances behind a load balancer.          │
│  WebSocket connections are sticky (routed to the         │
│  same instance for the session duration).                │
└──────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────┐
│                  Polymarket API (External)                │
│                                                          │
│  CLOB WebSocket: wss://ws.polymarket.com/...             │
│  REST API:       https://api.polymarket.com/...          │
│                                                          │
│  One connection from each backend instance.              │
└──────────────────────────────────────────────────────────┘
```

### Environment Variables

```bash
# .env.production
VITE_WS_URL=wss://api.worldcup-prediction.app/ws
VITE_API_URL=https://api.worldcup-prediction.app
VITE_POLYMARKET_API_KEY=pk_xxxxxxxx
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_MEASUREMENT_ID=G-XXXXXXXX
```

### Monitoring & Observability

```
- Sentry: Client-side error tracking + performance monitoring.
- Backend logging: Structured JSON logs to stdout → captured by
  the hosting platform (Fly.io / Railway).
- WebSocket health: Metrics on connection count, message rate,
  latency percentiles, reconnection frequency.
- Polymarket API health: Upstream latency, error rate, rate-limit
  status.
- Client analytics: Page views, module engagement (which modules
  are viewed most, which countries are selected most), session
  duration. Via Google Analytics 4 or Plausible (privacy-first).
```

---

*End of System Architecture Specification*
