# Module A — World Cup Champion Probability Map
## Deep-Dive Visual Design Specification

**Version:** 1.0 | **Date:** 2026-05-27
**Design Lineage:** Bloomberg MAP function × Stamen Toner cartography × Particle-lens data art

---

## Table of Contents

1. [Overview](#1-overview)
2. [UI Structure](#2-ui-structure)
3. [Map Base Layer](#3-map-base-layer)
4. [Color System](#4-color-system)
5. [Triple Expression System](#5-triple-expression-system)
6. [Energy Flow Paths](#6-energy-flow-paths)
7. [Hover Interaction & Tooltip](#7-hover-interaction--tooltip)
8. [Animation & Motion Specification](#8-animation--motion-specification)
9. [Edge States & Degraded Modes](#9-edge-states--degraded-modes)
10. [Technical Implementation Notes](#10-technical-implementation-notes)

---

## 1. Overview

### Module Role

The Probability Map is the **spatial anchor** of the entire visualization system. It answers one question with a single glance: *where on Earth does the market believe the next World Cup champion will come from?*

Unlike a traditional choropleth, this map does not merely encode a single value as a single color. Each country on the map is a **living data organism** composed of three overlapping visual channels — fill, glow, and particles — whose intensities are driven by the same underlying probability but respond at different speeds and thresholds. The effect is a map that appears to *breathe with market sentiment*.

### Design Principles (Map-Specific)

1. **Probability is energy, not just color.** A country at 25% probability should feel *hotter* than one at 5% — not just a different hue, but a different physical presence on the map.
2. **Simplification is legibility.** Political boundaries are reduced to their essential strokes. No terrain, no rivers, no cities (except host cities as subtle markers). The map is a data canvas, not a geography lesson.
3. **Motion reveals momentum.** A country whose probability is rising has particles that swarm *inward*. A falling country has particles that drift *outward*. The direction of change is readable without reading a single number.
4. **The space between countries matters.** Energy flow lines between top contenders transform the map from a collection of isolated data points into a network — you see not just who is likely to win, but how capital is redistributing between rivals.

---

## 2. UI Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  CHAMPIONSHIP PROBABILITY MAP                   [🌐] [▭] [⛶]  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                                                        │     │
│  │     ◉                                                  │     │
│  │   CANADA                                    ◉         │     │
│  │   12.4%              ◉                      UK         │     │
│  │                  ░░░ NETHERLANDS            5.1%       │     │
│  │  ◉                5.5%       ◉                         │     │
│  │  USA             ═══ ENERGY FLOW ═══  GERMANY          │     │
│  │  9.8%           ║                   ▓▓▓  7.1%          │     │
│  │                 ║     ◉             ▓▓▓                │     │
│  │  ◉             ║   FRANCE           ▓▓▓       ◉        │     │
│  │  MEXICO        ║   11.2%                     JAPAN     │     │
│  │  2.1%          ║   ░░░░░░░░░░░░░░░░░           1.9%    │     │
│  │                ║  ╱                                 │     │
│  │        ◉      ║ ╱   ◉                                │     │
│  │     BRAZIL    ║╱  ARGENTINA                           │     │
│  │     18.3%     ╳   22.1%                               │     │
│  │     ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                   │     │
│  │     ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ◉ = HOST CITY    │     │
│  │     ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                    │     │
│  │                                                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  0%   2%   5%   10%   15%   25%   40%   60%   75%   90%  100%     │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  COLD ────────  BLUE THRESHOLD  ──────── GOLD THRESHOLD ── PEAK │
│                                                                  │
│  [Hover state — shown on map, anchored to country centroid]     │
│  ┌──────────────────────────────┐                                │
│  │ 🇦🇷 ARGENTINA                │                                │
│  │ Current:   22.1%  ▲2.3% 24h  │                                │
│  │ 7d High:   23.8%  (May 22)   │                                │
│  │ 7d Low:    16.4%  (May 15)   │                                │
│  │ Vol 24h:   $14.2M            │                                │
│  │ ─────────────────────────── │                                │
│  │ Rank: #1   5m trend: ↗↗     │                                │
│  └──────────────────────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

### Layout Zones

The module is divided into five spatial zones:

| Zone | Position | Content |
|------|----------|---------|
| **Header bar** | Top edge, 32px | Module title (left), view controls (right): globe / flat / fullscreen |
| **Map canvas** | Center, fills remaining space | The map itself — all visual elements render here |
| **Legend bar** | Bottom edge, 24px | Continuous probability gradient with threshold labels |
| **Hover tooltip** | Floating, anchored to cursor + 12px offset | Country detail card (appears/disappears on hover) |
| **Status indicator** | Top-right corner of map, 8×8px dot | ● green = live, ◉ amber = stale, ○ grey = disconnected |

### Module Dimensions

```
Min width:  480px
Max width:  None (fills available grid space)
Min height: 360px
Ideal aspect ratio: 16:9 or 2:1 (wider is better for world maps)
```

---

## 3. Map Base Layer

### Projection

**Default:** Natural Earth II (equal-area, pleasing compromise between shape accuracy and size accuracy). This projection avoids the Greenland-is-gigantic problem of Mercator while keeping landmasses recognizable at a glance.

**Alternative (globe mode):** Orthographic projection, centered at [0°, 20°N] to balance view of Americas, Europe, and Africa. Rotatable via drag.

### Political Boundaries — Simplified

Boundaries are rendered as **1px strokes in #1C1C2E** (barely brighter than the #0A0A0F background). This is critical: boundaries must be *visible but recessive*. They provide spatial reference without competing with data.

The boundary simplification follows a three-tier hierarchy:

| Tier | Stroke | Color | Content |
|------|--------|-------|---------|
| **International borders** | 1px solid | `#1C1C2E` | All UN-recognized sovereign states |
| **Coastlines** | 1px solid | `#222236` | Slightly lighter to distinguish land/water |
| **Disputed / subnational** | 0.5px dashed | `#151528` | Barely visible, for context only |

**Water bodies:** The ocean is `#06060D` — darker than the land background. This inversion (ocean darker than land) is a deliberate departure from physical maps. It makes the landmasses appear to *float above* the dark void, reinforcing the "data suspended in space" aesthetic.

**Graticule (latitude/longitude lines):** Rendered as 0.3px dashed lines in `#111122`, every 30°. Subtle but gives the map a technical, instrument-panel feel. These are toggled off by default, on via a small "grid" button.

### Host City Markers

The 16 host cities (across USA, Canada, Mexico) are marked with small diamond shapes (◆) in `#FFD700` at 60% opacity, 4×4px. On hover, the marker expands to show the city name and venue. These are static reference points — they do not animate with market data — but they ground the map in the tournament's physical reality.

### Non-Participating Countries

Countries that have not qualified (or have no Polymarket market) are rendered with:
- Fill: `#0D0D18` (nearly invisible against the `#0A0A0F` background)
- Stroke: `#141428` at 0.5px
- No glow, no particles, no interaction

This ensures visual attention is directed exclusively at countries with data. Non-participants recede into the background as a faint geographical skeleton.

---

## 4. Color System

### The Spectrum

The probability color spectrum is not a single-hue gradient. It is a **four-phase spectrum** designed to evoke temperature — from cold (low probability) to burning (near-certain). Each phase has a distinct perceptual character:

```
PHASE 1: COLD GRAY        PHASE 2: ELECTRIC BLUE      PHASE 3: INCANDESCENT GOLD     PHASE 4: PEAK RED
─────────────────────     ─────────────────────       ──────────────────────────     ────────────────
"In the conversation"     "Contender"                 "Frontrunner"                  "Near-certain"
Probability: 0–5%         Probability: 5–15%           Probability: 15–60%            Probability: 60–100%
```

### Precise Color Stops

```
Stop 0  (0.0%):   #1A1A24  —  Cold dark grey, barely distinguishable from bg
Stop 1  (2.0%):   #2A2A3A  —  Slightly warmer grey, "on the radar"
Stop 2  (5.0%):   #1E3A5F  —  Deep navy, first hint of color — BLUE THRESHOLD
Stop 3  (8.0%):   #1A4A8A  —  Medium navy blue
Stop 4  (12.0%):  #2563C7  —  Vibrant electric blue, "serious contender"
Stop 5  (15.0%):  #3B82C4  —  Blue-gold transition begins — TRANSITION ZONE
Stop 6  (20.0%):  #4A7FB5  —  Steel blue with gold undertone
Stop 7  (25.0%):  #7B9E4A  —  Olive bridge, blue→gold midpoint — GOLD THRESHOLD
Stop 8  (35.0%):  #C4A33A  —  Warm gold emerges
Stop 9  (45.0%):  #E8B830  —  Bright incandescent gold, "frontrunner"
Stop 10 (55.0%):  #F0A020  —  Gold shifting orange
Stop 11 (60.0%):  #F08020  —  Deep orange — RED THRESHOLD
Stop 12 (70.0%):  #E85020  —  Orange-red, "dominant favorite"
Stop 13 (80.0%):  #E03030  —  Vivid red
Stop 14 (90.0%):  #D01818  —  Deep burning red
Stop 15 (100%):   #C00000  —  Maximum intensity red, "market certainty"
```

### Color Interpolation Method

All interpolation between stops uses **OKLCH color space** (not RGB, not HSL). OKLCH provides perceptually uniform transitions — a step from 10% to 20% probability looks like the same "amount of color change" as a step from 70% to 80%. This prevents the common problem where the middle of a gradient looks washed out or the ends look compressed.

### Opacity as Secondary Channel

Country fill uses full opacity (1.0). The **glow layer** uses reduced opacity (0.15–0.60) controlled by a separate opacity curve:

```
Probability → Glow Opacity mapping:
  0–5%:    0.00  (no glow below 5% — reduces visual noise)
  5–15%:   0.15 → 0.30 (linear)
  15–25%:  0.30 → 0.45 (linear)
  25–50%:  0.45 → 0.55 (eased — diminishing returns at high prob)
  50–100%: 0.55 → 0.60 (nearly flat — glow saturates at high probability)
```

This means two countries at 30% and 60% probability will have noticeably different fills (gold vs orange-red) but similar glow intensities — the glow is not a simple linear mapping. It saturates so that the top 5 countries all feel "hot" without one completely overwhelming the others.

### Color for Direction (Delta)

When showing change, the system uses a separate two-color scale that is **divorced from the probability spectrum**:

```
Probability UP:    #00E676  Electric green — positive direction
Probability FLAT:  #78909C  Blue-grey — no significant change
Probability DOWN:  #FF1744  Sharp red — negative direction
```

These are used in: the delta arrow in the tooltip, the particle direction color, and the energy flow line tints.

---

## 5. Triple Expression System

Each country's probability is expressed through three simultaneous visual channels. The channels are designed to reinforce each other without redundancy — each carries a distinct aspect of the data.

### Channel 1: Fill Color (The Foundation)

**What it encodes:** The absolute probability value (0–100%).

**Visual:** A flat, non-textured fill of the country polygon in the color from the spectrum above. No gradient within a country — the entire landmass is a single solid color.

**Update behavior:** On probability change, the fill color lerps from old to new over **600ms using OKLCH interpolation** (ease-out curve). During the transition, both old and new colors are blended — there is no flash or pop.

**Edge case — probability = 0% or no market:** Fill is `#0D0D18`, visually receding into the background. The polygon is still interactive (hover shows "No market data available").

**Why flat fill and not gradient?** A gradient would imply probability varies *within* the country, which is false. The market price is a single value per country. Flat fill is honest.

---

### Channel 2: Glow Halo (The Atmosphere)

**What it encodes:** The *market attention* on a country — a combination of absolute probability (is this country a serious contender?) and recent activity (is money moving here right now?).

**Visual:** A soft, radial luminosity that extends beyond the country's borders by 20–60px (scaling with probability). The glow is not a CSS box-shadow — it is a **Canvas-rendered Gaussian blur of the country's filled polygon**, composited onto the map as a separate layer with additive blending (`lighter` or `screen` blend mode in WebGL).

**Layered glow construction:**

```
Layer 1 (core):    Blur radius 12px,  opacity 0.50  — tight inner glow
Layer 2 (mid):     Blur radius 28px,  opacity 0.25  — medium spread
Layer 3 (outer):   Blur radius 56px,  opacity 0.10  — wide ambient aura
```

The three layers together create a glow that feels volumetric — bright at the center (close to the border), tapering smoothly into the darkness. Multi-layer glow avoids the "hard cutoff" look of a single blur.

**Breathing animation:** The glow does not sit at a static opacity. It oscillates with a **3.2-second sine wave**, varying opacity by ±15% around its baseline. The breathing phase is randomized per country (each country has its own phase offset) so that, at any given moment, different countries are at different points in their breath cycle. The map feels alive — not mechanical.

```
Glow opacity at time t for country c:
  O(t, c) = O_base × (1.0 + 0.15 × sin(2π × t / 3.2s + φ_c))

Where:
  O_base = f(probability) as defined in Section 4 opacity curve
  φ_c    = random phase offset per country, fixed at load time
  t      = elapsed seconds since module mount
```

**Activity-driven glow amplification:** When a country experiences a significant probability change (>0.5% in 5 min), the glow amplitude temporarily increases. The breathing amplitude jumps from ±15% to ±35% for 8 seconds, then decays back to baseline. This creates a "heartbeat spike" effect — the map briefly pulses brighter where action is happening.

**Top-3 special treatment:** The #1, #2, and #3 ranked countries receive an additional subtle outer ring — a thin (1px), semi-transparent circle at the edge of the glow radius in gold (`#FFD700`), silver (`#C0C0C0`), or bronze (`#CD7F32`) respectively. This ring does not pulse and provides a permanent rank indicator visible even without reading numbers.

---

### Channel 3: Micro-Particle System (The Energy)

**What it encodes:** The *direction and velocity of probability change*. Particles are the most dynamic of the three channels — they respond to the first derivative (rate of change), not the absolute value.

**Visual:** Each qualified country is surrounded by a cloud of 20–120 small luminous dots (1.5px radius each) that hover near the country's borders. The number of particles scales with the country's probability:

```
Particle count mapping:
  0–5%:    20 particles
  5–15%:   40 particles
  15–30%:  65 particles
  30–50%:  90 particles
  50–100%: 120 particles
```

**Particle behavior by direction:**

```
PROBABILITY RISING (▲):
  Particles drift INWARD toward the country centroid.
  Color:  #FFFFFF (white core) with outer tint in #00E676 (electric green).
  Speed:  Proportional to rate of change — faster rise = faster particles.
          Base speed: 15px/s. At max change (>5%/hr): 45px/s.
  Trail:  Each particle leaves a 3-frame fading trail behind it.

PROBABILITY STABLE (—):
  Particles orbit the country border at a gentle drift.
  Color:  #FFFFFF (white).
  Speed:  8px/s, semi-random orbital paths.
  Trail:  No trail.

PROBABILITY FALLING (▼):
  Particles drift OUTWARD away from the country centroid.
  Color:  #FF1744 (red) core fading to transparent at edges.
  Speed:  Proportional to rate of fall.
  Trail:  Each particle leaves a 3-frame fading trail behind it,
          creating a subtle "bleeding" effect away from the country.
```

**Particle lifecycle:** Each particle has a lifespan of 4–8 seconds. When a particle expires, it fades out over 0.5 seconds and a new particle spawns at a random position along the country's border. This constant birth-death cycle means the particle cloud is never static — even for a country with zero change, particles are slowly regenerating.

**Spawn positions:** Particles spawn at random positions along the country's simplified border polygon (pre-computed boundary points, sampled uniformly by perimeter distance). This ensures particles cluster around the country's shape, not a generic circle.

**Particle rendering:** Particles are rendered as small circles with a soft radial gradient (Gaussian, radius 3px from center to edge). This makes them look like points of light rather than hard dots. The particle layer sits *above* the fill layer but *below* the boundary stroke layer, so particles appear to float just above the land surface.

**Particle avoidance:** Particles maintain a minimum distance of 4px from each other (simple repulsion force in the particle simulation). This prevents clumping and keeps the cloud evenly distributed.

---

### How the Three Channels Work Together

The three channels are deliberately designed with different response curves to the same data, creating a rich, non-redundant signal:

| Data Event | Fill Color Response | Glow Response | Particle Response |
|------------|-------------------|---------------|-------------------|
| Probability rises from 10% → 12% | 600ms hue shift (blue → slightly bluer-blue) | Amplitude increases slowly over 600ms | Particles shift to inward drift |
| Probability spikes 18% → 23% in 5 min | 600ms hue shift (blue → gold threshold) | Breathing amplitude doubles for 8s | Particles surge inward at high speed |
| Probability stays flat at 30% for hours | Static gold | Gentle breathing at baseline | Slow orbital drift, continuous regeneration |
| Probability drops 40% → 35% | 600ms hue shift (gold → slightly less gold) | Breathing amplitude unchanged | Particles shift to outward drift, red tint |

The key insight: **fill color is the slowest-changing channel** (it shows *where we are*), **glow is the medium channel** (it shows *how much attention we're getting*), and **particles are the fastest channel** (they show *where we're going*). This temporal separation means the map always has some motion even when probabilities are static, and the motion conveys meaning even before you read a single number.

---

## 6. Energy Flow Paths

### Concept

Between the top-8 countries (by probability), visible energy streams flow across the map. These represent the **redistribution of market probability** — when one country's probability rises and another's falls, an energy flow appears between them, suggesting capital moving from one market to another.

This is the "capital flow" metaphor made visible. It transforms the map from a collection of isolated data points into a **network graph overlaid on geography** — you can see not just individual country probabilities, but the *relationships* between them.

### Flow Line Visual Design

Each flow line is a curved path (great-circle arc or quadratic bezier) connecting two country centroids. The line is not a solid stroke — it is composed of **animated luminous dashes** that travel along the path:

```
Path structure (for a single flow between Country A and Country B):

  Base curve:  Quadratic bezier with control point elevated above the
               midpoint by 30–80px (arc height proportional to distance
               between countries — longer distance = higher arc).

  Dash pattern: 6px dash, 14px gap, repeating.
                Each dash is a 6px segment of the curve with:
                - Core: #FFFFFF at 0.7 opacity, 2px wide
                - Glow: Same color, 6px wide, Gaussian blur sigma=3, opacity 0.25

  Animation:    Dashes travel along the curve from A → B at a speed
                proportional to the net probability flow from A to B.
                Speed range: 20px/s (minimal flow) to 120px/s (strong flow).
```

### Flow Direction and Intensity

Flows are **directional**. If Brazil's probability is rising while Argentina's is falling, a flow arrow runs from Argentina → Brazil (capital is leaving Argentina, entering Brazil). If both are rising, the flow is bidirectional (two overlapping streams in opposite directions, at lower intensity).

**Intensity calculation:**

```
Flow intensity from A → B:

  I(A→B) = max(0, ΔP_A_5min - ΔP_B_5min) × w(A, B)

Where:
  ΔP_X_5min  = probability change of country X in last 5 minutes (signed %)
  w(A, B)    = weight factor based on probability correlation:
                w = 1.0 if A and B are traditional rivals (FIFA historical data)
                w = 0.8 if A and B are in the same confederation (e.g., both UEFA)
                w = 0.5 otherwise

  Only flows with I > 0.05% are rendered (below that, invisible).
```

### Flow Color

Flow dashes are tinted by the *source* country's current direction color:
- Source rising (▲): dashes tinted green (`#00E676`)
- Source stable (—): dashes white (`#FFFFFF`)
- Source falling (▼): dashes tinted red (`#FF1744`)

This means a flow from a falling country to a rising country appears as red→green gradient along the path (the dashes themselves don't change color mid-flight; the source and destination ends have different tints that create a gradient impression as multiple dashes travel).

### Flow Count Limit

Maximum **12 simultaneous flow lines** on screen (top-8 countries = up to 28 possible pairs, but we render only the 12 strongest flows). This prevents visual chaos. Less intense flows simply do not appear.

### Flow Line States

| State | Visual |
|-------|--------|
| **Active (I > 0.2%)** | Bright dashes, 2px core + glow, full speed |
| **Weak (0.05% < I < 0.2%)** | Dimmer dashes, 1px core, half speed, opacity 0.4 |
| **Dormant (I < 0.05%)** | Invisible (not rendered) |
| **Hovered** | The hovered flow line brightens to full opacity, all other flows dim to 0.15 opacity |

### Special: "Rivalry Pulse"

For country pairs with historical football rivalry (pre-defined dataset: Brazil-Argentina, Germany-Netherlands, England-France, etc.), the flow line between them has a subtle additional effect: every 8–12 seconds (randomized), a single bright pulse travels along the entire curve in 0.5 seconds — a "spark" that races from one end to the other. This acknowledges the special market dynamics of rivalry pairs without being distracting.

---

## 7. Hover Interaction & Tooltip

### Hover Detection

The map detects which country polygon the cursor is over using **GPU pick buffer** (render each country as a unique color to an offscreen framebuffer, read the pixel under the cursor — this is the standard WebGL picking technique and is instantaneous even with 200+ polygons).

### Hover Visual Response (Map)

When the cursor enters a country polygon:

1. **Country stroke:** Brightens from `#1C1C2E` to `#FFFFFF` at 0.8 opacity over 150ms.
2. **Country fill:** Brightens by +15% in LCH lightness over 200ms (the country "lights up" slightly).
3. **Glow:** Expands by 20% (blur radius increases), opacity increases by 25% over 250ms.
4. **All other countries:** Dim to 25% opacity over 200ms (spotlight effect).
5. **Energy flows:** All flows dim to 15% opacity except flows connected to the hovered country, which brighten.
6. **Particles:** The hovered country's particles accelerate slightly (+30% speed) and gain a subtle white core glow.

When the cursor leaves: all effects reverse over 150ms (faster exit than entry — feels snappier).

### Tooltip Card

The tooltip card appears 12px to the right and 12px below the cursor (or above/left if near screen edge — collision-aware positioning). It fades in over 150ms with a slight upward slide (4px translateY).

```
┌───────────────────────────────┐
│ 🇦🇷  ARGENTINA           #1   │  ← Flag + Name + Rank badge
│                               │
│  Current                     │
│  22.1%         ▲ 2.3% 24h   │  ← Large probability + delta
│                               │
│  ─────────────────────────  │
│                               │
│  7-Day Range                 │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │  ← Mini range bar
│  16.4%                  23.8%│
│  May 15                May 22│
│                               │
│  ─────────────────────────  │
│                               │
│  Volume 24h       $14.2M     │
│  Market Sentiment  ↗↗ Bullish│  ← Trend indicator
│  # of Markets      6 active  │
│                               │
│  [View on Polymarket →]      │  ← External link
└───────────────────────────────┘

Dimensions: 220px wide, auto height
Background:  #14141F with 95% opacity + backdrop-blur(8px)
Border:       1px solid #2A2A3A
Border-left:  3px solid in country's current probability color
Corner radius: 6px
Shadow:       0 8px 32px rgba(0,0,0,0.6)
Font:         "Inter" for labels, "JetBrains Mono" for numbers
```

### Tooltip Elements Detail

**Rank badge** (top-right corner): A small pill shape with the country's current rank number. Color: gold for #1, silver for #2, bronze for #3, `#2A2A3A` background with `#8899AA` text for #4+.

**Large probability:** 28px JetBrains Mono, color is the country's current color from the probability spectrum. This is the hero number.

**Delta indicator:** ▲ or ▼ + signed percentage + time period label. 13px JetBrains Mono. Color: `#00E676` (up) or `#FF1744` (down). If the change is <0.05%, shows "— flat" in `#78909C`.

**7-Day Range Bar:** A horizontal bar 180px wide, 6px tall. The full bar represents 0–max(7d high, current). A filled segment from the 7d low to 7d high is rendered in a muted version of the country's probability color. A small diamond marker shows the *current* position within the range. Labels at both ends show the min and max values with their dates.

**Market Sentiment:** A qualitative label derived from recent data:
- ↗↗ Bullish: probability up >2% in 24h AND volume above average
- ↗ Rising: probability up >0.5% in 24h
- → Stable: probability change within ±0.5%
- ↘ Falling: probability down >0.5% in 24h
- ↘↘ Bearish: probability down >2% in 24h AND volume above average

**External link:** "View on Polymarket →" opens the specific market page in a new tab. Rendered in `#3B82C4` (blue link color), underlined on hover.

---

## 8. Animation & Motion Specification

### Animation Philosophy

The map has a **three-tier time structure** for animation, matching the three expression channels:

```
Tier 1 — Instantaneous (< 200ms):
  Particle direction changes, hover enter/exit, tooltip transitions.
  These feel like direct responses to user action.

Tier 2 — Responsive (200ms–1s):
  Fill color transitions, glow amplitude changes, flow intensity adjustments.
  These feel like the market "breathing."

Tier 3 — Ambient (1s–8s):
  Glow breathing cycle, particle regeneration, rivalry pulses, flow dash travel.
  These create the sense of a living system even with no new data.
```

### A. Fill Color Transition

```
Trigger:    New probability value received from data pipeline.
Duration:   600ms (for any magnitude of change).
Easing:     cubic-bezier(0.4, 0.0, 0.2, 1.0) — fast start, slow settle.
Method:     OKLCH interpolation between old and new color.
            Shader uniform updated each frame via rAF.

Optimization: If the delta is < 0.1%, the transition is skipped
              (no visible difference anyway — avoid unnecessary GPU work).
```

### B. Glow Breathing

```
Trigger:    Continuous (runs every frame via rAF).
Duration:   3.2-second cycle, repeating infinitely.
Waveform:   Sine wave: O(t) = O_base × (1.0 + A × sin(2π × t / 3.2 + φ)).
            A = 0.15 (baseline) or up to 0.35 (activity spike).
Method:     Interpolate blur sigma and opacity each frame.

When a new country enters the top-8, its glow fades in from 0
over 2 seconds (ease-out) rather than appearing instantly.
```

### C. Particle Simulation (per frame)

```
Particle update loop (runs every frame at 60fps):

For each particle:
  1. Update position based on current velocity and direction mode:
     - Inward:  velocity = direction_to_centroid × speed
     - Orbital: velocity = tangent_to_border × speed
     - Outward: velocity = direction_from_centroid × speed

  2. Apply repulsion from nearby particles (within 8px):
     force = sum( (distance - 8) / 8 × direction_from_neighbor )
     velocity += force × 0.3

  3. Apply boundary constraint:
     If particle moves >60px from any border point, redirect inward.

  4. Update trail (shift previous positions back, add current).

  5. Update opacity:
     - First 80% of lifespan: opacity = 0.7
     - Last 20% of lifespan: opacity lerps from 0.7 → 0.0

  6. If lifespan expired:
     - Remove particle
     - Spawn new particle at random border position

Performance budget: Max 1200 particles total (10 countries × 120 max each,
but top-10 cap means ~800 particles typical). Each particle is 6 floats
(position x,y, velocity x,y, phase, lifespan) = 4,800 floats — negligible
for GPU.
```

### D. Energy Flow Dash Animation

```
Trigger:    Continuous.
Duration:   Dashes travel the full curve length at speed S.
            Dash speed S = 20 + (I × 100) px/s, capped at 120 px/s.

Curve:      Quadratic bezier: P(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            where P₀, P₂ = country centroids, P₁ = elevated midpoint.

Dash rendering:
  - Compute dash positions along curve at intervals of 20px (gap+dash).
  - Offset positions by (time × speed) modulo total_curve_length.
  - At each dash position, draw a 6px segment with glow.

When flow intensity changes:
  - Dash speed lerps to new speed over 1 second.
  - If intensity drops below 0.05%, dashes fade out over 2s,
    then the flow line is removed from the render list.
  - If a new flow appears, dashes fade in over 1.5s (ease-out).
```

### E. Hover Enter/Exit

```
Enter:
  Country stroke:         #1C1C2E → #FFFFFF,         150ms, ease-out
  Country fill lightness: normal → normal+15%,         200ms, ease-out
  Glow expansion:         normal → normal×1.2,         250ms, ease-out
  Other countries dim:    opacity 1.0 → 0.25,         200ms, ease-out
  Other flows dim:        opacity 1.0 → 0.15,         200ms, ease-out
  Tooltip:                opacity 0 → 1.0 + slide 4px, 150ms, ease-out

Exit:
  All properties reverse, 150ms, ease-in (faster exit).
  Tooltip fades out in 100ms (very fast — avoids lingering tooltips).
```

### F. Ripple Effect (Significant Change)

```
Trigger:    Country probability changes by >2% in under 5 minutes.
Duration:   1.5 seconds total.

Animation:
  0ms–200ms:   A bright ring (2px stroke, country's color) appears at the
               country centroid with radius=0 and opacity=0.8.
  200ms–800ms: Ring expands from radius 0 → 80px while opacity decays
               from 0.8 → 0.2. Easing: ease-out for radius.
  800ms–1500ms: Ring continues expanding 80px → 120px, opacity decays
                from 0.2 → 0.0. Easing: ease-in for opacity.

  Only one ripple per country at a time. If a second significant change
  occurs while a ripple is still animating, the old ripple is immediately
  removed and a new one starts (avoids clutter).
```

### G. Map Projection Morph (Globe ↔ Flat Toggle)

```
Trigger:    User clicks projection toggle button.
Duration:   600ms.
Method:     Interpolate between the two projection functions.
            d3-geo-projection supports projection interpolation.

            For each frame t (0→1):
              projection = interpolate(flatProjection, globeProjection, t)
              Reproject all country polygons and flow curves.

  Easing:  cubic-bezier(0.4, 0.0, 0.2, 1.0).
  During transition: particles and flows are hidden (reduce GPU load).
  After transition: particles and flows reappear with fade-in (300ms).
```

---

## 9. Edge States & Degraded Modes

### Loading State

On initial mount, before the first data snapshot arrives:

- Map base layer (boundaries, oceans, graticule) renders immediately.
- All countries render in `#0D0D18` (inert fill).
- A subtle scanning line sweeps across the map from left to right (2-second cycle), a thin horizontal line at `#1C1C2E` 30% opacity — the "radar initialization" feel.
- The legend bar renders with labels but no gradient fill.
- A small text in the map center: "Connecting to Polymarket..." in `#556677`, 11px Inter, pulsing opacity 0.4→0.8→0.4 over 2s.

When first data arrives:
- Scanning line fades out over 500ms.
- Country fills and glows fade in over 800ms (staggered: top-3 first, then rest by rank).
- Particles spawn over 2 seconds (staggered per country).
- The transition from loading → live should feel like a system powering on.

### Empty State (No Data)

If the data pipeline returns zero countries (API down, no markets created yet):

- Map renders in base state (all countries `#0D0D18`).
- Message displayed center-screen: "No market data available" in `#8899AA`.
- A "Retry" button below the message.
- Subtitle: "Check Polymarket for active World Cup 2026 markets."

### Error State

If the data pipeline errors (WebSocket disconnect, API 500):

- Existing data continues to display (last known good state).
- Status indicator dot turns ◉ amber (stale).
- After 30 seconds without successful update, status turns ○ grey (disconnected).
- A non-intrusive banner slides down from the top of the module: "Data connection lost. Retrying..." with a subtle pulsing amber left-border.
- Automatic retry occurs every 5 seconds (no user action needed).
- When connection restores: banner slides up and away (300ms), status returns to ● green, and all data snap-transitions to current values (no lerp — show the truth immediately after a gap).

### Performance Degradation Mode

If frame rate drops below 30fps for more than 3 consecutive seconds (detected via rAF timing):

- **Particles:** Reduced to 50% count.
- **Glow:** Reduced from 3-layer to 1-layer blur.
- **Flow lines:** Reduced from max 12 to max 6.
- **Breathing animation:** Frequency halved (6.4s cycle instead of 3.2s).
- A subtle indicator: a small "⏷" (performance icon) appears in the bottom-right corner of the map canvas. Clicking it lets the user manually toggle between "Quality" and "Performance" modes.

When frame rate recovers above 45fps for 5 seconds, all degradations are reversed over 2 seconds (smooth restoration, not abrupt).

---

## 10. Technical Implementation Notes

### Rendering Pipeline

The map uses a **WebGL 2.0 context via deck.gl** with three layers (bottom to top):

```
Layer 3: Particle Layer         (custom deck.gl layer, 1200 particles max)
Layer 2: Energy Flow Layer      (custom deck.gl layer, 12 bezier curves)
Layer 1: GeoJson Layer          (deck.geojsonlayer, country polygons)
         ├── Fill sub-layer     (color by probability)
         ├── Stroke sub-layer   (boundary lines, 1px)
         └── Glow sub-layer     (offscreen FBO, 3-pass Gaussian blur)
```

Picking is handled by deck.gl's built-in picking system (layer 1 only — particles and flows are not pickable).

### Data Flow into the Map

```
Zustand Store
  └─ countries: Map<countryCode, CountryMapData>
       │
       ├─ useMemo → sorted array for ranking
       ├─ useMemo → flowPairs array (top-8 pairwise intensities)
       └─ useMemo → GeoJSON FeatureCollection with color props

  The map component subscribes to these selectors.
  On change, deck.gl layer props update → GPU buffers update.
```

### Shader Notes

**Country fill shader (fragment):**

```glsl
// Receives: probability (0-100), oldProbability (previous frame's value),
//           transitionProgress (0-1, animated uniform)

uniform float u_transitionProgress;
varying float v_probability;
varying float v_oldProbability;

// Color lookup from 16-stop LUT texture (1D, 16×1 pixels)
// Interpolate between old and new colors based on transitionProgress
vec4 oldColor = texture1D(u_colorLUT, v_oldProbability / 100.0);
vec4 newColor = texture1D(u_colorLUT, v_probability / 100.0);
gl_FragColor = mix(oldColor, newColor, u_transitionProgress);
```

**Glow shader (fragment, post-processing pass):**

```glsl
// Three-pass separable Gaussian blur.
// Pass 1: horizontal blur at sigma=12
// Pass 2: horizontal blur at sigma=28
// Pass 3: horizontal blur at sigma=56
// Each pass has a corresponding vertical pass.
// Results composited with additive blending.
// Final output alpha-multiplied by country's glow_opacity uniform.
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Frame time (all layers) | < 12ms (83+ fps headroom) |
| GeoJSON vertex count | < 50K vertices (simplified to 110m resolution, Douglas-Peucker ε=0.01°) |
| Particle simulation CPU time | < 2ms per frame |
| Flow curve evaluation | < 1ms per frame |
| GPU memory | < 50MB for all textures and buffers |
| Initial load time | < 2 seconds to first meaningful paint |

### Browser Compatibility

- WebGL 2.0 required (97%+ global support as of 2026).
- Fallback for WebGL 1.0: reduced glow (single-pass blur), no particle trails.
- No WebGL: display a static SVG map with fill colors, updated via DOM. All animations disabled. Message: "Your browser does not support WebGL. Live animations are disabled."

---

*End of Module A Design Specification*
