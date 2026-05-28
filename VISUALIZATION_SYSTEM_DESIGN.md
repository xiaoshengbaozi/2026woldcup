# 2026 FIFA World Cup Champion Prediction Market — Visualization System Design Specification

**Version:** 1.0
**Date:** 2026-05-27
**Data Source:** Polymarket (prediction market prices / implied probabilities)
**Design Lineage:** Bloomberg Terminal × Apple Sports × FIFA World Cup × Data Art

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Information Architecture](#2-information-architecture)
3. [Data Model & Real-Time Pipeline](#3-data-model--real-time-pipeline)
4. [Visual System](#4-visual-system)
5. [Module A — World Cup Champion Probability Map](#5-module-a--world-cup-champion-probability-map)
6. [Module B — Country Ranking Dynamic Flow](#6-module-b--country-ranking-dynamic-flow)
7. [Module C — Timeline Odds Changes](#7-module-c--timeline-odds-changes)
8. [Module D — Heat Animation Ticker System](#8-module-d--heat-animation-ticker-system)
9. [Interaction Logic](#9-interaction-logic)
10. [Animation & Motion Language](#10-animation--motion-language)
11. [Responsive Layout Strategy](#11-responsive-layout-strategy)
12. [Technical Architecture Notes](#12-technical-architecture-notes)

---

## 1. Design Philosophy

### Core Principle: The Market Breathes

This is not a dashboard. This is a **living market organism**. Every pixel should feel like it has a heartbeat. The system treats prediction market data the way a Bloomberg Terminal treats financial instruments — with gravity, precision, and zero latency. But unlike Bloomberg's cold austerity, the FIFA context demands celebration, national pride, and the theatrical tension of tournament football.

### Five Design Tenets

1. **Price as Pulse.** Every data point has a direction and a velocity. Static numbers are dead numbers. A probability of 18.3% means nothing without knowing it was 14.1% an hour ago. The system must always answer: *what changed, by how much, and how fast?*

2. **Spatial = Intuitive.** Geography is the most natural mental model for a World Cup. Countries live on maps. Rankings live on leaderboards. Timelines live on ... timelines. No clever abstractions that require learning.

3. **Dark as Canvas.** A deep, pitch-black background (Bloomberg DNA) makes data pop. Color is strictly rationed — it is only deployed to signal *change*, *rank*, or *alert*. Color is information, not decoration.

4. **Motion is Meaning.** Every animation is semantic. A country rising in rank doesn't just snap to a new position — it *surges upward with momentum*. A probability drop doesn't just become a smaller number — it *bleeds red and contracts*. Motion explains the data.

5. **Terminal-Grade Density.** This is for people who want to *watch the market*, not glance at a score. Information density is high but organized. Think: the top section of a Bloomberg terminal, not a consumer weather app.

---

## 2. Information Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      GLOBAL TICKER BAR (Module D)                │
│  [BRA ▲2.1%] [FRA ▼0.8%] [ARG —] [ENG ▲1.4%] [GER ▼3.2%] ...  │
│  Continuous horizontal scroll — always-on, lowest-latency data   │
├────────────────────┬─────────────────────────────────────────────┤
│                    │                                             │
│  MODULE A          │  MODULE B                                   │
│  Probability Map   │  Ranking Dynamic Flow                       │
│  (60% width)       │  (40% width)                                │
│                    │                                             │
│  — World map       │  — Vertical ordered list                    │
│  — Choropleth by   │  — Animated position changes                │
│    probability     │  — Sparkline per country                    │
│  — Hover tooltip   │  — Sort/filter controls                     │
│                    │                                             │
├────────────────────┴─────────────────────────────────────────────┤
│                                                                  │
│  MODULE C                                                        │
│  Timeline Odds Changes                                           │
│                                                                  │
│  — Multi-line time series (1 line per top-N country)             │
│  — Interactive scrub with event markers                          │
│  — Zoom/pan controls                                             │
│  — "Since kickoff" / "7d" / "30d" / "All" time presets          │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  STATUS BAR                                                      │
│  Last update: 14:32:05 EST  |  Refresh: 3.2s  |  Source: Poly-  │
│  market  |  Vol: $142M  |  Most active: Brazil (+$2.3M in 1hr)  │
└──────────────────────────────────────────────────────────────────┘
```

### Layout Rationale

The layout follows a **Z-pattern reading flow** (top-left → top-right → bottom). The ticker bar at the top is the entry point — it hooks attention with motion and raw price action. The eye then moves to the map (spatial overview), then the ranking (ordinal detail), then the timeline (temporal depth). The status bar at the bottom provides system-level metadata (like a terminal's command line).

### Hierarchy of Information

| Layer | Purpose | Update Frequency | Visual Weight |
|-------|---------|------------------|---------------|
| Ticker (D) | Raw price action, alerts | ~1 second | High motion, medium prominence |
| Map (A) | Spatial probability distribution | ~3 seconds | High prominence, low motion |
| Rankings (B) | Ordinal comparison, rank delta | ~3 seconds | Medium prominence, high motion (on change) |
| Timeline (C) | Historical context, trend analysis | Per data point append | Medium prominence, low motion |
| Status Bar | System metadata | ~1 second | Low prominence, no motion |

---

## 3. Data Model & Real-Time Pipeline

### Core Data Entity

```typescript
interface CountryMarketData {
  countryCode: string;        // ISO 3166-1 alpha-3: "BRA", "FRA", "ARG"
  countryName: string;        // Display name: "Brazil"
  flagEmoji: string;          // "🇧🇷"

  // Current state
  yesPrice: number;           // Polymarket YES token price in cents (0-100)
  noPrice: number;            // Polymarket NO token price
  impliedProbability: number; // yesPrice as percentage (0-100)
  lastUpdated: number;        // Unix ms timestamp

  // Delta (for motion/animation)
  probChange1m: number;       // Probability change in last 1 minute (signed %)
  probChange5m: number;       // Last 5 minutes
  probChange1h: number;       // Last 1 hour
  probChange24h: number;      // Last 24 hours

  // Market metrics
  volume24h: number;          // 24h USD volume
  liquidity: number;          // Order book depth (USD)
  spread: number;             // Bid-ask spread in cents

  // Rank
  currentRank: number;        // Current rank by implied probability
  previousRank: number;       // Previous rank (for flow animation)
  rankDelta: number;          // Signed change in rank

  // Historical
  probabilityHistory: Array<{  // Time series (for Module C)
    timestamp: number;
    probability: number;
    volume: number;
  }>;

  // Geo
  centroid: [number, number]; // [longitude, latitude] for map placement
}
```

### Data Pipeline Architecture

```
Polymarket API (REST + WebSocket)
         │
         ▼
┌─────────────────────┐
│   Data Ingestor     │  Polls REST every 3s, subscribes to WS for
│   (Server-side)     │  order book events. Normalizes to CountryMarketData.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Delta Engine      │  Computes all change metrics (1m, 5m, 1h, 24h).
│                     │  Detects significant events (threshold crossings).
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Broadcast Bus     │  Server-Sent Events or WebSocket to all clients.
│                     │  Pushes full snapshot on connect, diffs thereafter.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Client Store      │  Zustand/Redux store. Maintains current state +
│   (Browser)         │  ring buffer of last N states for animation interp.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Animation Sched-  │  requestAnimationFrame loop. Interpolates between
│   uler              │  last-known and new state over ~600-900ms.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Render Layer      │  Canvas (Module A + C) + DOM (Module B + D).
│   (React + Canvas)  │  Canvas for high-frequency updates, DOM for text.
└─────────────────────┘
```

### Update Cadence by Module

| Module | Render Tech | Update Trigger | Animation Duration |
|--------|-------------|----------------|-------------------|
| D (Ticker) | DOM + CSS | Per tick (~1s) | 15s scroll loop |
| A (Map) | Canvas (WebGL) | Per snapshot (~3s) | 600ms color transition |
| B (Rankings) | DOM (CSS transitions) | On rank change | 400ms position + 300ms sparkline |
| C (Timeline) | Canvas (2D) | On new data point | 200ms line extend |

---

## 4. Visual System

### Color Palette

```
┌─────────────────────────────────────────────────────┐
│  BACKGROUND                                         │
│  Primary:     #0A0A0F  (pitch black with blue hint) │
│  Secondary:   #14141F  (card surfaces)              │
│  Tertiary:    #1C1C2E  (hover states, dividers)     │
│                                                     │
│  DATA — Probability Scale (sequential, green→gold)  │
│  0-5%:        #1A3A2A  (barely lit emerald)         │
│  5-15%:       #1E5631  (deep green)                 │
│  15-25%:      #4C9A2A  (mid green)                  │
│  25-40%:      #8BC34A  (vibrant green)              │
│  40-60%:      #CDDC39  (yellow-green, tipping point)│
│  60-75%:      #FFC107  (amber/gold)                 │
│  75-90%:      #FF9800  (deep orange)                │
│  90-100%:     #FF5722  (burning orange, near-certain)│
│                                                     │
│  DATA — Direction (for delta/change)                │
│  Positive:    #00E676  (electric green, ▲ UP)       │
│  Negative:    #FF1744  (sharp red, ▼ DOWN)          │
│  Neutral:     #78909C  (blue-grey, — flat)          │
│                                                     │
│  ACCENT                                            │
│  Gold (FIFA): #FFD700  (trophy, top-1 highlight)    │
│  Silver:      #C0C0C0  (top-2)                      │
│  Bronze:      #CD7F32  (top-3)                      │
│  Alert:       #FF3D00  (critical threshold breaks)  │
│                                                     │
│  TYPOGRAPHY COLORS                                  │
│  Primary:     #EAEAEA  (main text)                  │
│  Secondary:   #8899AA  (labels, metadata)           │
│  Muted:       #556677  (grid lines, borders)        │
└─────────────────────────────────────────────────────┘
```

### Typography

```
Family:        "JetBrains Mono" (monospace, for numbers & ticker)
               "Inter" (sans-serif, for labels, country names, UI)
               "Inter Display" (for large probability percentages)

Scale (modular, 1.25 ratio):
  Ticker item:   11px JetBrains Mono
  Country name:  13px Inter (Medium)
  Rank number:   18px Inter (Bold)
  Probability:   24px JetBrains Mono (Tablular Lining)
  Module title:  11px Inter (SemiBold), uppercase, letter-spacing: 0.15em
  Section header: 10px Inter (SemiBold), uppercase, letter-spacing: 0.2em
```

### Layout Grid

- 12-column grid, 8px baseline
- Module padding: 16px internal, 8px inter-module gap
- 1px borders: `#1C1C2E` (subtle, never `#FFFFFF` — Bloomberg rule)

### Iconography

- All directional indicators use Unicode triangles: ▲ ▼ ▶ ◀
- Country flags: Emoji native rendering (Twemoji fallback for consistency)
- Status indicators: ● (live pulse, green), ◉ (stale, amber), ○ (disconnected, grey)

---

## 5. Module A — World Cup Champion Probability Map

### Purpose

Show the spatial distribution of championship probability. The map answers: *where is the market's confidence concentrated?* A choropleth world map where each qualified (or potentially qualified) country is shaded by its current implied probability.

### UI Structure

```
┌─────────────────────────────────────────────────────────┐
│  CHAMPIONSHIP PROBABILITY MAP           [🌐 Globe] [📍 Flat] │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │              🇨🇦                                │   │
│  │          ████████ 12.4%                         │   │
│  │                                                 │   │
│  │                         🇬🇧                     │   │
│  │   🇺🇸                  ████  5.1%               │   │
│  │  ██████  9.8%                                   │   │
│  │                                   🇩🇪           │   │
│  │   🇲🇽                             ████ 4.8%     │   │
│  │   ██ 2.1%                          🇫🇷          │   │
│  │                                 ████████ 11.2%  │   │
│  │                       🇮🇹                       │   │
│  │     🇧🇷               ████ 5.5%                 │   │
│  │  ██████████ 18.3%                   🇯🇵         │   │
│  │                                     ██ 1.9%     │   │
│  │            🇦🇷                                   │   │
│  │        ██████████████ 22.1%                     │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Legend: ▓▓▓▓▓▓▓▓▓▓ 0% ───────────────── 100% ▓▓▓▓▓▓▓ │
│                                                         │
│  Hover: [ARG] Argentina | Prob: 22.1% (▲2.3% 1hr)      │
│         Vol: $14.2M | Rank #1 | 5m trend: ↗            │
└─────────────────────────────────────────────────────────┘
```

### Visual Encoding

- **Country fill color:** Mapped to `impliedProbability` using the probability color scale (dark green → gold → orange). Non-qualified countries are `#0D0D18` (nearly invisible against background).
- **Country stroke:** 0.5px `#2A2A3A` for all countries; qualified countries with probability > 5% get a subtle glow stroke (see glow effect below).
- **Probability label:** Positioned at country centroid. Font size scales with probability (min 9px, max 18px). Opacity scales with probability (min 0.4, max 1.0).
- **Flag emoji:** Displayed adjacent to probability label for top-10 countries only (reduces visual noise).

### Glow Effect (Top Countries)

Countries with probability > 15% emit a subtle radial glow that pulses with a period of ~3 seconds (breathing effect). The glow color matches the probability color scale at that level. Glow intensity is proportional to probability.

```
CSS-like pseudocode:
  box-shadow: 0 0 [prob * 0.8]px [prob_color]40;
  animation: country-glow 3s ease-in-out infinite;

  @keyframes country-glow {
    0%, 100% { glow-opacity: 0.3; }
    50%      { glow-opacity: 0.6; }
  }
```

### Dynamic Behavior

1. **On probability change:** Country fill color lerps from old color to new color over 600ms (ease-out). The probability label number "rolls up" like an odometer — each digit transitions independently.

2. **On significant change (>2% in 5min):** A ripple effect emanates from the country centroid — a circle that expands outward and fades over 1.5 seconds (think: radar ping).

3. **On hover:** Country stroke brightens to `#FFFFFF` at 0.8 opacity. A tooltip card appears (anchored to cursor with 12px offset). All other countries dim to 30% opacity (spotlight effect).

4. **Map projection toggle:** Globe view uses Orthographic projection (3D sphere, draggable rotation). Flat view uses Natural Earth projection. Toggle button in top-right corner. Transition between projections is a 400ms morph (d3-geo projection interpolation).

### Interaction

| Gesture | Action |
|---------|--------|
| Hover country | Tooltip + spotlight dim |
| Click country | Pin country → Module B scrolls to it, Module C highlights its line |
| Drag (globe mode) | Rotate globe |
| Scroll | Zoom in/out (globe) or pan vertical (flat) |
| Double-click country | Open external Polymarket page for that market |
| Click empty ocean | Deselect, reset spotlight |

---

## 6. Module B — Country Ranking Dynamic Flow

### Purpose

A vertically ordered leaderboard that shows the current ranking by implied probability, with animated position changes. This is the most "Apple Sports" module — clean, kinetic, satisfying to watch.

### UI Structure

```
┌──────────────────────────────────────────┐
│  CHAMPIONSHIP RANKINGS     [Prob ▼] [Δ1h]│
│                                          │
│  #1  🇦🇷 Argentina   22.1%  ▲2.3  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                          │
│  #2  🇧🇷 Brazil      18.3%  ▼0.8  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │
│                                          │
│  #3  🇫🇷 France      12.4%  ▼1.1  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│                                          │
│  #4  🇪🇸 Spain       11.2%  ▲0.4  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                │
│                                          │
│  #5  🇺🇸 USA          9.8%  ▲5.2  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                    │
│                                          │
│  #6  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England     8.6%  ▼0.2  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓                      │
│                                          │
│  #7  🇩🇪 Germany      7.1%  ▼2.7  ──────│
│      ▓▓▓▓▓▓▓▓▓▓▓                        │
│                                          │
│  #8  🇳🇱 Netherlands  5.5%  ▲1.8  ──────│
│      ▓▓▓▓▓▓▓▓▓                          │
│                                          │
│  #9  🇵🇹 Portugal     4.2%  ▲0.6  ──────│
│      ▓▓▓▓▓▓▓▓                           │
│                                          │
│  #10 🇧🇪 Belgium      3.8%  ▼0.3  ──────│
│      ▓▓▓▓▓▓▓                            │
│                                          │
│          (scroll for more)               │
└──────────────────────────────────────────┘
```

### Row Anatomy

Each row is 48px tall and contains:

```
┌────┬────┬──────────────────┬────────┬────────┬──────────────────┐
│Rank│Flag│  Country Name    │  Prob  │ Delta  │  Mini Sparkline  │
│ 8px│24px│  120px (flex)    │ 64px   │ 56px   │  80px (flex)     │
└────┴────┴──────────────────┴────────┴────────┴──────────────────┘
```

- **Rank number:** 18px Inter Bold. Gold (#FFD700) for #1, Silver for #2, Bronze for #3, `#8899AA` for #4+.
- **Flag + Country Name:** Flag emoji (rendered consistently via Twemoji), country name in Inter Medium 13px.
- **Probability:** JetBrains Mono 16px, right-aligned.
- **Delta:** Directional arrow (▲▼) + signed percentage in 12px JetBrains Mono. Color: `#00E676` for positive, `#FF1744` for negative.
- **Mini Sparkline:** An 80×20px canvas sparkline showing probability trend over last 24 hours. Line color matches current direction (green/red). Fill is a subtle gradient from line color to transparent (10% opacity at top).

### Dynamic Behavior (The "Flow")

This is the centerpiece animation of Module B.

**When ranking changes occur:**

1. **Exit animation (300ms):** The row that is about to move fades to 60% opacity and slightly blurs (filter: blur(1px)).

2. **Position animation (500ms, spring physics):** The row translates vertically to its new position using spring-based animation (stiffness: 180, damping: 22). This creates a natural "bounce" at the destination — not clinical linear movement.

3. **Entry animation (200ms):** Row snaps to full opacity, blur removed. The rank number "flips" like a split-flap display board (old number flips down, new number flips up).

4. **Neighbor adjustment (400ms, ease-out):** The rows that were displaced slide to fill the gap.

5. **Sparkline update (300ms):** Each row's sparkline appends a new data point from the right, shifting left. New segment draws in with a "write-on" effect.

**Performance strategy:** Use CSS `transform: translateY()` for position changes (GPU-composited, no layout thrash). The DOM order is NOT re-sorted — instead, each row has a `transform: translateY(calc(var(--rank) * 48px))` that updates. This avoids React reconciliation overhead.

### Sort Controls

In the module header, clickable sort options:
- **Prob ▼** (default): Sort by implied probability descending
- **Δ1h:** Sort by 1-hour change (absolute magnitude)
- **Δ24h:** Sort by 24-hour change
- **Vol:** Sort by 24h volume

Clicking the active sort toggles ascending/descending. Sort change triggers a full re-ranking animation (all rows animate simultaneously, staggered by 50ms per row for a "wave" effect).

### Visual Treatments for Special States

- **New entry to top-10:** Row enters with a gold border-left accent that fades over 3 seconds.
- **Falling out of top-10:** Row slides downward and off-screen with reduced opacity (exit animation, 500ms).
- **Crossing a threshold** (e.g., probability crosses 10%, 25%, 50%): A brief gold flash (200ms) on the probability number + a subtle "ding" haptic-style visual ring.

---

## 7. Module C — Timeline Odds Changes

### Purpose

Show the evolution of championship probabilities over time for the top-N countries. This is the analytical module — the one where users go to understand *why* the market moved.

### UI Structure

```
┌──────────────────────────────────────────────────────────────┐
│  ODDS TIMELINE      [7D] [30D] [90D] [ALL]  [⏎ Event: All] │
│                                                              │
│  25% ┤                                              ╭──🇦🇷  │
│      │                                    ╭────────╯        │
│  20% ┤                    ╭───────────────╯                 │
│      │     ╭─────────────╯            🇧🇷                   │
│  15% ┤    ╯            ╭────────────────────────────────    │
│      │   🇧🇷           │   🇫🇷                              │
│  10% ┤────────────────╯─────────────────────────── 🇫🇷     │
│      │     ╭🇪🇸                                    🇪🇸     │
│   5% ┤────╯─────────────────────────────────────────────    │
│      │                           ╭🇺🇸                       │
│   0% ┤──────────────────────────╯───────────────────────    │
│      ├────┬────┬────┬────┬────┬────┬────┬────┬────┬────┤    │
│     Mar   Apr   Apr   May   May   May   May   May   May    │
│      1    15     1    15    Jun    Jun    Jun   ???   ???   │
│                              1     15     ??                │
│                                                              │
│  █ EVENT: Quarterfinal Draw    █ EVENT: Semifinal Results    │
│         (May 5)                       (May 20)               │
│                                                              │
│  Legend: ─🇦🇷 Argentina  ─🇧🇷 Brazil  ─🇫🇷 France  ─🇪🇸 Spain │
│          ─🇺🇸 USA        (+5 more toggled off — click to show)│
│                                                              │
│  [Click & drag to pan] [Scroll to zoom] [Double-click reset] │
└──────────────────────────────────────────────────────────────┘
```

### Visual Encoding

- **X-axis:** Time. Dynamic range based on selected preset (7D/30D/90D/All). Tick marks at appropriate intervals (daily for 7D, weekly for 30D, monthly for 90D+). Axis rendered in `#556677`, 10px Inter.
- **Y-axis:** Probability percentage (0% to ceiling of current max probability + 5% headroom). Dynamic scale — the y-axis range adjusts as the max probability changes, animated smoothly.
- **Lines:** One line per country. Line color is a fixed hue assigned per country from a categorical palette (distinct from the probability heatmap colors — this is about identity, not magnitude). Line width: 1.5px default, 3px on hover.
- **Event markers:** Vertical dashed lines at significant dates (draws, major matches, announcements). Labels above the chart area. Marker line in `#FFD700` at 40% opacity.
- **Confidence band:** For the top-3 countries, a subtle gradient fill below the line (line color at 15% opacity at top, 0% at baseline). This gives a "volume" feel without being a full area chart.

### Country Color Palette (Categorical, for lines)

```
Argentina:   #75AADB  (light blue, flag-inspired)
Brazil:      #F4A460  (sand/gold, flag-inspired)
France:      #4169E1  (royal blue)
Spain:       #E63946  (Spanish red)
USA:         #B22234  (American red)
England:     #FFFFFF  (white, rendered on dark bg)
Germany:     #2B2B2B  (dark grey with white outline)
Netherlands: #FF6B00  (orange)
Portugal:    #A93226  (burgundy)
Belgium:     #FFD700  (gold, with dark outline)
...
```

### Interaction

| Gesture | Action |
|---------|--------|
| Hover line | Line widens to 3px, other lines dim to 15% opacity, tooltip shows exact value |
| Click line | Toggle country visibility (line + legend highlight) |
| Drag horizontally | Pan the time axis |
| Scroll vertically | Zoom time axis in/out |
| Double-click | Reset to default view (all top-5 visible, 7D range) |
| Hover event marker | Tooltip shows event title + date + impact summary |

### Dynamic Behavior

1. **New data point arrives:** Each visible line extends rightward by one interval. The extension is drawn with a "write-on" effect: the new segment animates from 0 to full length over 200ms (stroke-dashoffset trick for SVG, or progressive draw for Canvas).

2. **Line crossover:** When one country's line crosses another's (e.g., Brazil overtakes France), a subtle "spark" animation occurs at the intersection point — a small burst of particles in the color of the overtaking country. This draws attention to the leadership change.

3. **Time range change:** When the user switches from 7D to 30D, the existing lines smoothly morph — the x-axis scale animates, and line points interpolate to their new positions (600ms, ease-in-out). Event markers slide into view.

4. **Y-axis rescale:** When a country's probability surges above the current y-max, the axis smoothly expands upward over 400ms, maintaining the relative positions of all other lines.

### Event Markers

Event markers are manually curated (or sourced from an API of FIFA/soccer events). Each marker has:
- **date:** ISO date
- **title:** "Quarterfinal Draw", "Brazil vs Argentina Friendly", "Mbappe Injury News"
- **impact:** Optional string describing expected market impact: "High", "Medium", "Low"
- **affectedCountries:** Array of country codes whose lines showed significant movement after this event

Markers are rendered as diamond shapes (◆) in `#FFD700` above the chart area, with a vertical dashed guideline extending through the chart.

---

## 8. Module D — Heat Animation Ticker System

### Purpose

A continuously scrolling ticker bar at the very top of the screen that shows real-time probability changes for all tracked countries. This is the "market heartbeat" — always in motion, always showing direction and magnitude. Borrows the Bloomberg stock ticker metaphor but applied to prediction markets.

### UI Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◀ SCROLL ▶                                                                  │
│                                                                              │
│ 🇦🇷ARG 22.1% ▲2.3 │ 🇧🇷BRA 18.3% ▼0.8 │ 🇫🇷FRA 12.4% ▼1.1 │ 🇪🇸ESP 11.2% ▲0.4 │
│ ──────────────────  ─────────────────  ─────────────────  ─────────────────  │
│                                                                              │
│ 🇺🇸USA  9.8% ▲5.2 │ 🏴󠁧󠁢󠁥󠁮󠁧󠁿ENG  8.6% ▼0.2 │ 🇩🇪GER  7.1% ▼2.7 │ 🇳🇱NED  5.5% ▲1.8 │
│ ──────────────────  ─────────────────  ─────────────────  ─────────────────  │
│                                                                              │
│  ... (continuous)                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Ticker Item Anatomy

Each ticker item is a self-contained data block:

```
┌──────────────────────────────┐
│ 🇧🇷 BRA  18.3%  ▼0.8          │
│ ──────────────────────────── │  ← bottom border, color-coded by direction
└──────────────────────────────┘
```

Components within each item:
- **Flag + Country Code:** 11px Inter SemiBold, `#EAEAEA`. Country code is the 3-letter ISO code (not full name, for density).
- **Probability:** 13px JetBrains Mono, `#FFFFFF`. The current implied probability.
- **Direction arrow + delta:** ▲ or ▼ plus signed percentage. 11px JetBrains Mono. Color: `#00E676` (up) or `#FF1744` (down).
- **Bottom border:** A 2px-tall colored bar along the full width of the item. Color interpolates between `#00E676` (strong up) → `#78909C` (flat) → `#FF1744` (strong down). The intensity of the color is proportional to the magnitude of the change. A change of 0.1% produces a barely-visible tint; a change of 5%+ produces a saturated, glowing bar.

### Scroll Mechanics

The ticker scrolls LEFT continuously (right-to-left, like a traditional stock ticker). The scroll speed is constant — approximately 60px per second. Items are repeated infinitely (a seamless loop).

**Implementation approach:**
- Two identical copies of the ticker content are placed side-by-side in a single row.
- A CSS `translateX` animation moves the row from 0 to -50% of its total width over `N` seconds.
- When the animation reaches the halfway point, it seamlessly resets (the two copies ensure no visual gap).
- On hover, the scroll pauses (animation-play-state: paused). The hovered item scales to 105% and gets a subtle white glow.

### Heat System

This is the "heat" in "Heat Animation." Each ticker item has a **heat level** that decays over time after a change event.

```
Heat Level = initial_magnitude × e^(-t / decay_constant)

Where:
  initial_magnitude = abs(probChange1m) normalized to 0-1 (clamped at 5% change = 1.0)
  decay_constant = 30 seconds
  t = seconds since the change event
```

**Heat visual effects:**
- **Level 0 (cold, magnitude < 0.1%):** Static display, muted colors.
- **Level 1 (warm, 0.1-0.5%):** Subtle pulsing of the bottom border (opacity oscillates 0.6→1.0, period: 2s).
- **Level 2 (hot, 0.5-2%):** Bottom border glows (box-shadow in border color). Number vibrates slightly (±1px jitter, random phase per item, 0.5s period). Arrow pulses.
- **Level 3 (burning, >2%):** Full glow effect on the entire item card. Number jitter is more pronounced (±2px). A "shimmer" sweep runs across the item every 2 seconds (a diagonal highlight that travels from top-left to bottom-right). Border pulsates rapidly (0.8s period).

Heat decays smoothly — as the heat level drops, the visual effects fade out over the 30-second decay window. This creates a "live" feel: recent movers are visually loud, then they cool down.

### Alert Triggers

Certain conditions trigger a **ticker-wide alert animation** that momentarily interrupts the scroll:

1. **Threshold cross:** A country's probability crosses a round-number threshold (10%, 25%, 50%, 75%). The ticker item flashes gold for 2 seconds, and a small "🔥" or "⚡" indicator appears next to the country code.

2. **Rank change in top-5:** If a country enters or leaves the top 5, the entire ticker briefly highlights with a gold border-top and border-bottom for 3 seconds.

3. **Spike detection:** If a country's probability changes by more than 3% in under 1 minute, the item gets a red "ALERT" pill badge for 5 seconds, and the scroll briefly accelerates (2× speed for 2 seconds) before returning to normal speed.

### Interaction

| Gesture | Action |
|---------|--------|
| Hover ticker area | Pause scroll |
| Hover individual item | Item enlarges to 105%, shows full country name tooltip |
| Click item | Select country → Module B scrolls to it, Module A spotlights it, Module C highlights its line |
| Click ◀ SCROLL ▶ buttons | Manually scroll left/right (one "page" at a time) |
| Swipe (touch) | Manual scroll (momentum-based) |

---

## 9. Interaction Logic

### Cross-Module Linking

All four modules are tightly coupled through a **selection state**. When a user selects a country (by clicking it in any module), all modules respond:

```
                    ┌──────────────────┐
                    │  Selection State │
                    │  selectedCountry │
                    │  = "BRA" | null  │
                    └──────┬───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Module A           Module B           Module C
   Spotlight          Scroll to           Highlight
   + dim others       row + pin           line + dim
                      at top              others
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                      Module D
                      Ticker item
                      border glow
```

**Selection rules:**
- Clicking a country selects it. Clicking the same country again deselects.
- Clicking an empty area (map ocean, ranking background, timeline background) deselects.
- Only one country can be selected at a time (single-select mode).
- Selection state is reflected in the URL hash: `#BRA` → selecting Brazil. This makes selections shareable and bookmarkable.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`-`9` | Select country #1 through #9 in current ranking |
| `0` | Deselect |
| `←` `→` | Scroll ticker left/right |
| `Space` | Pause/resume all animations (freeze frame) |
| `T` | Toggle ticker visibility |
| `M` | Toggle map projection (globe ↔ flat) |
| `R` | Reset all views to default |
| `F` | Fullscreen mode |
| `/` | Focus search (type country name to select) |

### Search

A hidden search bar (activated by `/` or clicking a search icon in the top-right corner). Typeahead with fuzzy matching on country names. Selecting a result triggers the same cross-module selection behavior. The search UI is minimal:

```
┌─────────────────────────────────────┐
│ > bra_                              │
│                                     │
│   🇧🇷 Brazil        18.3%  Rank #2  │
│   (no other matches)                │
└─────────────────────────────────────┘
```

Rendered as a floating command palette (like VS Code's Ctrl+P), centered on screen, 400px wide. Appears with a 150ms scale+fade animation. Dismisses on Escape or click-outside.

### Time Controls (Global)

A small floating control in the bottom-right corner:

```
┌──────────────┐
│  ⏸  LIVE     │  ← Click to toggle pause/resume
│  14:32:05    │  ← Current data timestamp
│  ⏪ -30s      │  ← Rewind 30 seconds (replay mode)
│  ⏩ +30s      │  ← Fast-forward (only if paused)
└──────────────┘
```

In **LIVE mode**, all modules show real-time data. In **PAUSED mode**, the user can scrub through a 5-minute buffer of historical states. This is critical for reviewing "what just happened" — a user sees a spike on the ticker, pauses, rewinds 30 seconds, and watches the map, rankings, and timeline all replay the event in sync.

---

## 10. Animation & Motion Language

### Design Principles for Motion

1. **Every motion has a data cause.** Nothing animates for decoration. If something moves, ask: what data event triggered this?

2. **Duration is proportional to magnitude.** A 0.1% probability change animates quickly (200ms). A 5% surge animates more slowly (800ms), giving the eye time to register the magnitude.

3. **Spring physics for positional changes.** Ranks, map labels, and other positional elements use spring-based animation (not CSS ease curves). This creates natural-feeling motion with appropriate overshoot.

4. **Stagger for lists.** When multiple items change simultaneously (e.g., a re-sort), stagger their animations by 30-60ms per item. This creates a readable "wave" rather than a confusing simultaneous jump.

5. **Color transitions use OKLCH color space.** Interpolate between colors in OKLCH rather than RGB/sRGB for perceptually uniform transitions that don't pass through muddy intermediates.

### Animation Catalog

#### A. Number Rolling (Odometer Effect)

Used in: Module B (probability values), Module D (ticker numbers), Module A (map labels).

```
Implementation: Each digit is an independent column that rotates
vertically. Old digit rotates up and out, new digit rotates in from below.

Duration: 400ms per digit
Stagger: 50ms per digit (rightmost digit changes first)
Easing: cubic-bezier(0.25, 0.1, 0.25, 1.0) — fast start, slow settle
```

#### B. Rank Position Flow

Used in: Module B (ranking row reordering).

```
Implementation: CSS transform: translateY() with spring physics.
Rows are absolutely positioned at their target Y.

Spring parameters:
  stiffness: 180
  damping: 22
  mass: 1

This produces ~500ms animation with a subtle bounce at destination.
Stagger: 40ms per row (top-to-bottom wave).
```

#### C. Map Color Transition

Used in: Module A (country fill color changes).

```
Implementation: Lerp between OKLCH values of old and new color.
Rendered via Canvas/WebGL shader uniform interpolation.

Duration: 600ms
Easing: ease-out (fast start, gentle settle)
Special: If change > 2%, add a brief "flash" — a 150ms overlay
         of pure white at 30% opacity that fades immediately.
```

#### D. Sparkline Extension

Used in: Module B (mini sparklines), Module C (timeline lines).

```
Implementation: For SVG lines, use stroke-dashoffset animation:
  - Set stroke-dasharray equal to the new segment length
  - Animate stroke-dashoffset from segment length → 0

Duration: 300ms
Easing: ease-out
```

#### E. Ticker Scroll

Used in: Module D (ticker bar).

```
Implementation: CSS transform: translateX() on a container
holding two copies of the ticker items side-by-side.

Duration: auto-calculated based on total content width
  at 60px/s scroll speed. For a 3000px-wide ticker:
  3000 / 60 = 50 seconds per full cycle.

Easing: linear (constant speed, no acceleration)
```

#### F. Heat Decay Pulse

Used in: Module D (heat level visualization).

```
Implementation: CSS animation on border opacity and glow.

Level 1 (warm):  opacity: 0.6 → 1.0 → 0.6, period: 2s
Level 2 (hot):   opacity: 0.8 → 1.0 → 0.8, period: 0.8s + jitter
Level 3 (burn):  opacity: 0.9 → 1.0 → 0.9, period: 0.5s + shimmer

Each level's animation is additive — as heat decays and level drops,
the animation parameters interpolate to the new level's values.
```

#### G. Spotlight Dim

Used in: Module A (map hover), Module C (line hover).

```
Implementation: All non-selected elements transition to
opacity: 0.15 over 200ms. The selected element transitions
to opacity: 1.0 + a subtle scale-up (1.02).

Easing: ease-out for dimming, ease-out for brightening.
```

#### H. Event Ripple

Used in: Module A (significant probability change on map).

```
Implementation: A Canvas-drawn expanding circle centered on
the country's centroid. Circle radius grows from 0 to ~80px
over 1.5 seconds while opacity fades from 0.6 to 0.

Color: Current probability color.
Easing: ease-out for both radius and opacity.
```

#### I. Threshold Flash

Used in: Module B (ranking), Module D (ticker), on threshold cross.

```
Implementation: A 200ms overlay of #FFD700 at:
  - 30% opacity for first 50ms (attack)
  - Decay from 30% to 0% over next 150ms (release)

This creates a brief "camera flash" effect.
```

### Global Animation Settings

```
Default duration:       400ms
Fast duration:          200ms (micro-interactions)
Slow duration:          800ms (major changes)
Default easing:         cubic-bezier(0.4, 0.0, 0.2, 1.0)  (Material standard)
Spring stiffness:       180
Spring damping:         22
Scroll speed (ticker):  60px/s
Heat decay constant:    30s
Stagger base delay:     40ms
```

### Performance Budget

- **60fps target** for all animations
- Canvas modules (A, C) render on `requestAnimationFrame`
- DOM modules (B, D) use CSS `transform` and `opacity` only (compositor-only properties)
- No `width`, `height`, `margin`, `padding`, `top`, `left` animations — these trigger layout
- Ticker uses `will-change: transform` hint
- Ranking rows use `will-change: transform` on the container, removed after animation completes
- Map WebGL context uses `preserveDrawingBuffer: false` and `antialias: false` for performance

---

## 11. Responsive Layout Strategy

### Breakpoints

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| ≥ 1440px (Desktop XL) | Full 3-row layout | Map 60% / Rankings 40% top, Timeline full-width bottom |
| 1024-1439px (Desktop) | Full 3-row layout | Map 55% / Rankings 45%, slightly reduced padding |
| 768-1023px (Tablet) | Single-column stack | Map → Ticker → Rankings → Timeline (vertical scroll) |
| < 768px (Mobile) | Simplified stack | Ticker → Rankings → Timeline (no map; tap country for map modal) |

### Mobile Adaptations

- **Module A (Map):** Hidden by default. A "Map" button in the header opens it as a fullscreen modal overlay. Touch-drag to pan, pinch to zoom.
- **Module D (Ticker):** Reduced to a single row with smaller font (9px). Scroll speed increased to 80px/s to cycle through content faster on narrow screens.
- **Module B (Rankings):** Full-width vertical list. Rows are 40px (vs 48px on desktop). Sparklines reduced to 60px width. Delta shown as arrow only (no number) on smallest screens (< 375px).
- **Module C (Timeline):** Reduced to top-3 lines only. Touch-drag to pan, pinch to zoom. Event markers are hidden; accessible via a "Show events" toggle.

---

## 12. Technical Architecture Notes

### Technology Stack (Recommended)

```
Frontend Framework:  React 18+ with TypeScript
State Management:    Zustand (lightweight, hook-based, supports middleware for WebSocket sync)
Canvas Rendering:    Module A: deck.gl (WebGL map with GeoJSON layer)
                     Module C: uPlot (lightweight time-series Canvas chart) or D3 + Canvas
Animation:           framer-motion for DOM animations (Module B, D)
                     Custom requestAnimationFrame loop for Canvas (Module A, C)
Data:                SSE (Server-Sent Events) from backend for real-time push
                     Fallback: REST polling at 3s intervals
Styling:             Tailwind CSS + CSS custom properties for dynamic theming
Map Data:            Natural Earth (110m resolution) GeoJSON for country boundaries
                     d3-geo for projection math
```

### Key Dependencies

```json
{
  "deck.gl": "map rendering (WebGL choropleth)",
  "@deck.gl/geo-layers": "GeoJSON layer",
  "d3-geo": "map projections",
  "d3-geo-projection": "orthographic projection",
  "uplot": "lightweight time-series charts (Module C)",
  "framer-motion": "DOM animation library",
  "zustand": "state management",
  "topojson-client": "TopoJSON → GeoJSON conversion",
  "world-atlas": "TopoJSON world map data (110m)"
}
```

### Data Flow Summary

```
Backend Service (Node.js / Python)
  │
  ├─ Poll Polymarket API every 3s
  ├─ Compute deltas, detect events
  ├─ Push SSE to connected clients
  │
  ▼
Client (Browser)
  │
  ├─ Zustand Store (single source of truth)
  │   ├─ countries: Map<countryCode, CountryMarketData>
  │   ├─ selectedCountry: string | null
  │   ├─ tickerHeat: Map<countryCode, number>
  │   └─ historyBuffer: RingBuffer<Snapshot> (5 min buffer)
  │
  ├─ React Components (Module B, D, UI chrome)
  │   └─ Subscribe to store slices via hooks
  │
  └─ Canvas Controllers (Module A, C)
      └─ Subscribe to store, render on rAF loop
```

### WebSocket / SSE Message Protocol

```typescript
// Snapshot (sent on initial connection)
interface SnapshotMessage {
  type: "snapshot";
  timestamp: number;
  countries: CountryMarketData[];
}

// Delta (sent on each update cycle)
interface DeltaMessage {
  type: "delta";
  timestamp: number;
  updates: Array<{
    countryCode: string;
    yesPrice: number;
    impliedProbability: number;
    probChange1m: number;
    probChange5m: number;
    probChange1h: number;
    probChange24h: number;
    volume24h: number;
    currentRank: number;
    previousRank: number;
    rankDelta: number;
  }>;
}

// Event (sent when a significant event is detected)
interface EventMessage {
  type: "event";
  timestamp: number;
  eventType: "threshold_cross" | "rank_change_top5" | "spike" | "volume_surge";
  countryCode: string;
  detail: string; // Human-readable description
  metadata: Record<string, unknown>;
}
```

---

## Appendix A: Polymarket Data Notes

Polymarket markets for the 2026 World Cup winner are structured as binary options: "Will [Country] win the 2026 FIFA World Cup?" — YES or NO. The YES token price (in cents, ranging 0–100) is the market-implied probability.

Key considerations:
- Prices across all countries can sum to more than 100% due to the "long-shot bias" in prediction markets (independent binary markets, not a single multi-outcome market).
- The system should display raw implied probabilities without normalization, but could optionally show a "normalized probability" toggle that re-weights to sum to 100%.
- Polymarket data is public via their API and CLOB (Central Limit Order Book) endpoints. The CLOB WS feed provides real-time order book updates; the REST API provides historical resolution data and volume metrics.

---

## Appendix B: FIFA World Cup 2026 Context

- **Hosts:** USA, Canada, Mexico
- **Dates:** June 11 – July 19, 2026
- **Teams:** 48 teams (expanded format)
- **Venues:** 16 venues across 3 countries
- **Key pre-tournament dates:**
  - Qualifying matches: ongoing through March 2026
  - Final draw: Expected late 2025 / early 2026
  - Squad announcements: May-June 2026

These dates should be pre-loaded as event markers in Module C.

---

*End of Design Specification*
