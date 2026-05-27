# Module C — World Cup Champion Probability Timeline (Odds Timeline)
## Deep-Dive Visual Design Specification

**Version:** 1.0 | **Date:** 2026-05-27
**Design Lineage:** TradingView Lightweight Charts × Coinbase Advanced Trade × Bloomberg GIP function

---

## Table of Contents

1. [Overview](#1-overview)
2. [Chart Structure](#2-chart-structure)
3. [Multi-Line Rendering System](#3-multi-line-rendering-system)
4. [Trend Acceleration Visual Cues](#4-trend-acceleration-visual-cues)
5. [Time Navigation System](#5-time-navigation-system)
6. [Hover Crosshair & Tooltip](#6-hover-crosshair--tooltip)
7. [Event Marker System](#7-event-marker-system)
8. [Single-Country Focus Mode](#8-single-country-focus-mode)
9. [Data Refresh Strategy](#9-data-refresh-strategy)
10. [Interaction Logic](#10-interaction-logic)
11. [Edge States](#11-edge-states)
12. [Technical Notes](#12-technical-notes)

---

## 1. Overview

### Module Role

Module C is the **analytical memory** of the visualization system. Where Module A shows *where* probability is concentrated and Module B shows *who is leading right now*, Module C shows *how we got here*. It is a time-series chart that transforms market data into a historical narrative — every line is a story of rising hope, crashing doubt, and the events that caused both.

The design borrows heavily from professional trading platforms (TradingView, Coinbase, Bloomberg) because the use case is identical: a user needs to scan historical price action, identify patterns, correlate events with movements, and form hypotheses about future direction. The chart must feel precise, dense, and trustworthy — not decorative.

### Design Principles (Module-Specific)

1. **The line is the truth.** No unnecessary embellishments on the data series. Grid lines, axes, and labels exist to serve the lines, not compete with them. The lines must be the most visually prominent element on the canvas at all times.

2. **Brightness encodes conviction.** A country at 25% probability gets a thicker, brighter line than one at 3%. This is not decorative — it is a pre-attentive filter. The eye should find the top contenders without reading a single label.

3. **Steepness is news.** A line moving sideways for hours is visually quiet. A line that suddenly steepens upward should become noticeably brighter and more saturated — the chart itself signals "something is happening here" before the user checks the numbers.

4. **Events are the why.** Raw price data without context is incomplete. Every significant movement should be traceable to a labelled event marker. The chart must bridge the gap between *what happened* and *why it happened*.

---

## 2. Chart Structure

### Full Module Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ODDS TIMELINE          [1H] [24H] [7D] [30D] [ALL]    [👁 Focus] [⚙]      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  25% ┤                                                   ╭── 🇦🇷     │   │
│  │      │                                         ╭────────╯           │   │
│  │  20% ┤                      ╭──────────────────╯                     │   │
│  │      │      ╭──────────────╯           🇧🇷                          │   │
│  │  15% ┤  ╭──╯               ╭────────────────────────────────────    │   │
│  │      │ ╯  🇧🇷               │  🇫🇷                                 │   │
│  │  10% ┤────────────────────╯──────────────────────────────────────   │   │
│  │      │  ╭─🇪🇸                                                     │   │
│  │   5% ┤─╯─────────────────────────────────────────────────────────   │   │
│  │      │                                      ╭─🇺🇸                   │   │
│  │   0% ┤─────────────────────────────────────╯─────────────────────   │   │
│  │      ├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┤     │   │
│  │      May 22  May 23  May 24  May 25  May 26  May 27  May 27  May 27│   │
│  │      00:00   00:00   00:00   00:00   00:00   00:00   08:00   14:32  │   │
│  │                                                                      │   │
│  │   ◆  ─── ◆ ────────────── ◆ ─────────────────── ◆ ───── ◆          │   │
│  │  Squad  Injury          Group                         Volume  Price  │   │
│  │  News   Report          Draw                          Spike   Surge  │   │
│  │  (May   (May 24)       (May 25)                      (May 27) (Now)  │   │
│  │   23)                                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ── 🇦🇷 Argentina (22.1%)  ── 🇧🇷 Brazil (18.3%)  ── 🇫🇷 France (12.4%)      │
│  ── 🇪🇸 Spain (11.2%)     ── 🇺🇸 USA (9.8%)      + 5 more toggled off      │
│                                                                              │
│  Hover: ● May 27 12:45  |  🇧🇷 Brazil: 18.7%  |  Δ +0.12%/min  |  Vol $1.2M │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Spatial Zones

| Zone | Position | Content |
|------|----------|---------|
| **Header bar** | Top, 36px | Module title (left), time range presets (center), focus toggle + settings (right) |
| **Chart canvas** | Center, fills remaining space | The time-series chart — all data, axes, grid, events render here |
| **Event strip** | Below x-axis, 28px | Horizontal strip with event marker diamonds and short labels |
| **Legend bar** | Bottom, 24px | Country line legend — interactive toggles for line visibility |
| **Crosshair tooltip** | Floating, follows cursor | Precise multi-value readout at cursor position |

### Module Dimensions

```
Min width:  480px
Max width:  None (fills available space — this is the full-width bottom module)
Min height: 260px
Ideal height: 320-400px (enough vertical space for meaningful line separation)
```

---

## 3. Multi-Line Rendering System

### Line Hierarchy

Not all countries are equal on this chart. Lines are rendered in a **three-tier hierarchy** based on current probability:

| Tier | Probability | Max Lines | Stroke Width | Glow Radius | Opacity |
|------|-------------|-----------|-------------|-------------|---------|
| **Primary** | ≥ 10% | 5 lines | 2.0px | 6px | 1.0 |
| **Secondary** | 3% – 10% | 8 lines | 1.2px | 3px | 0.7 |
| **Tertiary** | < 3% | All remaining | 0.6px | 0px (no glow) | 0.35 |

**Dynamic tier assignment:** A country's tier is re-evaluated on every data update. If a country crosses the 10% threshold, its line smoothly transitions from secondary to primary rendering (stroke width lerps over 500ms, glow fades in over 800ms). The transition is handled by animating the relevant shader/rendering uniforms.

**Default visible lines:** On initial load, the top 8 countries by probability are visible. All others are toggled off. The user can toggle individual lines via the legend bar or via the "Show all" option in settings.

### Line Rendering Technique

Each country's line is rendered in **three passes** composited together:

```
Pass 1 — GLOW LAYER (rendered first, behind everything)
  A wide, soft under-line rendered at 4× the stroke width.
  Color: same as the line's base color.
  Gaussian blur: sigma = 6px (primary) / 3px (secondary) / none (tertiary).
  Opacity: 0.18 (primary) / 0.10 (secondary) / 0 (tertiary).
  This creates the TradingView-style "neon line" effect.

  The glow is rendered to an offscreen framebuffer at full resolution,
  then downsampled with a separable Gaussian blur (two-pass: horizontal
  then vertical, for performance). The blurred result is composited
  onto the chart with additive blending (gl.blendFuncSeparate with
  GL.SRC_ALPHA, GL.ONE for the glow pass).

Pass 2 — CORE STROKE (rendered second)
  The actual data line. Width varies by tier (2.0px / 1.2px / 0.6px).
  Color: the country's assigned categorical color.
  Rendered as a polyline (series of connected line segments) using
  triangle-strip geometry for anti-aliased width (no built-in line
  width on most GPUs — custom geometry required for >1px lines).

  Anti-aliasing: Each line segment is expanded into a quad with
  distance-field-based edge softening in the fragment shader.
  This produces perfectly smooth lines at any width on any GPU.

Pass 3 — ACCELERATION OVERLAY (rendered on top)
  A per-segment color modulation layer. See Section 4.
```

### Country Color Assignments

Each country has a fixed categorical color (not derived from probability — identity color, not magnitude color). These are chosen for mutual distinguishability on a dark background:

```
Argentina:      #75AADB    Ice blue (flag-inspired)
Brazil:         #F4C430    Saffron gold (flag-inspired)
France:         #4169E1    Royal blue
Spain:          #E63946    Spanish red
USA:            #B22234    American red (slightly darker than Spain for contrast)
England:        #E8E8E8    Off-white (renders visibly on dark bg)
Germany:        #3A3A3A    Dark charcoal with white 1px outline for visibility
Netherlands:    #FF6B00    Dutch orange
Portugal:       #A93226    Burgundy red
Belgium:        #FFD700    Gold (with dark outline at low opacity)
Croatia:        #E60000    Croatian red checkerboard
Uruguay:        #87CEEB    Sky blue
Mexico:         #006847    Mexican green
Japan:          #BC002D    Japanese red
...remaining countries assigned from a 32-color categorical palette
```

Color assignments are stored in a static lookup table keyed by ISO country code. The palette is designed so that no two countries from the same confederation share similar colors (to avoid confusion in same-confederation comparisons).

### Line Smoothing

Raw data arrives at discrete intervals (every ~3 seconds from Polymarket). Directly connecting these points with straight line segments produces a jagged appearance. Instead, lines are rendered using **Catmull-Rom spline interpolation** — a curve that passes through all data points while maintaining continuous first derivatives (no sharp kinks).

```
Implementation:
  - For each pair of adjacent data points, compute a Catmull-Rom segment
    using the four-point formulation (prev, curr, next, next+1).
  - Subdivide each segment into 8 micro-segments for smooth rendering.
  - The spline is computed on the CPU (JavaScript) and the resulting
    vertices are uploaded to the GPU as a vertex buffer.

  Tension parameter: 0.5 (standard — produces natural-looking curves
  without overshoot).
```

---

## 4. Trend Acceleration Visual Cues

### Concept

A line that is moving sideways conveys "nothing is happening." A line that suddenly steepens conveys "something is happening right now." The chart should make this distinction visually immediate — the user should sense acceleration before they read a number.

### Slope-to-Brightness Mapping

For each line segment, the **local slope** (rate of probability change) is computed and mapped to a brightness/saturation modifier:

```
For a line segment at time t, spanning data points (t-1) to (t):

  slope = (prob(t) - prob(t-1)) / (time(t) - time(t-1))
       = Δprob per minute

  Normalized slope:
    norm_slope = clamp(abs(slope) / 0.5%, 0, 1)
    // 0.5% per minute is considered "maximum steepness" for normalization.
    // A line moving at 0.5%/min or faster gets full brightness.

  Directional split:
    If slope > 0 (probability rising):
      Line brightness = base_brightness + norm_slope × 0.25
      Line saturation = base_saturation + norm_slope × 0.20
      // Upward moves become brighter and more saturated.

    If slope < 0 (probability falling):
      Line brightness = base_brightness + norm_slope × 0.10
      Line saturation = base_saturation - norm_slope × 0.15
      // Downward moves become slightly brighter but desaturated —
      // they draw attention but feel "drained" of color.

    If slope ≈ 0 (flat):
      Line brightness = base_brightness
      Line saturation = base_saturation
      // Sideways time is visually quiet.
```

### Gradient Stroke Implementation

The brightness/saturation is not applied uniformly to the entire line. It is applied **per-segment**, producing a line that shifts subtly in vibrancy along its length. Segments where the line is steepening get brighter; flat segments stay at baseline.

This is implemented in the fragment shader by passing a per-vertex `acceleration` attribute:

```glsl
// Vertex shader: pass acceleration value to fragment shader
varying float v_acceleration;

// Fragment shader: modulate color by acceleration
vec3 baseColor = u_countryColor;
float brightness = 1.0 + v_acceleration * 0.25;
float saturation = 1.0 + v_acceleration * 0.20 * sign(v_acceleration);

// Apply brightness and saturation adjustments
vec3 modulatedColor = adjustBrightnessAndSaturation(baseColor, brightness, saturation);
gl_FragColor = vec4(modulatedColor, 1.0);
```

### Acceleration Glow Pulse

When the slope exceeds 0.2%/min (a "meaningful" acceleration threshold), the glow layer (Pass 1) gains a temporary pulse:

```
Glow opacity during acceleration:
  O_glow = O_base + min(norm_slope × 0.30, 0.30)
  // At maximum steepness, glow opacity doubles from 0.18 → 0.48.

This pulse tracks the moving window of steep segments —
as a steep segment ages and moves leftward on the chart,
its glow fades back to baseline. The "hot zone" is always
the most recent steep section.
```

### Acceleration in the Legend

The legend bar (below the chart) shows miniature indicators for each visible country:

```
── 🇧🇷 Brazil (18.3%)  ▲ accelerating
── 🇫🇷 France (12.4%)  — flat
── 🇺🇸 USA (9.8%)      ▲▲ surging
── 🇩🇪 Germany (7.1%)   ▼▼ declining rapidly
```

The acceleration annotation updates in real time based on the most recent 5-minute slope:
- ▲▲ Surging: slope > 0.3%/min
- ▲ Accelerating: slope 0.1–0.3%/min
- — Flat: slope ±0.1%/min
- ▼ Declining: slope -0.3 to -0.1%/min
- ▼▼ Dropping: slope < -0.3%/min

---

## 5. Time Navigation System

### Preset Ranges

Five preset buttons in the header bar provide instant navigation:

```
[1H] [24H] [7D] [30D] [ALL]
```

| Preset | Data Resolution | X-Axis Ticks | Default Visible Lines |
|--------|----------------|-------------|----------------------|
| **1H** | Per-tick (~3s) | Every 10 minutes | Top 5 (reduce noise) |
| **24H** | Per-minute aggregation | Every 2 hours | Top 8 |
| **7D** | Per-5-minute aggregation | Every day | Top 8 |
| **30D** | Per-hour aggregation | Every 3 days | Top 10 |
| **ALL** | Per-day aggregation | Every 2 weeks | Top 10 |

The active preset is indicated by a filled background (`#1C1C2E`) and white text. Inactive presets have transparent backgrounds and `#8899AA` text.

### Preset Transition Animation

When the user switches between presets, the chart does not snap. It morphs:

```
0ms–100ms:
  Lines fade to 25% opacity (crossfade preparation).
  Grid lines and axis labels remain visible.
  Event markers fade to 50% opacity.

100ms–500ms:
  X-axis scale animates from old range to new range.
  Data points (and their spline curves) interpolate to their new
  pixel positions. For aggregation-based presets (1H→7D),
  the line transitions from high-res to low-res data,
  with intermediate points dissolving.

500ms–600ms:
  Lines fade back to full opacity.
  Event markers return to full opacity.
  Grid lines snap to new positions.

Total: 600ms morph.
Easing: cubic-bezier(0.4, 0.0, 0.2, 1.0) on x-scale.
```

### Continuous Zoom (Scroll Wheel)

In addition to presets, the user can fine-tune the time range using the scroll wheel:

```
Scroll up:   Zoom in  (narrower time window, more detail).
Scroll down: Zoom out (wider time window, more context).

Zoom is centered on the cursor's horizontal position —
the point under the cursor stays fixed while the timeline
contracts/expands around it.

When the zoomed range exactly matches a preset's range
(within 5% tolerance), the corresponding preset button
lights up. Otherwise, no preset is highlighted (custom range).
```

### Pan (Click & Drag)

```
Click + drag horizontally on the chart area:
  Pans the time window left/right.
  Past data scrolls into view. Future data is not available
  (the right edge of the chart is always "now").

  If the user pans far enough that the visible range is
  entirely historical, a "⟳ Back to live" button appears
  in the top-right corner of the chart. Clicking it snaps
  the view back to include the most recent data point.
```

### Double-Click Reset

```
Double-click anywhere on the chart:
  Resets to default view: 24H preset, top 8 countries visible,
  y-axis auto-scaled to fit data.
  The reset animation is a smooth 400ms transition.
```

---

## 6. Hover Crosshair & Tooltip

### Crosshair Rendering

When the cursor moves over the chart area, a crosshair appears:

```
Vertical line:
  Full height of the chart area.
  1px solid #556677 at 0.4 opacity.
  Snaps to the nearest data point's timestamp (not free-floating).

Horizontal line:
  Full width of the chart area. (Optional — toggleable in settings.)
  1px dashed #556677 at 0.2 opacity.
  Snaps to the y-value of the hovered line.

Intersection dots:
  Small circles (3px radius) at each intersection of the vertical
  crosshair with visible country lines.
  Color: each country's line color.
  Opacity: 1.0 for the closest line (the one being "read"),
          0.4 for other visible lines.
```

### Tooltip Card

The tooltip appears at the cursor position + 14px offset (collision-aware: flips to left/above if near screen edges). It shows data for the closest line (the country the cursor is nearest to, determined by y-distance at the crosshair x-position).

```
┌───────────────────────────────────────┐
│  🇧🇷  BRAZIL                          │
│                                       │
│  May 27, 2026  12:45:03 EST           │  ← Timestamp
│                                       │
│  Probability                          │
│  ┌─────────────────────────────────┐  │
│  │  18.7%                          │  │  ← Large current value
│  │  ─────────────────────────────  │  │
│  │  Δ/min:  +0.12%  ▲ accelerating │  │  ← Rate of change
│  │  Δ/5min: +0.58%                 │  │
│  │  Δ/1hr:  +1.84%                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Volume at this point: $1.2M (5min)   │
│  Rank at this point:  #2              │
│                                       │
│  Nearby event (12 min ago):           │
│  ◆ Lineup announcement ▲              │
└───────────────────────────────────────┘

Dimensions: 240px wide, auto height.
Position:   Follows cursor at 14px offset, collision-aware.
Animation:  Fades in over 80ms (very fast — tooltip must feel
            responsive during rapid cursor movement).
            No slide animation (slide feels sluggish for chart hover).
```

### Δ/min Calculation

The rate of change (Δ/min) is computed from the two nearest data points on either side of the crosshair position:

```
Δt = time(t+1) - time(t-1)      // time span in minutes
Δp = prob(t+1) - prob(t-1)      // probability change over that span
Δ/min = Δp / Δt
```

If the crosshair is at the most recent data point (the right edge), only the previous point is available:

```
Δ/min = (prob(now) - prob(now-1)) / (time(now) - time(now-1))
```

### Multi-Line Readout (Optional)

When the user holds the `Shift` key, the tooltip expands to show all visible lines at the crosshair position (not just the nearest one):

```
┌───────────────────────────────────────┐
│  May 27, 2026  12:45:03 EST           │
│                                       │
│  🇦🇷 Argentina  22.1%  ▲0.08%/min     │
│  🇧🇷 Brazil     18.7%  ▲0.12%/min     │  ← highlighted (nearest)
│  🇫🇷 France     12.4%  ▼0.03%/min     │
│  🇪🇸 Spain      11.2%  — flat        │
│  🇺🇸 USA         9.8%  ▲0.25%/min     │
└───────────────────────────────────────┘
```

This allows quick cross-country comparison at any historical moment.

---

## 7. Event Marker System

### Event Data Model

```typescript
interface ChartEvent {
  id: string;
  timestamp: number;             // Unix ms
  type: EventType;
  title: string;                 // Short label: "Group Draw"
  description: string;           // Full description for tooltip
  severity: "low" | "medium" | "high";
  affectedCountries: string[];   // ISO codes of affected countries
  probabilityImpact?: {          // Optional: known impact magnitudes
    countryCode: string;
    direction: "up" | "down";
    magnitude: number;           // Percentage points
  }[];
  source: "manual" | "auto" | "polymarket";
}

type EventType =
  | "tournament"     // FIFA events: draws, match results, announcements
  | "injury"         // Player injury/return news
  | "volume_spike"   // Unusual trading volume detected
  | "price_shock"    // Rapid probability change (>2% in 5 min)
  | "threshold"      // Country crosses 10%/25%/50% threshold
  | "news"           // General news with market impact
  | "social";        // Social media-driven movement
```

### Event Sources

Events come from three sources:

1. **Manual curation:** A pre-loaded dataset of known FIFA tournament dates (draw dates, match schedules, squad announcement windows). These are loaded at application start.

2. **Automatic detection (server-side):** The data pipeline detects:
   - Volume spikes (volume exceeds 3σ above 24h rolling average)
   - Price shocks (probability change >2% in one 3s tick)
   - Threshold crosses (probability crosses a round number: 5%, 10%, 15%, 25%, 50%, 75%)

3. **Polymarket metadata:** Some Polymarket markets include event tags or resolution descriptions that can be parsed into markers.

### Marker Rendering

Event markers appear in two locations:

**A. On the chart (above the plot area):**

```
Diamond shape (◆) positioned along the top edge of the chart at the
event's timestamp. The diamond is connected to the chart by a thin
vertical guideline (0.5px dashed, #556677 at 0.3 opacity) that extends
down through the data area. This lets the user see exactly where on
each country's line the event occurred.

Color coding by severity:
  High:    #FF3D00  (red, 0.9 opacity)
  Medium:  #FFC107  (amber, 0.8 opacity)
  Low:     #556677  (grey, 0.6 opacity)

Size by severity:
  High:    8×8px
  Medium:  6×6px
  Low:     4×4px
```

**B. In the event strip (below the chart):**

```
A 28px horizontal strip below the x-axis labels.
Each event is a small diamond (4px) with a short label below it.
Labels are rotated -30° to fit in tight spaces.

When multiple events are too close together (within 20px horizontally),
they are collapsed into a single "stacked" indicator:

  ◆◆◆  (3 events)
  May 27

Hovering the stacked indicator expands it into a vertical list of
all three events with their individual labels.
```

### Event Tooltip

Hovering an event marker shows a detailed tooltip:

```
┌──────────────────────────────────────────┐
│  ◆  GROUP STAGE DRAW         HIGH IMPACT│
│     May 25, 2026  14:00 EST             │
│                                          │
│  The 48-team group stage draw was        │
│  announced. Several "group of death"     │
│  pairings caused immediate market        │
│  reactions.                              │
│                                          │
│  Affected:                               │
│    🇩🇪 Germany   ▲ +3.2%  (favorable)    │
│    🇧🇷 Brazil    ▼ -1.1%  (tough group)  │
│    🇺🇸 USA       ▲ +1.8%  (host advantage)│
│    +4 more...                            │
│                                          │
│  Volume surge: +340% above average       │
└──────────────────────────────────────────┘
```

### Event Filtering

The header bar includes an event filter dropdown:

```
[⏎ All Events ▾]
  ├ All Events
  ├ Tournament Only
  ├ Volume Spikes
  ├ Price Shocks
  └ High Impact Only
```

Filtering instantly hides/show the marker diamonds and guidelines. The animation is a simple opacity fade (200ms) — markers for hidden categories fade to 0 opacity.

---

## 8. Single-Country Focus Mode

### Activation

Focus mode is toggled by:
- Clicking a country name in the legend bar.
- Clicking a country's line on the chart.
- Pressing a number key (1-9) corresponding to the legend order.
- Clicking the [👁 Focus] button in the header and selecting from a dropdown.

### Visual Transformation

When a single country is focused:

```
0ms–400ms (focus in):

  FOCUSED COUNTRY:
    - Line stroke width: grows from tier-default → 3.0px.
    - Line glow: expands from tier-default → sigma=10px, opacity 0.35.
    - Line color: shifts to full saturation (no modulation).
    - Label: country name appears as a large watermark-style label
      in the top-left of the chart area (28px Inter Bold, color=country
      color at 15% opacity).

  ALL OTHER COUNTRIES:
    - Line stroke: shrinks to 0.5px, opacity drops to 0.12.
    - Line glow: disabled.
    - Event markers: remain visible but at reduced opacity (0.3).
    - These lines become "context" — visible but not legible individually.
      The user sees them as faint background traces that show how the
      focused country moved relative to the broader market.

  Y-AXIS:
    - Optionally re-scales to fit only the focused country's range
      (toggle in settings). Default: y-axis stays at full market range
      so the focused country's position relative to others is preserved.

  CHART BACKGROUND:
    - A subtle radial vignette (darker at edges) appears, drawing
      the eye toward the focused line at the center of the chart.
```

### Focus Mode Controls

When focus mode is active, a small floating control bar appears at the top of the chart:

```
┌─────────────────────────────────────────────┐
│  👁 Focusing: 🇧🇷 Brazil   [← Prev] [Next →] [✕ Exit]  │
└─────────────────────────────────────────────┘
```

- **[← Prev] / [Next →]:** Cycle focus through the visible countries in rank order.
- **[✕ Exit]:** Return to multi-line view.
- **Keyboard:** `Esc` exits focus mode. `J`/`K` cycles previous/next (Vim-style).

### Focus + Time Navigation

Focus mode persists across time range changes. If the user switches from 24H to 7D, the focused country remains focused — but the line data and surrounding context lines update to the new time range. This enables a workflow: focus on Brazil → skim through different time ranges to understand their trajectory at different scales.

### Focus + Crosshair

In focus mode, the crosshair always shows the focused country's data in the tooltip by default. Holding `Shift` shows the usual multi-line readout.

---

## 9. Data Refresh Strategy

### Data Lifecycle

```
POLLING (REST API, every 3 seconds):
  ┌──────────────────────────────────────────┐
  │  GET /api/probability-history?since=...  │
  │  Returns: array of {timestamp, country,  │
  │           probability, volume} records   │
  │  since last fetch.                       │
  └──────────────────────────────────────────┘
         │
         ▼
  ZUSTAND STORE:
  ┌──────────────────────────────────────────┐
  │  history: {                              │
  │    [countryCode]: TimeSeriesPoint[]      │
  │  }                                       │
  │                                          │
  │  Each TimeSeriesPoint:                   │
  │    { ts: number, prob: number,           │
  │      vol: number }                       │
  │                                          │
  │  Data retention:                         │
  │    Full resolution:     last 24 hours    │
  │    Per-minute aggregate: last 7 days     │
  │    Per-hour aggregate:   last 30 days    │
  │    Per-day aggregate:    all time        │
  └──────────────────────────────────────────┘
         │
         ▼
  CHART COMPONENT:
  ┌──────────────────────────────────────────┐
  │  Selects appropriate aggregation level   │
  │  based on current time range preset.     │
  │                                          │
  │  Appends new points to existing series.  │
  │  Triggers line-extension animation.      │
  └──────────────────────────────────────────┘
```

### Data Resolution & Aggregation

The raw data (per-tick, ~3s interval) would produce ~28,800 points per country per day. For the 30-day view, that's ~864,000 points per country — too much for smooth rendering. The system maintains pre-aggregated data at multiple resolutions:

```
Resolution    Interval    Point Count (30 days)    Used For
─────────     ────────    ─────────────────────    ────────
Raw           ~3s         ~864,000                 1H preset
1-minute      ~60s        ~43,200                  24H preset
5-minute      ~300s       ~8,640                   7D preset
1-hour        ~3600s      ~720                     30D preset
1-day         ~86400s     ~30                      ALL preset
```

When the user switches presets, the chart switches to the appropriate aggregation level. The transition animation (Section 5) interpolates between the old and new data resolutions.

### Real-Time Append Animation

When new data arrives while viewing the chart:

```
For each visible country:
  1. The new data point is appended to the time series.
  2. The Catmull-Rom spline is recalculated for the last 4 points.
  3. The new line segment is drawn using a "write-on" animation:

     Technique: stroke-dashoffset on the new segment.
     The new segment (last two points) has its stroke-dasharray
     set to the segment length. stroke-dashoffset animates from
     segment-length → 0 over 200ms, creating a "drawing" effect.

  4. The glow layer for the new segment fades in over 300ms
     (slightly trailing the core stroke for a layered reveal).

  5. If the new point causes the y-axis range to change
     (probability exceeds current y-max), the axis smoothly
     rescales over 400ms (ease-out).

  6. The x-axis right edge shifts to accommodate the new time.
     This shift is animated: translateX over 200ms so the chart
     appears to "slide left" as new data enters from the right.
```

### Historical Data Pruning

To manage memory, the client prunes raw (3s-interval) data older than 24 hours:

```
Every 5 minutes:
  - Raw data points older than 24h are aggregated to per-minute
    averages and the raw points are discarded.
  - Per-minute data older than 7 days is aggregated to per-hour
    and the per-minute points are discarded.
  - Per-hour data older than 90 days is aggregated to per-day
    and the per-hour points are discarded.
  - Per-day data is kept indefinitely (negligible storage: ~365
    points per country per year).
```

### Late-Arriving Data

If a data point arrives with a timestamp older than the most recent point (possible due to network lag or server-side backfill), it is inserted into the correct chronological position rather than appended. The line is recalculated for the affected segment, and the correction is rendered without animation (immediate update — corrections should not draw attention to themselves).

---

## 10. Interaction Logic

### Complete Interaction Map

```
┌──────────────────────────────────────────────────────────────┐
│ CHART AREA (Canvas)                                          │
│                                                              │
│  Hover:        Crosshair + tooltip                           │
│  Click line:   Focus that country                            │
│  Click empty:  Deselect / exit focus mode                    │
│  Drag:         Pan time axis                                 │
│  Scroll:       Zoom time axis (centered on cursor)           │
│  Double-click: Reset to default view                         │
│  Shift+Hover:  Multi-line tooltip readout                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ HEADER BAR                                                   │
│                                                              │
│  Click preset:  Switch time range                            │
│  Click [👁]:    Open focus mode dropdown                     │
│  Click [⚙]:    Open settings panel                           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ EVENT STRIP                                                  │
│                                                              │
│  Hover marker:  Event tooltip                                │
│  Click marker:  Pin event (persistent tooltip + highlight)   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ LEGEND BAR                                                   │
│                                                              │
│  Click name:    Toggle line visibility                       │
│  Double-click:  Focus that country                           │
│  Right-click:   Context menu (Focus / Hide / View on Poly-)  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ KEYBOARD                                                     │
│                                                              │
│  1-9:           Focus country by legend order                │
│  0:             Exit focus mode                              │
│  Esc:           Exit focus mode / deselect event             │
│  J / K:         Cycle focused country prev/next              │
│  ← →:           Pan time axis                                │
│  Shift+← →:     Fast pan (3× speed)                          │
│  + / -:         Zoom in/out                                  │
│  R:             Reset view                                   │
│  F:             Focus search (type country name)             │
│  Space:         Pause/resume real-time updates               │
│  H:             Toggle horizontal crosshair line             │
│  E:             Toggle event markers visibility              │
└──────────────────────────────────────────────────────────────┘
```

### Selection State Propagation

When a country is focused in Module C, this selection propagates to other modules via the shared Zustand store:

```
Module C Focus → Zustand.selectedCountry = "BRA"
  → Module A: Spotlight Brazil on map, dim others
  → Module B: Scroll to Brazil in rankings, highlight its row
  → Module D: Brazil's ticker item gets glow border
```

The reverse is also true: clicking a country in Module A or B will focus it in Module C.

---

## 11. Edge States

### Loading State

```
Chart background renders with grid lines and axes.
No lines visible yet.
A subtle scanning animation: a 200px-wide vertical highlight band
  sweeps from left to right across the chart over 2.5 seconds,
  repeating. Color: #1C1C2E at 30% opacity on a #0A0A0F background.

Axes show placeholder labels: "..." instead of time values.
Legend bar shows country names in #556677 (dim, unclickable).

When data arrives (first snapshot):
  - Scanning band fades out over 400ms.
  - Lines draw in from left to right with the write-on animation
    (staggered: top-ranked country draws first, 100ms stagger).
  - Axes populate with real values (fade in, 300ms).
  - Legend bar names brighten to full color (staggered, 50ms each).
  - Total time to first meaningful display: ~1.2 seconds.
```

### Empty State (No Historical Data)

```
If a country has been added to the market but has less than 2 data points
(no meaningful history yet):

  - The country's line is not rendered.
  - Its legend entry shows a small "new" pill badge.
  - After 5 data points (>15 seconds), the line appears with a
    "fade in from nothing" animation (300ms).

If all countries have no historical data:
  - Chart shows empty grid with message: "Accumulating data..."
    in #8899AA, centered.
  - Sub-message: "Historical trends will appear as data is collected."
```

### Stale/Disconnected State

Same behavior as Module A and B — the status dot changes, a banner appears, and the last known data persists. Additionally:

- The right edge of the chart shows a vertical dashed line at the timestamp of the last received data point (the "data frontier").
- Space to the right of this line (future empty space) is rendered with a subtle striped pattern (diagonal lines at 45°, `#0D0D18` on `#0A0A0F`), indicating "no data beyond this point."
- If the user pans right past the data frontier, they see only the striped void.

---

## 12. Technical Notes

### Rendering Technology

The chart uses **HTML5 Canvas with a 2D context** (not WebGL, unlike Module A). Rationale:
- 2D Canvas has simpler text rendering (axis labels, tooltips).
- The line count is low (max ~15 simultaneous lines) — 2D Canvas handles this at 60fps.
- Event markers and crosshair are straightforward to draw in 2D.
- The glow effect (Gaussian blur) is achievable via `ctx.filter = 'blur()'` on supporting browsers, with a manual multi-pass fallback.

**Fallback strategy:** If Canvas 2D `filter: blur()` is not available (older browsers), the glow is approximated by drawing the line multiple times with decreasing opacity and increasing lineWidth (a "stacked line" technique).

### Canvas Layer Architecture

```
Layer 1 (bottom):  Grid lines + axis labels
                   Redrawn only on zoom/pan/resize (cached to offscreen canvas).

Layer 2:           Glow passes (one per visible country)
                   Redrawn each frame during animation, otherwise cached.

Layer 3:           Core line strokes
                   Redrawn each frame during animation, otherwise cached.

Layer 4:           Event markers + guidelines
                   Redrawn only when event filter changes.

Layer 5 (top):     Crosshair + tooltip + hover indicators
                   Redrawn every frame during mouse movement.

Dirty-rectangle optimization:
  Only layers with changes are redrawn. During steady-state viewing
  (no hover, no animation), only Layer 3 needs updates when new
  data appends (~every 3 seconds). Layers 1, 4, and 5 are at rest.
```

### Performance Budget

| Metric | Target |
|--------|--------|
| Frame time (steady state) | < 4ms |
| Frame time (crosshair active) | < 6ms |
| Frame time (animation playing) | < 10ms |
| Data points in memory (all countries, all resolutions) | < 200K points (~8MB) |
| Canvas resolution | Device pixel ratio × element size (max 2× for retina) |
| Catmull-Rom spline calculation | < 1ms for 15 lines × visible data points |

### Data Flow into Chart

```
Zustand Store subscription:

  const visibleLines = useStore(state => {
    const countries = state.countries;
    const visibleCountryCodes = state.visibleTimelineCountries;
    const timeRange = state.timelineRange;

    return visibleCountryCodes.map(code => ({
      code,
      color: COUNTRY_COLORS[code],
      currentProb: countries.get(code)?.impliedProbability ?? 0,
      tier: getTier(countries.get(code)?.impliedProbability ?? 0),
      data: selectResolution(
        countries.get(code)?.probabilityHistory ?? [],
        timeRange
      ),
    }));
  });

  // The chart component receives visibleLines and renders to Canvas.
  // Changes to visibleLines trigger a Canvas redraw via useEffect.
```

### Accessibility

- The chart canvas has a descriptive `aria-label`: "Probability timeline chart showing X countries over Y time range."
- Keyboard navigation: arrow keys pan, +/- zoom, number keys focus countries.
- The legend bar is a list of `<button>` elements with `aria-pressed` states for visibility toggles.
- Event markers in the event strip are `<button>` elements with descriptive `aria-labels`.
- The crosshair tooltip data is mirrored to a screen-reader-only live region (`aria-live="polite"`) that updates with: "Argentina, 22.1 percent at May 27 12:45 PM, rising 0.08 percent per minute."
- Focus mode announcements: when entering focus mode, a live region announces: "Focusing on Brazil. Showing 30 days of data."

---

*End of Module C Design Specification*
