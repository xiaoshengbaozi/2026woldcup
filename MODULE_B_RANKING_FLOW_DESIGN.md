# Module B — Country Champion Probability Ranking Dynamic Flow
## Deep-Dive Visual Design Specification

**Version:** 1.0 | **Date:** 2026-05-27
**Design Lineage:** Bloomberg Terminal Rank View × ESPN Live Leaderboard × F1 Race Telemetry Bar

---

## Table of Contents

1. [Overview](#1-overview)
2. [UI Structure](#2-ui-structure)
3. [Row Anatomy: The Dynamic Data Bar](#3-row-anatomy-the-dynamic-data-bar)
4. [The Fluid Rank-Change Animation System](#4-the-fluid-rank-change-animation-system)
5. [The Squeeze Mechanic](#5-the-squeeze-mechanic)
6. [Vibration Feedback System (1% Trigger)](#6-vibration-feedback-system-1-trigger)
7. [Top-3 Podium Effects](#7-top-3-podium-effects)
8. [Hover Interaction](#8-hover-interaction)
9. [Country Detail Overlay (Click)](#9-country-detail-overlay-click)
10. [Data Update Mechanism & State Reconciliation](#10-data-update-mechanism--state-reconciliation)
11. [Edge States](#11-edge-states)
12. [Technical Notes](#12-technical-notes)

---

## 1. Overview

### Module Role

If Module A (the map) answers *where*, Module B answers *who is winning and by how much*. This is the live leaderboard — a vertical stream of ranked countries where every row is a horizontal data bar whose length equals championship probability. The list breathes: ranks shift with fluid momentum, bars extend and contract with each price tick, and the tension between closely-ranked countries is physically palpable through a "squeeze" mechanic.

The core design metaphor is a **race in progress** — not a static ordered list, but a living competition where positions are contested in real time. A country at rank 5 that is 0.3% behind rank 4 should *look* like it's breathing down the leader's neck.

### Design Principles (Module-Specific)

1. **The bar is the number.** A country at 22.1% has a bar 2.2× longer than one at 10%. The visual weight of each row is directly proportional to its probability. No need to read digits to know who's leading — the bar tells you instantly.

2. **Motion is earned.** Ranks do not snap. They slide. A country rising from #8 to #5 should feel like it fought its way up — the animation has weight, momentum, and a trace of overshoot. The countries it passes should visibly yield space.

3. **Closeness is tension.** When two countries are separated by less than 1% probability, the space between their rows compresses. The gap narrows. The bars visually "lean" toward each other. This is the squeeze mechanic — it makes tight races feel tight.

4. **The top 3 are sacred.** The podium positions have distinct visual treatments — gold/silver/bronze glow, breathing borders, and a subtle pedestal elevation. These are not just ranks; they are tiers.

---

## 2. UI Structure

### Full Module Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CHAMPIONSHIP RANKINGS        [Top 10 ▾] [Prob ▼] [Δ 1h]  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  #1  🇦🇷 Argentina                                    │  │
│  │  ─── ██████████████████████████████████████████ 22.1% │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  │
│  │                                 ▲2.3%   $14.2M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #2  🇧🇷 Brazil                                       │  │
│  │  ─── ██████████████████████████████████████ 18.3%     │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │  │
│  │                                 ▼0.8%    $9.1M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #3  🇫🇷 France                                       │  │
│  │  ─── █████████████████████████████ 12.4%              │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 │  │
│  │                                 ▼1.1%    $7.8M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #4  🇪🇸 Spain                                        │  │
│  │  ─── ██████████████████████████ 11.2%                 │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                  │  │
│  │                                 ▲0.4%    $6.2M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #5  🇺🇸 United States                                │  │
│  │  ─── ██████████████████ 9.8%                          │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                         │  │
│  │                         ▲5.2%    $11.3M vol  🔥 ALERT  │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #6  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England                                       │  │
│  │  ─── █████████████████ 8.6%                           │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                        │  │
│  │                                 ▼0.2%    $5.1M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #7  🇩🇪 Germany                                       │  │
│  │  ─── ██████████████ 7.1%                              │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                            │  │
│  │                                 ▼2.7%    $4.0M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #8  🇳🇱 Netherlands                                   │  │
│  │  ─── ███████████ 5.5%                                 │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                │  │
│  │                                 ▲1.8%    $2.9M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #9  🇵🇹 Portugal                                      │  │
│  │  ─── █████████ 4.2%                                   │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓▓                                    │  │
│  │                                 ▲0.6%    $2.1M vol     │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │                                                       │  │
│  │  #10 🇧🇪 Belgium                                       │  │
│  │  ─── ████████ 3.8%                                    │  │
│  │      ▓▓▓▓▓▓▓▓▓▓▓▓                                     │  │
│  │                                 ▼0.3%    $1.7M vol     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Showing 10 of 48   |   Last update: 14:32:05 EST          │
└─────────────────────────────────────────────────────────────┘
```

### Spatial Zones

| Zone | Position | Content |
|------|----------|---------|
| **Header bar** | Top, 36px | Module title (left), dropdown for Top-N selector, sort control (right) |
| **Ranking list** | Center, scrollable | N rows of country data bars, vertically stacked |
| **Footer bar** | Bottom, 20px | Row count, last-update timestamp |
| **Hover tooltip** | Floating, inline | Expanded row detail (appears on hover, replaces the compact metadata line) |
| **Detail overlay** | Full-width panel, slides in from right | Historical trend, full stats (appears on click) |

### Module Dimensions

```
Min width:  320px
Max width:  480px (constrained — this is the right-column module in the 2-column layout)
Ideal height: Matches content (scrolls if needed) or fills viewport height minus ticker
Row height:  52px per country (compact mode) or 64px (expanded mode)
```

### Row Count Modes

| Mode | Count | Row Height | Use Case |
|------|-------|------------|----------|
| **Compact** | Top 10 | 52px | Default view, fits most screens without scrolling |
| **Extended** | Top 20 | 44px | More countries visible, denser layout |
| **Full** | All 48 | 36px | Maximum density, scrollable, for power users |

The user toggles via a dropdown in the header: "Top 10 ▾" → "Top 20" → "All (48)".

---

## 3. Row Anatomy: The Dynamic Data Bar

### Full Row Structure

Each country row is a self-contained horizontal strip, 52px tall (compact mode), composed of these elements, laid out left-to-right:

```
┌───┬───┬──────────────────────────────────────────────┬──────┬──────────────┐
│   │   │                                              │      │              │
│ R │ F │  COUNTRY NAME        ░░░░ SPARKLINE ░░░░     │ PROB │  DELTA + VOL │
│ A │ L │  ─────────────────────────────────────────── │      │              │
│ N │ A │  ═══════════════ DATA BAR ═══════════════════ │ 22.1%│  ▲2.3% $14M  │
│ K │ G │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │      │              │
│   │   │                                              │      │              │
└───┴───┴──────────────────────────────────────────────┴──────┴──────────────┘
 │   │    │                                                │         │
8px 32px  flex (min 120px)                               72px      120px
```

### Element Breakdown (Left to Right)

**A. Rank Number** — 8px wide, right-aligned.

```
Typography:  "Inter" Bold, 14px.
Color:        #FFD700 (gold) for #1
              #C0C0C0 (silver) for #2
              #CD7F32 (bronze) for #3
              #8899AA (muted blue-grey) for #4+
Background:   None (transparent).
Animation:    On rank change, the number "flips" using a split-flap effect:
              old digit slides up and fades, new digit slides in from below.
              Duration: 350ms, staggered per digit (ones place first, then tens).
              Easing: cubic-bezier(0.4, 0.0, 0.2, 1.0).
```

**B. Flag Emoji** — 24px fixed width, centered.

```
Rendering:    Native emoji with Twemoji CDN fallback for cross-platform consistency.
Size:         20px. Rendered inside a 24px container.
              The flag sits on a subtle dark circular backdrop (18px diameter,
              #1C1C2E, opacity 0.6 when row is not hovered; opacity 1.0 on hover).
```

**C. Country Name + Sparkline** — Flexible width, min 120px.

```
Country Name:
  Typography:  "Inter" SemiBold, 13px, color #EAEAEA.
               Country name in English (e.g., "Argentina", not "ARG").
  Truncation:  If name exceeds available width, truncate with "…".
               Full name shown in hover tooltip.

Sparkline (Inline Mini-Chart):
  Position:    Directly below the country name, sharing the same horizontal space.
  Size:        Full width of the name column, 18px tall.
  Data:        24-hour probability history at 5-minute intervals (~288 data points).
               Only the most recent 60 intervals (5 hours) are rendered.
  Rendering:   A thin (1px) line chart, with area fill below the line.
  Line color:  #00E676 (green) if 24h change is positive.
               #FF1744 (red) if 24h change is negative.
               #556677 (grey) if flat (±0.2%).
  Area fill:   Gradient from line color at 12% opacity (top) to 0% opacity (bottom).
               This creates a subtle "glow" under the trend line.
  Update:      On each new data point, the line extends rightward by one interval
               with a 200ms "write-on" animation (stroke-dashoffset trick).
               Oldest data point slides off the left edge.
```

**D. The Data Bar** — This is the primary visual encoding of probability.

```
Position:    Below the country name and sparkline, spanning the full name-column width.
Height:      6px (compact) or 8px (expanded).
Shape:       Rounded rectangle (border-radius: 3px/4px).

Bar Length:  Proportional to the country's implied probability.
             The maximum bar length fills 100% of the column width.
             Mapping: bar_width_px = (probability / maxDisplayProbability) × column_width_px
             where maxDisplayProbability is the max probability among all visible countries
             (or a fixed ceiling like 30%, whichever is higher — dynamic scaling
             prevents the top country's bar from always being 100% if it's only at 12%).

Bar Color:   The country's current probability color from the Module A spectrum
             (cold grey → blue → gold → red), applied as a horizontal gradient:
             left edge is slightly lighter, right edge slightly darker.
             This gives the bar a subtle 3D cylindrical feel without explicit
             shading — just a 5% lightness gradient L→R.

Bar Fill:    The bar has two overlapping layers:

  Layer 1 (background track):
    Full-width, semi-transparent. Color: #1C1C2E.
    This shows the "track" that the bar runs on.

  Layer 2 (filled bar):
    Width = probability proportion. Color = probability spectrum.
    This is the actual data bar.

  Layer 3 (recent-change ghost):
    A thin vertical line (1px, #FFFFFF at 30% opacity) positioned
    at the bar's previous length (from the last update 3 seconds ago).
    This ghost line fades out over 5 seconds.
    It shows where the bar *was* — a subtle "previous close" marker.

Bar Animation:
  On probability change:
    Bar length lerps from old width to new width over 400ms.
    Easing: cubic-bezier(0.25, 0.1, 0.25, 1.0) — overshoot at the end
    (the bar extends slightly past target, then settles back).
    Overshoot amount: 3% of change magnitude (negligible for <0.5% changes,
    noticeable for >2% changes — a satisfying "bounce").

  On significant surge (>2% in one update):
    A bright "shimmer" sweeps across the bar from left to right over 600ms
    — a 30px-wide white highlight at 40% opacity that travels the full
    bar length once. This draws attention to the change.
```

**E. Probability Number** — 72px fixed width, right-aligned.

```
Typography:  "JetBrains Mono" Bold, 18px, tabular lining (fixed-width digits).
Color:       #FFFFFF for the probability value.
             The "%" sign is #8899AA at 14px (de-emphasized).
Animation:   Odometer roll — each digit changes independently.
             See Section 4 for full odometer specification.
```

**F. Delta + Volume** — 120px fixed width, right-aligned.

```
Delta:
  Arrow:       ▲ (U+25B2) or ▼ (U+25BC) with signed percentage.
               Typography: "JetBrains Mono" Medium, 12px.
               Color: #00E676 (up) or #FF1744 (down) or #78909C (flat).
               The arrow sits 2px to the left of the number.

Volume:
  Below the delta, same horizontal space.
  Typography:  "JetBrains Mono" Regular, 10px, color #556677.
  Format:      Abbreviated: "$14.2M", "$9.1M", "$2.9M", "$850K".
               Full value in hover tooltip.

Alert badge (conditional):
  When a country's probability changes by >3% in 1 hour,
  a small "🔥" pill appears to the right of the delta, pulsating.
  See vibration feedback system (Section 6).
```

### Row Separator

A 1px horizontal line separates each row. Color: `#1C1C2E`. The separator has a subtle gradient: opaque at the center, fading to transparent at both left and right edges (10px fade zone on each side). This prevents the "prison bars" look of full-width solid separators.

---

## 4. The Fluid Rank-Change Animation System

This is the centerpiece of Module B. When country probabilities update and ranks shift, the animation must convey the *physics of competition* — not just reorder a list.

### Animation Pipeline

When new data arrives, the system executes these steps in sequence:

```
Step 1: ANALYZE (0ms)
  Compare old ranks to new ranks.
  Identify: climbers (rank improved), fallers (rank worsened), stable (no change).

Step 2: PREPARE (0-100ms, stagger 30ms per row)
  Rows that will move begin a "lift-off" effect:
    - Scale slightly: transform: scaleX(1.02) — the row "puffs up" slightly.
    - Opacity dips from 1.0 → 0.85.
    - A subtle drop-shadow appears below the row.
  Duration: 100ms.

Step 3: TRANSLATE (100-500ms, physics-driven)
  The moving row translates vertically to its new position.
  Simultaneously, displaced rows translate to fill/clear the gap.
  Physics: Spring-based (stiffness: 200, damping: 24, mass: 1).
  This creates ~400ms of movement with slight overshoot.

Step 4: SETTLE (500-700ms)
  The moving row lands at its destination.
    - Scale returns from 1.02 → 1.00.
    - Opacity returns from 0.85 → 1.00.
    - Drop-shadow fades out.
  The rank number "flips" to the new value (odometer).
  Duration: 200ms.

Step 5: CELEBRATE (700-1000ms, only for climbers)
  If a row climbed 2+ positions:
    - A brief gold glint sweeps across the row from left to right (300ms).
    - A subtle particle burst (4-6 gold dots) emanates from the rank number.
  Duration: 300ms.
```

### Animation State Machine

```
                    ┌──────────┐
          ┌────────►│  STABLE  │◄─────────┐
          │         └────┬─────┘          │
          │              │                │
          │         data arrives           │
          │         ranks differ           │
          │              │                │
          │              ▼                │
          │      ┌──────────────┐         │
          │      │  PREPARING   │         │
          │      │  (scale up,  │         │
          │      │   dim, lift) │         │
          │      └──────┬───────┘         │
          │             │                │
          │        stagger complete       │
          │             │                │
          │             ▼                │
          │      ┌──────────────┐         │
          │      │  MOVING      │         │
          │      │  (spring     │         │
          │      │   translate) │         │
          │      └──────┬───────┘         │
          │             │                │
          │        spring settled         │
          │             │                │
          │             ▼                │
          │      ┌──────────────┐         │
          │      │  SETTLING    │         │
          │      │  (unscale,   │         │
          │      │   flip rank) │         │
          │      └──────┬───────┘         │
          │             │                │
          │        settle complete        │
          │             │                │
          │             ▼                │
          │      ┌──────────────┐  (conditional)
          │      │  CELEBRATE   │──┘
          │      │  (glint,     │
          │      │   particles) │
          │      └──────┬───────┘
          │             │
          └─────────────┘
```

### Vertical Translation Mechanics

The ranking list does NOT reorder DOM elements. Instead, each row is positioned absolutely within a relative container using `transform: translateY()`. The translateY value is computed as:

```
translateY = (newRank - 1) × rowHeight + accumulatedOffset

where accumulatedOffset accounts for squeeze mechanics (Section 5).
```

This means rank changes are pure CSS transform changes — no layout thrash, fully GPU-composited. When a country moves from rank 5 to rank 3, its translateY changes from `4 × 52px = 208px` to `2 × 52px = 104px` — a spring-animated transform.

### Stagger Timing

When multiple countries change rank simultaneously, their animations are staggered to create a readable "wave":

```
Stagger delay per row: 40ms
Order: Top-to-bottom (rank 1 animates first, then rank 2, etc.)
       This creates a "cascade" effect — the leaderboard ripples from top to bottom.
```

If only one country changes rank (e.g., #7 drops to #9, pushing #8 and #9 up):
- The falling country (#7 → #9) starts its downward slide first.
- After 60ms, the displaced countries (#8 → #7, #9 → #8) begin their upward slides.
- This 60ms offset creates the visual impression that the falling country "makes space" before the others fill it — more natural physics.

### The Odometer (Rank Number Flip)

The rank number does not simply crossfade. Each digit is rendered in a small container with `overflow: hidden`. When the rank changes:

```
Old digit: slides upward, opacity 1.0 → 0.0 over 150ms.
New digit: slides upward from below the clip region, opacity 0.0 → 1.0 over 150ms.

Single-digit ranks (1-9):    one digit animates.
Double-digit ranks (10-48):  two digits animate independently.
                              The tens digit changes first (stagger 60ms).
```

This creates a mechanical "split-flap display" feel — like an old airport departure board — that fits the Bloomberg Terminal aesthetic.

---

## 5. The Squeeze Mechanic

### Concept

When two adjacent countries have very close probabilities (within 1% of each other), the visual gap between their rows compresses. This creates a physical sensation of **proximity and tension** — these two countries are "neck and neck" in the race.

When one country finally overtakes the other, the squeeze releases in a satisfying "pop" — the gap snaps back to normal spacing as the countries separate.

### Squeeze Intensity Calculation

```
For each adjacent pair of countries (rank i and rank i+1):

  gap = prob(i) - prob(i+1)     // probability difference (positive number)

  If gap >= 1.0%:
    squeeze = 0    (no compression — normal spacing)

  If gap < 1.0%:
    squeeze = (1.0% - gap) / 1.0%   // linear from 0 → 1 as gap shrinks
    squeeze = clamp(squeeze, 0, 1)

  Effective row gap = normalGap × (1.0 - squeeze × 0.4)
    // At maximum squeeze (gap ≈ 0), rows are 60% of normal spacing.
    // They never fully overlap — minimum gap is 6px.
```

### Squeeze Visual Treatment

When squeeze is active (gap < 1%):

1. **Row spacing:** The gap between the two rows compresses by up to 40%.
2. **Bar tension glow:** A subtle glow appears at the right (trailing) edge of both data bars — as if the bars are pushing against each other. Glow color: `#FFFFFF` at `squeeze × 0.15` opacity.
3. **Probability numbers:** The two probability values get a subtle "heat shimmer" (a rapid 0.5px vertical oscillation, random phase, 0.3s period) when squeeze > 0.7. This makes the numbers look like they're vibrating with competitive tension.
4. **Divider line:** The separator between the two rows brightens from `#1C1C2E` to `#2A2A4A` when squeeze > 0.5, and pulses subtly (opacity 0.6→1.0→0.6, 1.5s period) when squeeze > 0.8.

### Squeeze Release ("Pop") Animation

When the squeeze resolves (gap opens beyond 1% because one country's probability changed):

```
0ms:     Squeeze state at maximum compression.
0-80ms:  The gap snaps open rapidly — spring with stiffness: 400, damping: 16.
         This creates a fast, snappy release with slight overshoot.
         The country that moved ahead gets a brief "forward surge" —
         its data bar extends slightly past its target length (+2% overshoot)
         and its row briefly shifts upward by 2px, then settles back.
80-200ms: Everything settles to normal spacing.
          Glow fades out. Shimmer stops. Divider returns to normal color.
```

The pop is one of the most satisfying micro-interactions in the module. Users watching a tight race will feel the release when the deadlock breaks.

---

## 6. Vibration Feedback System (1% Trigger)

### Trigger Condition

When a country's probability changes by **≥1.0%** in a single data update cycle (~3 seconds), the row triggers a "vibration" feedback animation. This is not a haptic vibration (though that could be added on mobile) — it is a visual vibration that draws the eye.

### Vibration Spectrum

The vibration intensity scales with the magnitude of the change:

| Change Magnitude | Vibration Level | Visual Effect |
|-----------------|-----------------|---------------|
| 1.0% – 1.9% | Level 1: Tremor | Row shakes horizontally ±1px, 3 oscillations over 400ms |
| 2.0% – 3.9% | Level 2: Quake | Row shakes ±2px, 5 oscillations over 600ms. Data bar flashes. |
| 4.0% – 5.9% | Level 3: Shock | Row shakes ±3px, 7 oscillations over 800ms. Bar shimmers. 🔥 badge appears. |
| ≥ 6.0% | Level 4: Seismic | Row shakes ±4px, 9 oscillations over 1000ms. Full row glow pulse. "⚠" badge. |

### Vibration Waveform

The vibration uses a **damped sine wave** for the horizontal displacement:

```
displacement(t) = amplitude × sin(t × frequency × 2π) × e^(-t × decay)

Where:
  amplitude  = level-dependent (1-4px)
  frequency  = 8 Hz (8 oscillations per second — fast enough to feel like a buzz,
               slow enough to be visually trackable)
  decay      = 6.0 (rapid decay — the vibration dies out quickly)
  t          = seconds since trigger
```

The vibration is applied as `transform: translateX(displacement)` on the row element, with `will-change: transform` pre-set during the animation. It does not affect the vertical position or the data bar length.

### Vibration + Direction

The vibration is color-tinted based on direction:

```
▲ UP:    Vibration overlay is tinted #00E676 at 15% opacity.
         A subtle green "energy" aura around the row.

▼ DOWN:  Vibration overlay is tinted #FF1744 at 15% opacity.
         A subtle red "warning" aura around the row.
```

The tint is applied as a `box-shadow: inset 0 0 [amp×10]px [color]` on the row, fading out over the vibration duration.

### Cooldown Period

After a vibration triggers, the row enters a 10-second cooldown. During cooldown, subsequent 1%+ changes do not re-trigger the vibration (to prevent stuttering during volatile periods). The cooldown is visually indicated by a small grey dot (4px) that appears in the bottom-right corner of the row and fades as the cooldown expires (the dot acts as a progress indicator).

### Cumulative Alert Badge

When a country accumulates 3 or more Level-2+ vibrations within a 30-minute window, a persistent alert badge appears next to the country name:

```
🔥 HIGH VOLATILITY
```

This badge remains for 30 minutes after the last vibration. It is rendered as a small pill: 4px tall, background `#FF3D00` at 30% opacity, text "VOL" in 8px Inter Medium, color `#FF3D00`. The badge pulses subtly (opacity 0.6→1.0, 2s period).

---

## 7. Top-3 Podium Effects

### Overview

The top 3 ranked countries receive persistent visual treatments that distinguish them as being "on the podium." These effects are always active, not event-driven, and they intensify as probability increases.

### Rank #1 — Gold Champion

```
Row background:
  A subtle gold gradient overlay on the row:
  linear-gradient(90deg, rgba(255,215,0,0.04) 0%, rgba(255,215,0,0.08) 100%)
  This gives the #1 row a warm golden undertone.

Border:
  Left edge: 3px solid #FFD700 (gold).
  The border breathes: opacity oscillates 0.6 → 1.0 → 0.6 over 3.5s.

Rank number:
  #FFD700 (gold), 16px (slightly larger than other ranks at 14px).
  A subtle text-shadow: 0 0 8px rgba(255,215,0,0.4).

Data bar:
  The bar has a gold particle overlay — 3-5 tiny gold dots (2px)
  gently floating above the bar surface, moving left to right at
  10px/s speed, looping seamlessly.

Glow ring (conditional):
  When probability > 25%: a subtle gold outer glow appears around
  the entire row — box-shadow: 0 0 20px rgba(255,215,0,0.15).
  When probability > 50%: glow intensifies to 0 0 30px rgba(255,215,0,0.25).
```

### Rank #2 — Silver Challenger

```
Row background:
  Subtle silver gradient:
  linear-gradient(90deg, rgba(192,192,192,0.03) 0%, rgba(192,192,192,0.06) 100%)

Border:
  Left edge: 2px solid #C0C0C0 (silver).
  Breathing: opacity 0.5 → 0.9 → 0.5, 4.0s period (slightly slower than gold).

Rank number:
  #C0C0C0 (silver), 15px.
  Text-shadow: 0 0 6px rgba(192,192,192,0.3).

Data bar:
  Silver particle overlay — 2-3 tiny silver dots, slower movement (6px/s).

Glow ring:
  Probability > 20%: 0 0 15px rgba(192,192,192,0.10).
  Probability > 40%: 0 0 22px rgba(192,192,192,0.18).
```

### Rank #3 — Bronze Contender

```
Row background:
  Subtle bronze gradient:
  linear-gradient(90deg, rgba(205,127,50,0.02) 0%, rgba(205,127,50,0.05) 100%)

Border:
  Left edge: 2px solid #CD7F32 (bronze).
  Breathing: opacity 0.4 → 0.8 → 0.4, 4.5s period.

Rank number:
  #CD7F32 (bronze), 14px.
  Text-shadow: 0 0 5px rgba(205,127,50,0.25).

Data bar:
  Bronze particle overlay — 2 tiny bronze dots, slowest movement (5px/s).

Glow ring:
  Probability > 15%: 0 0 10px rgba(205,127,50,0.08).
  Probability > 30%: 0 0 16px rgba(205,127,50,0.14).
```

### Podium Transition Animation

When a country enters or leaves the top 3:

```
ENTERING PODIUM (e.g., rank 4 → rank 3):
  0-200ms:   Bronze border and gradient fade in.
             Particles spawn gradually over this period.
  200-400ms: Rank number transitions to bronze color.
             Glow ring fades in.
  400-600ms: Breathing animation begins.
  Total: 600ms fade-in.

LEAVING PODIUM (e.g., rank 3 → rank 4):
  0-300ms:   All podium effects fade out simultaneously.
             Border → grey, gradient → transparent,
             particles → dissolve, glow → extinguish.
  Total: 300ms fade-out (faster exit — the demotion feels immediate).
```

---

## 8. Hover Interaction

### Hover Detection

Each row is a single hit target. Hover detection uses CSS `:hover` on the row container (no GPU picking needed for a simple list). Debounced at 50ms to prevent flicker during fast cursor movement.

### Row-Level Hover Response

When the cursor enters a row:

```
0-100ms:
  - Row background brightens: background-color from transparent → #1A1A2E.
  - Left edge: a 2px highlight appears in the row's probability color
    (overriding the top-3 border if applicable).
  - Flag backdrop: opacity from 0.6 → 1.0, background-color #1C1C2E → #2A2A3A.
  - Data bar: brightness increases by 10% (CSS filter: brightness(1.1)).
  - Sparkline: line width from 1px → 1.5px, area fill opacity doubles.

100-200ms:
  - The inline metadata area (delta + volume) expands slightly:
    delta font-size from 12px → 13px.
  - A subtle "expand" cursor indicator: a rightward arrow "›" appears
    at the right edge of the row, fading in.

Exit: Reverse all changes over 100ms (faster exit).
```

### Country Detail Tooltip (Inline Expansion)

On hover, instead of a floating tooltip card, the row itself **expands vertically** to reveal additional detail inline. This avoids the "tooltip chasing the cursor" problem and keeps the eye on the ranking list.

```
Normal row (52px):

  #5  🇺🇸 United States  ─── ██████████████████ 9.8%  ▲5.2% $11.3M

Expanded row (104px — 52px × 2):

  #5  🇺🇸 United States  ─── ██████████████████ 9.8%  ▲5.2% $11.3M
  ┌──────────────────────────────────────────────────────────────┐
  │  7d Range:  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  4.6% —— 11.2%     │
  │  24h High:  10.1% (14:02)   24h Low: 4.6% (03:45)           │
  │  Volume 24h: $11.3M   |   Markets: 4   |   Spread: 1.2¢     │
  │  Trend: ↗↗ Bullish   |   Last spike: 27 min ago (+3.1%)     │
  └──────────────────────────────────────────────────────────────┘

The expanded area contains:
  - Row 1: 7-day range bar (same as Module A tooltip).
  - Row 2: 24h high/low with timestamps, volume, market count, bid-ask spread.
  - Row 3: Sentiment trend indicator + time since last significant spike.
```

The expansion uses a `max-height` transition: `max-height: 52px → 104px` over 200ms, ease-out. The content below the row shifts down smoothly (the container uses CSS transition on gap). Adjacent rows are not affected — only the hovered row expands.

### Hover + Squeeze Interaction

If a squeezed pair (gap < 1%) is hovered, the squeeze visualization intensifies:
- Both rows in the pair get the hover background treatment.
- The divider between them brightens further.
- A small "↕" icon appears between the two rows, indicating the tight gap.

---

## 9. Country Detail Overlay (Click)

### Trigger

Clicking a row opens a full detail overlay panel for that country. The overlay slides in from the right edge of the Module B container (or, on narrow screens, slides up from the bottom as a bottom sheet).

### Overlay Layout

```
┌─────────────────────────────────────────┐
│  ← Back to Rankings                     │  ← Close button
│                                         │
│  ┌───────────────────────────────────┐  │
│  │        🇦🇷  ARGENTINA             │  │
│  │        Rank #1  |  22.1%          │  │
│  │        ▲ 2.3% 24h  |  ↗↗ Bullish │  │
│  └───────────────────────────────────┘  │
│                                         │
│  HISTORICAL TREND (7 days)              │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │   25% ┤                ╭── 22.1%  │  │
│  │       │      ╭────────╯          │  │
│  │   20% ┤  ╭──╯                    │  │
│  │       │ ╯                        │  │
│  │   15% ┤╯                         │  │
│  │       │                          │  │
│  │   10% ┤                          │  │
│  │       ├────┬────┬────┬────┬────┤ │  │
│  │      May   May   May   May   May │  │
│  │      21    22    23    24    27   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  STATISTICS                             │
│  ┌───────────────────────────────────┐  │
│  │  7d High:    23.8%  (May 22)      │  │
│  │  7d Low:     16.4%  (May 15)      │  │
│  │  30d High:   24.1%  (Apr 28)      │  │
│  │  30d Low:    14.2%  (Apr 15)      │  │
│  │  All-Time:   24.1%  (since Apr 1) │  │
│  │  Vol 24h:    $14.2M               │  │
│  │  Vol 7d:     $87.3M               │  │
│  │  Avg Spread: 0.8¢                 │  │
│  │  Markets:    8 active contracts   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  RECENT EVENTS                          │
│  ┌───────────────────────────────────┐  │
│  │  May 27 14:12  ▲ +1.2%  Volume    │  │
│  │                surge ($2.1M)      │  │
│  │  May 27 09:45  ▲ +2.8%  Friendly  │  │
│  │                win vs Brazil      │  │
│  │  May 26 18:30  ▼ -0.5%  Minor     │  │
│  │                injury report      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [View on Polymarket →]                 │
└─────────────────────────────────────────┘
```

### Overlay Animation

```
ENTRY (300ms):
  The overlay panel slides in from the right edge.
  transform: translateX(100%) → translateX(0).
  Easing: cubic-bezier(0.4, 0.0, 0.2, 1.0).

  Simultaneously, the ranking list compresses horizontally
  (it's still visible on the left, at ~40% width, dimmed to 30% opacity).
  This allows the user to see context — which country is at which rank —
  while viewing the detail panel.

EXIT (200ms):
  Overlay slides out: translateX(0) → translateX(100%).
  Ranking list restores to full width and opacity.
  Slightly faster exit than entry.

BACKDROP:
  A semi-transparent overlay (#000000, 40% opacity) covers the ranking list
  during detail view, fading in over 200ms.
```

### Chart in Overlay

The historical trend chart in the overlay is an interactive line chart:
- **X-axis:** Time (7-day default, toggleable to 30d / 90d / All).
- **Y-axis:** Probability percentage.
- **Line:** Country's probability color, 2px width.
- **Area fill:** Subtle gradient below the line.
- **Event markers:** Small dots on the line where significant events occurred (from the recent events list below). Clicking a dot scrolls to that event in the events list.
- **Crosshair:** On hover, a vertical crosshair with a tooltip showing exact probability and timestamp.

---

## 10. Data Update Mechanism & State Reconciliation

### Data Flow

```
Polymarket SSE / REST (3s cycle)
         │
         ▼
  Zustand Store
  ┌─────────────────────────────────────┐
  │  countries: Map<code, CountryData>  │
  │  rankings: CountryData[] (sorted)   │
  │  previousRankings: CountryData[]    │  ← Snapshot from previous cycle
  │  updateTimestamp: number            │
  │  updateId: number (incrementing)    │
  └─────────────────────────────────────┘
         │
         ▼
  React Component (Module B)
  ┌─────────────────────────────────────┐
  │  useMemo: diff rankings vs prev     │
  │    → compute: climbers[], fallers[] │
  │    → compute: squeezePairs[]        │
  │    → compute: vibrationTriggers[]   │
  │                                     │
  │  useEffect: schedule animations     │
  │    → spring-based translateY        │
  │    → odometer digit flips           │
  │    → bar length transitions         │
  │    → vibration waveforms            │
  └─────────────────────────────────────┘
```

### Update Cycle Timing

```
T=0ms:    New data arrives in Zustand store.
T=1ms:    Component re-renders with new rankings.
T=2ms:    Diff computed. climbers, fallers, squeezePairs identified.
T=3ms:    Animation scheduler queues:
            - Bar length transitions (all rows, immediate, 400ms duration).
            - Rank number odometers (changed rows, 40ms stagger, 350ms each).
            - Row position springs (changed rows, 40ms stagger, 500ms each).
            - Vibration waveforms (triggered rows, immediate).
T=4ms:    requestAnimationFrame begins executing animations.
T≈500ms:  All primary animations complete.
T=3000ms: Next data cycle begins.
```

### Concurrency Handling

If a new data update arrives while a previous animation is still running (possible during volatile periods):

1. **Bar length:** The in-progress bar transition is interrupted. The bar immediately begins lerping from its *current animated position* (not the previous target) to the new target. This prevents the bar from "snapping back" to an old value before moving to the new one.

2. **Row position:** The in-progress spring animation is interrupted. A new spring is started with the current position as the initial value and the new rank as the target. The spring's velocity is preserved (not reset to zero), creating a natural "change of direction" feel.

3. **Odometer:** If a digit was mid-flip, it completes its current flip (150ms max), then immediately begins the next flip. The user sees continuous digit motion — which feels appropriately "live."

4. **Vibration:** If a vibration is in progress, the existing waveform continues. A new vibration on the same row within the cooldown period (10s) is suppressed.

### Rank Stability Optimization

To prevent "rank flickering" — where two countries with near-identical probabilities swap ranks on every update cycle — a hysteresis threshold is applied:

```
A country must exceed the country above it by >0.05% probability
before the rank swap is executed visually.

If gap ≤ 0.05%: the ranks remain as-is (no animation triggered),
even though the raw data says the order changed.

This prevents distracting micro-oscillations in the ranking.
The raw probability values still update (bar lengths change),
just the rank numbers stay put until the gap is meaningful.
```

---

## 11. Edge States

### Loading State (Initial Mount)

Before the first data snapshot arrives:

- All 10 row slots render as "skeleton" placeholders.
- Each skeleton row: a grey shimmer bar (140px wide, 6px tall) for the country name, a grey shimmer bar (variable width, 6px tall) for the data bar, and a grey rectangle (48px wide, 18px tall) for the probability.
- The shimmer animation: a gradient sweep from `#1C1C2E` → `#2A2A3A` → `#1C1C2E`, traveling left to right over 1.5s, repeating.
- Rank numbers: 1-10 displayed in `#556677` (dim, static).
- The skeleton rows do not have flags, delta values, or sparklines.

When data arrives:
- Skeleton shimmer fades out over 300ms.
- Real content fades in over 400ms (staggered top-to-bottom, 30ms per row).
- The transition feels like a "system boot" — the leaderboard comes online.

### Empty State

If the data pipeline returns zero countries:
- A centered message: "No ranking data available" in `#8899AA`, 13px Inter.
- Below: "Check data connection or Polymarket API status."
- A subtle pulsing amber dot (6px) to the left of the message.

### Partial Data State

If some countries have data but fewer than the selected Top-N count (e.g., only 7 countries have markets, but "Top 10" is selected):
- The 7 rows with data render normally.
- Rows 8-10 render as empty slots: faint outlines (dashed border, `#1C1C2E`), with "—" in place of probability.
- A footnote in the footer: "Only 7 countries have active markets."

### Stale Data State

If no update has been received for >10 seconds:
- The footer timestamp changes from "14:32:05 EST" to "14:32:05 EST ⚠ Stale" in amber color.
- A subtle amber tint appears on the header bar (left border, 2px, `#FFC107`).
- Data continues to display (last known state is better than blank).

If no update for >30 seconds:
- Footer: "Connection lost. Retrying..."
- Header amber border begins pulsing.
- Rows remain visible but a subtle "frosted glass" overlay (white at 5% opacity) dims the list slightly.

### Overflow / Scrolling

When displaying Top 20 or All (48), the list container scrolls vertically. The header bar and footer bar are sticky (fixed at top and bottom). The scrollable area is only the ranking rows.

The scroll container has a custom scrollbar:
- Width: 4px
- Track: `#0D0D18`
- Thumb: `#2A2A3A`
- Thumb hover: `#3A3A4A`
- No scroll buttons (minimalist).

---

## 12. Technical Notes

### Rendering Strategy

The ranking list uses **DOM rendering via React**, not Canvas. Unlike Module A (which needs WebGL for particle simulation and glow compositing), Module B's rendering is well-suited to the DOM: text rendering is sharper, accessibility is better (screen readers can parse the list), and CSS animations on `transform` and `opacity` are fully GPU-composited.

### Key CSS Techniques

```css
/* Row positioning — GPU-composited, no layout thrash */
.ranking-row {
  position: absolute;
  left: 0;
  right: 0;
  will-change: transform;       /* Hint for GPU layer promotion */
  transform: translateY(var(--row-y));
  transition: none;             /* Handled by framer-motion spring */
}

/* Data bar — GPU-composited width change */
.data-bar-fill {
  will-change: transform;
  transform: scaleX(var(--bar-scale));  /* scaleX instead of width */
  transform-origin: left center;
  /* scaleX triggers compositor only, width triggers layout */
}

/* Odometer digit container */
.odometer-digit {
  overflow: hidden;
  height: 1.2em;
  position: relative;
}
.odometer-digit-old {
  transform: translateY(-100%);
  transition: transform 150ms ease-in;
}
.odometer-digit-new {
  transform: translateY(0);
  transition: transform 150ms ease-out;
}

/* Skeleton shimmer */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #1C1C2E 0%,
    #2A2A3A 40%,
    #1C1C2E 80%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Performance Budget

| Metric | Target |
|--------|--------|
| Rows rendered (DOM nodes) | ≤ 50 (Top 50 mode, each row ~15 DOM nodes = 750 nodes) |
| React re-render time | < 5ms (useMemo for diffs, React.memo on rows) |
| Animation frame budget | < 8ms (leaves 8ms for browser compositing at 60fps) |
| Spring calculations | < 2ms per frame (framer-motion optimized) |
| List scroll FPS | 60fps (CSS transform only, no paint triggers) |

### Virtualization

For the "All (48)" mode, the ranking list should use virtualized rendering (react-window or similar) to only mount DOM nodes for visible rows + 2 overscan rows. This prevents 48 rows × 15 DOM nodes = 720 nodes from all being in the DOM simultaneously.

However, virtualization complicates the fluid animation system (rows outside the viewport cannot animate their departures/arrivals). Solution: when a rank change involves a row that is off-screen, the animation is skipped for that row — it simply appears at its new position when scrolled into view.

### Accessibility

- Each row is a `<button>` element (clickable for detail overlay).
- Rank number, country name, probability, and delta are all in separate `<span>` elements with `aria-label` attributes (e.g., `aria-label="Rank 1: Argentina, 22.1 percent probability, up 2.3 percent in 24 hours"`).
- The ranking list container has `role="list"` and each row has `role="listitem"`.
- Sparklines have `aria-hidden="true"` (decorative) with a text alternative in the row's `aria-label`.
- Vibration animations respect `prefers-reduced-motion: reduce` — they are disabled entirely, replaced with a static amber dot indicator for significant changes.
- Color is never the sole indicator: ▲ and ▼ arrows accompany all green/red color coding.

---

*End of Module B Design Specification*
