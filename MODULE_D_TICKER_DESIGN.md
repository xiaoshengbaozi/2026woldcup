# Module D — Live Ticker Stream: Championship Prediction Market Heat Animation System
## Deep-Dive Visual Design Specification

**Version:** 1.0 | **Date:** 2026-05-27
**Design Lineage:** Nasdaq MarketSite Ticker × Bloomberg TOP function × Times Square Zipper × F1 Telemetry Stream

---

## Table of Contents

1. [Overview](#1-overview)
2. [Ticker Strip Structure](#2-ticker-strip-structure)
3. [Item Anatomy](#3-item-anatomy)
4. [Variable-Speed Scroll Mechanics](#4-variable-speed-scroll-mechanics)
5. [The Sentiment System](#5-the-sentiment-system)
6. [Event-Driven Animation Catalog](#6-event-driven-animation-catalog)
7. [Data-Driven Priority Logic](#7-data-driven-priority-logic)
8. [Insertion & Removal Mechanics](#8-insertion--removal-mechanics)
9. [Interaction Design](#9-interaction-design)
10. [Edge States](#10-edge-states)
11. [Technical Notes](#11-technical-notes)

---

## 1. Overview

### Module Role

Module D is the **market heartbeat** — an always-on, always-moving data stream that occupies the top 36px of the screen, spanning the full viewport width. It is the first thing a user sees and the last thing they stop watching. While Modules A, B, and C reward focused attention, Module D rewards peripheral vision: it is designed to be monitored, not read.

The ticker operates on a simple premise: *something is always happening somewhere in the market.* Even when the map is static and the rankings are frozen, the ticker scrolls. It reassures the user that the system is alive.

### Design Principles

1. **Motion is the default state.** The ticker is never still. Even with no new data, it scrolls. Stasis = death for a ticker. The scroll itself is a heartbeat; variations in its rhythm are the pulse.

2. **Numbers dominate.** In a ticker, a country name is context; a probability is content. The numerical values must be the largest, brightest, most legible element in each item. The user should be able to scan the stream and read only the numbers, ignoring the labels, and still understand the market.

3. **Disruption is information.** A ticker at uniform speed is background noise. A ticker that suddenly accelerates, flashes, or jolts is a signal. The system weaponizes differential motion: when nothing is happening, the scroll is hypnotically steady; when something happens, the rhythm breaks and attention is seized.

4. **Color is direction.** Green, red, gold — that's it. No probability spectrum here (that's Module A's job). The ticker's color palette has exactly three semantic states: up, down, and explosive. Every pixel of color on the ticker answers the question: *which way is the money flowing?*

---

## 2. Ticker Strip Structure

### Full Strip Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ LIVE  │🇧🇷BRA 18.3 ▼0.8│🇦🇷ARG 22.1 ▲2.3│🇫🇷FRA 12.4 ▼1.1│🇺🇸USA 9.8 ▲5.2🔥│🇪🇸ESP 11.2 ▲0.4│  │
│ 14:32  │════════════════│═══════════════│═══════════════│══════════════════│═══════════════│  │
│        │  $9.1M vol     │  $14.2M vol   │  $7.8M vol    │  $11.3M vol ⚡  │  $6.2M vol    │  │
│        │────────────────│───────────────│───────────────│─────────────────│───────────────│  │
│        │ scroll→       │ scroll→       │ scroll→      │ scroll→ SURGE   │ scroll→      │  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
 │        │                                                                    │               │
 │  Fixed │                   Scrolling Item Stream                           │  Fixed        │
 │  Left  │                   (seamless loop, variable speed)                 │  Right        │
 │  Dock  │                                                                   │  Dock         │
```

### Spatial Zones

```
┌────────────┬──────────────────────────────────────────────────┬────────────┐
│ LEFT DOCK  │              SCROLLING STREAM                    │ RIGHT DOCK │
│ 80px fixed │              flex: 1, overflow: hidden           │ 120px fixed│
│            │                                                  │            │
│ ◆ LIVE     │  [Item][Item][Item][Item][Item][Item][Item]...   │  ⏸ PAUSE  │
│ timestamp  │  [Item][Item][Item][Item][Item][Item][Item]...   │  ⚙ FILTER │
│ status dot │     (duplicate set for seamless loop)            │            │
└────────────┴──────────────────────────────────────────────────┴────────────┘
```

| Zone | Width | Content |
|------|-------|---------|
| **Left Dock** | 80px | Live indicator dot + current timestamp. Fixed in place — does not scroll. |
| **Scrolling Stream** | Flexible, fills remaining space | The ticker items in horizontal flow. Two identical copies of the item array placed side-by-side for seamless looping. |
| **Right Dock** | 120px | Pause button + filter dropdown. Fixed in place. |

### Height and Positioning

```
Total strip height:  36px
Background:          #08080F (slightly darker than the main bg #0A0A0F —
                     this subtle differentiation grounds the ticker as a
                     distinct "chrome" layer above the content modules).

Top border:          None (the ticker bleeds to the viewport edge).
Bottom border:       1px solid #1C1C2E (separates ticker from modules below).

Z-index:             100 (always on top of all other modules).
```

### The Seamless Loop

The scrolling stream contains two identical copies of the item array placed consecutively:

```
[Item₀ Item₁ Item₂ ... Itemₙ] [Item₀ Item₁ Item₂ ... Itemₙ]
 ├──────── Copy A ────────┤   ├──────── Copy B ────────┤
```

The entire row (`Copy A + Copy B`) is wrapped in a container that translates horizontally via `transform: translateX()`. When the translation reaches `-width(Copy A)`, it resets to `0` — but because Copy A and Copy B are identical, the visual transition is imperceptible. The user sees an infinite, unbroken stream.

```
Frame N:     [Item₀ Item₁ Item₂ ... Itemₙ] [Item₀ Item₁ Item₂ ... Itemₙ]
             ↑ container at translateX(0)

Frame N+K:   │   [Item₀ Item₁ Item₂ ... Itemₙ] [Item₀ Item₁ Item₂ ... Itemₙ]
             │   ↑ container at translateX(-width/2 + ε)

Frame N+M:   │        [Item₀ Item₁ Item₂ ... Itemₙ] [Item₀ Item₁ Item₂ ... Itemₙ]
             │        ↑ container at translateX(-ε) — about to reset

Frame N+M+1: [Item₀ Item₁ Item₂ ... Itemₙ] [Item₀ Item₁ Item₂ ... Itemₙ]
             ↑ container reset to translateX(0) — visually identical
```

The reset is executed in a single frame (no animation, instantaneous `translateX` jump) when `translateX <= -width(Copy A)`. Because the content at the reset point is identical, there is zero visual disruption.

---

## 3. Item Anatomy

### Full Item Structure

Each ticker item is a self-contained data block, 180px wide (baseline), composed of stacked horizontal layers:

```
┌──────────────────────────────────────┐
│  🇧🇷  BRA        18.3   ▼ 0.8        │  ← Row 1: Flag + Code + Prob + Delta
│  ═══════════════════════════════════ │  ← Row 2: Direction color bar
│  Vol $9.1M  ████████░░░░  74% rank  │  ← Row 3: Volume + mini bar
└──────────────────────────────────────┘
 │                                          │
 └─ 180px (baseline width) ────────────────┘
    Width expands to 220px during surge.
```

### Row 1 — Identity + Core Data (18px tall)

```
┌──────┬──────┬──────────┬──────────┐
│ Flag │ Code │  Prob    │  Delta   │
│ 18px │ 32px │  52px    │  78px    │
└──────┴──────┴──────────┴──────────┘
```

**Flag emoji:** 14px, vertically centered. Rendered via Twemoji CDN for cross-platform consistency. The flag is the only non-text element — it provides instant country recognition before the eye reaches the code.

**Country code:** 3-letter ISO code (BRA, ARG, FRA). Typography: "JetBrains Mono" Bold, 11px, color `#8899AA`. Letter-spacing: 0.05em for legibility at small size. The code is muted — it's reference information, not the headline.

**Probability:** The hero number. Typography: "JetBrains Mono" Bold, 13px, color `#FFFFFF`. Tabular lining (fixed-width digits) ensures numbers align across items. This is the largest text element because it's the most important datum. The "%" sign is omitted — in a ticker context, all numbers are percentages, and the sign adds visual noise without information.

**Delta:** Arrow (▲ or ▼) + signed percentage. Typography: "JetBrains Mono" Medium, 11px. The arrow is 1px smaller than the number to create hierarchy. Color: `#00E676` (up) or `#FF1744` (down) or `#556677` (flat, shown as "—"). The delta is right-aligned within its column so that all items' deltas form a vertical alignment when viewed as a stream.

### Row 2 — Direction Color Bar (3px tall)

```
┌──────────────────────────────────────┐
│ ═══════════════════════════════════  │
└──────────────────────────────────────┘
```

A full-width horizontal bar, 3px tall. Its color encodes the country's recent direction:

```
Rising (▲):        #00E676 (electric green), solid
Falling (▼):       #FF1744 (red), solid
Flat (—):          #1C1C2E (barely visible), 30% opacity
Surging (▲▲):      #00E676 → #FFFFFF gradient, left to right, with subtle animation
Plunging (▼▼):     #FF1744 → #FF0000 gradient, left to right, with subtle animation
Breakout (🔥):     #FFD700 (gold), pulsing opacity 0.6→1.0 at 5Hz for 1.5s
```

The bar's brightness also encodes the *magnitude* of change:
- Change < 0.5%: bar at 60% opacity (subdued — a whisper of direction).
- Change 0.5–2%: bar at 85% opacity (clear signal).
- Change > 2%: bar at 100% opacity + subtle glow (box-shadow in the bar color, 6px blur).

### Row 3 — Volume + Activity (10px tall)

```
┌──────────────────────────────────────┐
│  Vol $9.1M  ████████░░░░  74% rank  │
└──────────────────────────────────────┘
```

**Volume label:** "Vol" in "JetBrains Mono" Regular, 8px, color `#556677`, followed by the abbreviated dollar amount in 9px, color `#8899AA`. The volume number updates with a subtle "blink" when it changes (a 100ms spike in brightness).

**Volume mini-bar:** A 40px-wide, 3px-tall horizontal bar. The filled portion represents the country's 24h volume as a percentage of the highest-volume country's volume:

```
fill_width = (country_volume / max_all_volume) × 40px
```

Bar color: `#2A2A3A` for the track, `#3A4A5A` for the fill. This is deliberately muted — it's an ambient indicator, not a headline. The bar provides a quick visual sense of relative market activity without reading numbers.

**Volume surge indicator:** When volume spikes (>3× the country's 24h average), the volume bar turns amber (`#FFC107`) and pulses for 5 seconds. A small lightning bolt emoji (⚡) appears adjacent to the volume label during the surge.

### Item Separator

A 1px vertical line separates adjacent items. Color: `#1C1C2E`. The separator is subtle — just enough to define item boundaries without creating a "prison bars" effect.

### Item Width Variability

The baseline width of 180px applies during normal (steady-state) scrolling. During animation events, the width can expand:

| State | Width | Transition |
|-------|-------|------------|
| **Normal** | 180px | — |
| **Surge** | 220px | 150ms expand (elastic ease-out) |
| **Flash** | 200px | 80ms expand + 300ms contract (overshoot) |
| **Inserting** | 0px → 180px | 400ms expand (ease-out, from right edge) |
| **Removing** | 180px → 0px | 300ms collapse (ease-in, to right edge) |

Width transitions use CSS `width` with `will-change: width` pre-set during animation. A `max-width` container clips the content during the transition so text does not wrap or overflow.

---

## 4. Variable-Speed Scroll Mechanics

### The Speed Model

The ticker does not scroll at a uniform rate. Instead, it operates on a **layered speed system** where different items move at different speeds through the stream, creating a dynamic, breathing rhythm. This is the core innovation of this ticker design.

### Base Speed (The Foundation)

```
Base scroll speed:  50px/s (approximately 3.6 items per second at 180px/item).

This is the "resting" speed — the ticker's idle rhythm. At this speed,
the full item set (say, 20 countries) completes one loop in approximately:

  loop_time = (20 items × 180px) / 50px/s = 72 seconds

Each country's ticker item passes a fixed point on screen once every ~72 seconds
during calm market conditions.
```

50px/s is calibrated to be fast enough to convey "liveness" but slow enough that individual items are legible in peripheral vision. It maps to roughly 3-4 characters per second in reading speed — the eye can register numbers without fixating.

### Item-Level Speed Multiplier

Each item has a **speed multiplier** (`Mᵢ`) that modifies its velocity relative to the base speed. The item's effective scroll speed is:

```
vᵢ = baseSpeed × Mᵢ

Mᵢ is a composite of three factors:

  Mᵢ = 1.0 + volume_factor + change_factor + rank_factor

Where each factor is clamped to [0, 1.0] and then summed.
```

**Volume Factor:**

```
volume_factor = clamp(volume_percentile / 100, 0, 1.0) × 0.8

Where volume_percentile is the country's 24h volume rank among all countries
(0 = lowest volume, 100 = highest volume).

A country at the 100th percentile (highest volume) gets M += 0.8.
A country at the 50th percentile gets M += 0.4.
A country at the 10th percentile gets M += 0.08.

Range: Mᵢ from 1.0 to 1.8 based on volume alone.
```

**Change Factor:**

```
change_factor = clamp(abs(Δprob_5min) / 5.0%, 0, 1.0) × 1.5

Where Δprob_5min is the signed probability change in the last 5 minutes.

A country with 5% change in 5 minutes gets M += 1.5 (max).
A country with 2% change gets M += 0.6.
A country with 0.2% change gets M += 0.06.

Range: Mᵢ from 1.0 to 1.5 based on change magnitude alone.
This factor decays exponentially over 60 seconds after the change event.
```

**Rank Factor:**

```
rank_factor = (1.0 - (rank - 1) / total_countries) × 0.3

Rank 1 (highest probability): M += 0.3.
Rank 10: M += 0.17.
Rank 20: M += 0.015.
Last rank: M += 0.0.

This gives top contenders a consistent but modest speed advantage,
ensuring they appear in the visible stream more frequently.
```

**Combined effective speed range:**

```
Mᵢ_min = 1.0 (lowest volume, no change, last rank)
Mᵢ_max = 1.0 + 0.8 + 1.5 + 0.3 = 3.6

v_min = 50px/s
v_max = 180px/s

An item at max speed crosses the screen approximately 3.6× faster than
an item at base speed. This is a dramatic differential — the fastest
items visibly "overtake" slower items in the stream.
```

### The Overtake Mechanic

Because items move at different speeds, faster items will eventually catch up to and pass slower items ahead of them in the stream. This is handled by:

```
When item A (faster) approaches item B (slower) from behind:

Distance < 120px:  Item A begins a subtle "lane change" — it shifts
                   upward by 2px and its opacity increases to 1.05× normal,
                   creating the impression it's "pulling out to pass."

Distance < 60px:   Item B shifts slightly downward (1px), yielding space.

Distance < 30px:   Item A slides past Item B. During the 300ms overtake window:
                   - Item A gets a subtle highlight (white glow, 15% opacity).
                   - Item B gets a subtle shadow (dimmed to 85% opacity).

Distance > 30px (passed): Both items return to their normal positions.
                          Item A is now ahead of Item B in the stream.
```

The overtake animation is rendered in real-time by the ticker's animation loop. It is not a pre-computed timeline — overtakes happen organically as speed multipliers change. The effect is subtle enough not to distract but noticeable enough that the user registers "something faster just passed something slower."

### Global Speed Modulation

In addition to per-item speed variation, the entire ticker's base speed can be modulated by global market conditions:

```
Global volatility (average of all countries' |Δprob_5min|):

  vol < 0.2%:   baseSpeed = 40px/s  (quiet market — slow, calm scroll)
  vol 0.2-0.5%: baseSpeed = 50px/s  (normal)
  vol 0.5-1.0%: baseSpeed = 65px/s  (active market — brisk scroll)
  vol > 1.0%:   baseSpeed = 80px/s  (volatile market — urgent scroll)

The transition between global speeds is smoothed over 5 seconds
to avoid abrupt speed changes.
```

When global volatility spikes (e.g., during a major tournament match), the entire ticker accelerates. When the market is quiet (e.g., overnight), it slows to a gentle drift. The ticker's rhythm is thus a direct expression of market activity — no numbers needed to know if things are busy.

### Speed Visualization

The current global speed is subtly indicated in the Left Dock:

```
Base speed 50px/s:  ◆ LIVE  14:32:05    (normal — white status dot)
Base speed 65px/s:  ◆◆ LIVE 14:32:05    (active — two dots, slightly brighter)
Base speed 80px/s:  ◆◆◆ LIVE 14:32:05  (volatile — three dots, amber tint)
Base speed 40px/s:  ◆ LIVE  14:32:05    (quiet — single dot, slightly dimmer)
```

---

## 5. The Sentiment System

### Color Semantics

The ticker uses a strict **three-color + gold** palette for sentiment. This is deliberately simpler than any other module's color system:

```
GREEN  (#00E676):  Probability is rising. Money is flowing IN.
                    Cold, electric, precise. The color of growth.

RED    (#FF1744):  Probability is falling. Money is flowing OUT.
                    Warm, urgent, warning. The color of retreat.

GREY   (#556677):  Probability is flat. No conviction in either direction.
                    Neutral, quiet, background. The color of waiting.

GOLD   (#FFD700):  Breakout event. Significant threshold crossed.
                    Rare, celebratory, attention-commanding. The color of NEWS.
```

### Sentiment Application Map

Sentiment color is applied to four elements within each item:

| Element | Normal (▲) | Normal (▼) | Flat (—) | Breakout (🔥) |
|---------|-----------|-----------|---------|--------------|
| Delta arrow + number | `#00E676` | `#FF1744` | `#556677` | `#FFD700` |
| Direction bar (Row 2) | `#00E676` | `#FF1744` | `#1C1C2E` | `#FFD700` pulsing |
| Probability number | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFD700` (3s) |
| Item left-edge highlight | None | None | None | `#FFD700` 2px glow |

### Breakout Gold Flash

A "breakout" is a special sentiment event that triggers when:

```
Condition A: |Δprob_5min| > 3%   (massive swing in 5 minutes)
Condition B: Probability crosses a threshold (10%, 25%, 50%, 75%)
Condition C: Volume exceeds 5× the country's 24h average

Any one condition triggers a Level-1 breakout (1.5s gold flash).
Any two conditions trigger a Level-2 breakout (3.0s gold flash + particle burst).
All three conditions trigger a Level-3 breakout (5.0s gold flash + particles + item jitter).
```

The gold flash animation:

```
0ms–80ms:
  Item background fills with #FFD700 at 25% opacity (rapid attack).
  Direction bar turns solid gold.
  Delta arrow/text turns gold.

80ms–800ms:
  Gold background fades from 25% → 5% opacity.
  Direction bar continues slow pulse (0.6→1.0→0.6, 3Hz).

800ms–1500ms (Level 1) / 3000ms (Level 2) / 5000ms (Level 3):
  All gold effects decay to zero.
  Item returns to normal sentiment coloring.

Level 2 addition: 6–10 gold particles (2px dots) burst outward
  from the item center during the attack phase, traveling 20-40px
  in random directions before fading over 1 second.

Level 3 addition: Item jitter — horizontal oscillation ±2px at 12Hz
  for 400ms, superimposed on the gold flash. This is the maximum
  "PAY ATTENTION" signal the ticker can generate.
```

### Sentiment Persistence

Sentiment decays over time. After a change event, the direction bar's color intensity gradually returns to baseline:

```
decay(t) = e^(-t / 120s)

Where t is seconds since the last significant change (>0.5%).

After 60s:  color at 61% intensity (still noticeably colored).
After 120s: color at 37% intensity (fading).
After 300s: color at 8% intensity (nearly back to neutral).

This means a country that was rising rapidly 2 minutes ago still
appears slightly green — it has "momentum color" — even if it's
currently flat. The ticker has memory.
```

---

## 6. Event-Driven Animation Catalog

### Animation Trigger System

All ticker animations are triggered by events detected in the data pipeline. The animation scheduler runs at 60fps via `requestAnimationFrame` and manages concurrent, overlapping animations with a priority queue.

```
EVENT DETECTED → Animation Scheduler
                       │
                       ├─ Priority assigned (1-5)
                       ├─ Queue checked for conflicts
                       ├─ Existing animations on same item interrupted if new priority > old
                       └─ Animation dispatched to item
```

### Animation Priority Levels

| Priority | Event | Behavior on Conflict |
|----------|-------|---------------------|
| 5 (Critical) | Level-3 Breakout | Interrupts ALL other animations on this item |
| 4 (High) | Level-2 Breakout, New hot entry insertion | Interrupts priority 3 and below |
| 3 (Medium) | Level-1 Breakout, >3% price shock | Interrupts priority 2 and below |
| 2 (Low) | Overtake, Volume surge | Interrupts priority 1 only |
| 1 (Ambient) | Sentiment decay, Glow breathing | Never interrupts; queues behind current |

### Animation A: Price Shock Flash

```
Trigger:    |Δprob| > 2% in one update cycle (~3 seconds).
Priority:   3
Duration:   800ms

Sequence:
  0–100ms:   Item background flashes white at 30% opacity.
             Direction bar color saturates to 100%.
             Probability number scales up 5% (transform: scale(1.05)).
  100–400ms: White flash fades out. Number settles back to scale(1.0)
             with a subtle bounce (overshoot + settle).
             Direction bar glows (box-shadow in bar color, 8px blur).
  400–800ms: Glow decays. Direction bar opacity decays to sentiment baseline.
             Item returns to normal rendering.
```

### Animation B: Volume Surge Pulse

```
Trigger:    5-minute volume exceeds 3× the country's 24h rolling average.
Priority:   2
Duration:   5000ms (prolonged — volume events have staying power)

Sequence:
  0–200ms:   Volume bar turns amber (#FFC107).
             Volume number scales up 10% and brightens.
             ⚡ emoji badge appears adjacent to volume label.
  200–5000ms: Amber color slowly pulses (opacity 0.7→1.0→0.7, 3s cycle).
              ⚡ badge remains visible, gently bobbing (translateY oscillation ±1px,
              1.5s period, sine wave).
  5000ms:     Amber fades to normal grey over 2 seconds. ⚡ badge dissolves.
```

### Animation C: New Hot Entry (Insertion)

```
Trigger:    A country not previously in the visible ticker stream enters
            it because its probability rose into the top-N or a new market
            was just created with significant volume.
Priority:   4
Duration:   800ms

Sequence (staged):

  Phase 1 — PRE-INSERTION (100ms before item appears):
    A subtle "ripple" travels backward through the existing stream —
    items near the insertion point shift slightly rightward (10px)
    to make space. This is a pressure wave that telegraphs "something
    is arriving."

  Phase 2 — INSERTION (0–400ms):
    The new item slides in from the right edge of the ticker strip.
    It enters at 2× base speed, decelerating rapidly.
    Its width animates from 0px → 180px (ease-out, slight overshoot).
    During entry, a bright green/red/gold glow (matching sentiment)
    surrounds the item — a "spawn halo."

  Phase 3 — SETTLE (400–800ms):
    The new item decelerates to its normal speed.
    The spawn halo fades out.
    The item's direction bar "ignites" — drawing from left to right
    over 300ms (a write-on effect for the direction bar).
    Neighboring items that were displaced settle back to their positions.
```

### Animation D: Overtake (Pass)

```
Trigger:    A faster item catches up to a slower item from behind.
Priority:   2
Duration:   600ms (the duration of the overtake maneuver)

Sequence:
  0–200ms (Approach):
    Faster item: shifts upward 2px, opacity increases to 1.05.
    Slower item: shifts downward 1px, opacity decreases to 0.90.
    The gap between them visually tightens.

  200–400ms (Pass):
    Faster item slides past slower item.
    A subtle "wake" effect: 3–5 tiny white particles trail behind
    the faster item as it passes, fading over 500ms.
    Slower item is briefly overlapped (items are z-indexed so the
    faster item renders on top during the pass).

  400–600ms (Settle):
    Both items return to their normal vertical positions.
    Opacity normalizes.
    Wake particles dissolve.
```

### Animation E: Sentiment Decay Breathing

```
Trigger:    Continuous. Applies to all items with recent changes.
Priority:   1 (lowest — always running, always interruptible)
Duration:   Perpetual

Behavior:
  The direction bar's opacity is modulated by the sentiment decay function.
  As the decay value drops, the bar slowly desaturates and dims.
  This happens smoothly over the decay window (120-second half-life)
  and is updated every frame via rAF.

  The effect is most noticeable when watching a country that had a big
  move several minutes ago — its bar is still slightly green, but fading.
  It creates a sense of "cooling off" after excitement.
```

### Animation F: Probability Odometer Tick

```
Trigger:    A country's probability changes by any amount (>0.01%).
Priority:   1
Duration:   200ms per digit

Behavior:
  The probability digits use a mini-odometer effect. Each digit that
  changes "rolls" independently:

  For a change from 18.3 to 18.7:
    The '3' digit rolls upward and fades out (100ms).
    The '7' digit rolls in from below and fades in (100ms, delayed 50ms).
    Total: 150ms.

  For a change from 9.9 to 10.2 (three digits change):
    The '9' in tenths rolls → '2' (100ms).
    The '9' in ones rolls → '0' (100ms, staggered 60ms).
    The new '1' in tens slides in from left (150ms, staggered 100ms).
    Total: 250ms.

  The odometer animation is only applied to the specific digits that
  change — unchanged digits remain static. This is more efficient and
  visually cleaner than re-rendering the entire number.
```

### Animation G: Global Volatility Shift

```
Trigger:    The global volatility metric crosses a threshold (Section 4).
Priority:   0 (system-level — modifies all items)
Duration:   5000ms (gradual speed transition)

Behavior:
  The base scroll speed lerps from oldSpeed to newSpeed over 5 seconds.
  Easing: ease-in-out.

  During the transition:
    - Items don't jump — their positions are continuously recalculated.
    - The speed change is gradual enough that the user may not consciously
      notice it, but the overall feel of the ticker shifts (calmer or more urgent).

  The left dock updates its speed indicator dots during the transition.
```

---

## 7. Data-Driven Priority Logic

### Item Ordering

Items in the ticker stream are ordered by a composite **priority score**, not by simple rank or probability. The score determines both the order in the stream AND the base speed multiplier:

```
Priority Score (S) = w₁·P_norm + w₂·V_norm + w₃·C_norm + w₄·R_norm + w₅·T_norm

Where:
  P_norm = normalized probability (prob / max_prob, 0–1)
  V_norm = normalized volume (vol / max_vol, 0–1)
  C_norm = normalized recent change (|Δ_5min| / 5%, clamped 0–1)
  R_norm = rivalry bonus (1.0 for rivalry pairs, 0.5 for same-confederation, 0 otherwise)
  T_norm = time since last significant event (exponential decay from 1.0 at t=0 to 0.1 at t=30min)

Weights:
  w₁ = 0.30  (probability — most important)
  w₂ = 0.25  (volume — market conviction)
  w₃ = 0.25  (recent change — newsworthiness)
  w₄ = 0.10  (rivalry — narrative interest)
  w₅ = 0.10  (recency — fresh events over stale ones)
```

Items are sorted by descending priority score. The top-N items (where N is the visible item count, typically 12-20) are included in the ticker stream. Items below the cutoff are not rendered (they "fall off" the ticker).

### Priority Recalculation

Priority scores are recalculated on every data update cycle (~3 seconds). When scores change, items may be reordered in the stream. Reordering is animated:

```
Item moving UP in priority (toward front of stream):
  The item accelerates briefly (2× its normal speed for 2 seconds)
  to catch up to its new position. It does not teleport.

Item moving DOWN in priority (toward back of stream):
  The item decelerates (0.5× its normal speed for 3 seconds),
  allowing faster items behind it to pass. It does not reverse direction.

Item entering the visible set:
  Insertion animation (Animation C, Section 6).

Item leaving the visible set:
  The item decelerates to 0.3× speed, fades to 20% opacity over 2 seconds,
  and glides off the left edge of the screen. Once fully off-screen, it is
  removed from the DOM.
```

### Priority Hysteresis

To prevent items from oscillating in and out of the visible set (entering and leaving on alternating updates), a hysteresis threshold is applied:

```
An item must drop below (cutoff - 5%) to be removed from the visible set,
and must rise above (cutoff + 5%) to be added.

Example with cutoff at N=15:
  Item at position 16 (just below cutoff) with score 0.42:
    Needs score > 0.44 to enter (cutoff + 5%).
  Item at position 15 (just above cutoff) with score 0.45:
    Needs score < 0.43 to leave (cutoff - 5%).
```

---

## 8. Insertion & Removal Mechanics

### Insertion Pipeline

When a country enters the visible ticker stream:

```
Step 1 — DETECT (data update cycle):
  Country's priority score crosses the entry threshold.

Step 2 — PREPARE (50ms):
  A new DOM node is created for the item (hidden, opacity: 0, width: 0).
  It is inserted at the correct position in the stream based on priority.

Step 3 — PRE-INSERTION RIPPLE (100ms):
  Items at and after the insertion point shift rightward by 10px
  (animation: 100ms, ease-out). This is the "pressure wave"
  that makes space.

Step 4 — INSERT (400ms):
  New item animates in:
    width: 0px → 180px (ease-out with overshoot to 185px, settle at 180px)
    opacity: 0 → 1.0 (first 200ms)
    spawn halo: fades in at 100ms, fades out by 400ms
    direction bar: writes on from left to right (300ms)

Step 5 — SETTLE (200ms):
  Displaced items return to their normal positions (rightward shift
  absorbed as the new item takes its place).
  Insertion complete.
```

### Removal Pipeline

When a country leaves the visible ticker stream:

```
Step 1 — DETECT (data update cycle):
  Country's priority score falls below the exit threshold.

Step 2 — FADE (1500ms):
  Item opacity: 1.0 → 0.2 (ease-in, slow at first, accelerating).
  Item width: 180px → 120px (the item "shrinks" as it fades).
  Item speed: normal → 0.3× (decelerates).

Step 3 — EXIT (1000ms):
  Item continues scrolling leftward at reduced speed and opacity.
  When its right edge passes the left edge of the ticker strip
  (fully off-screen), it is removed from the DOM.

  If the item is still partially visible after 3 seconds of fading,
  it is force-removed (edge case for very wide ticker strips).

Step 4 — GAP CLOSE (300ms):
  After the item is removed, the gap it left closes as neighboring
  items adjust their positions. Items to the right slide leftward
  by the removed item's width (300ms, ease-out).
```

### The "Ghost" State

When an item is fading out (Step 2 of removal), it enters a "ghost" state. Visually:

```
Normal item:         [🇧🇷 BRA 18.3 ▼0.8 ████████]
Ghost item (early):  [🇧🇷 BRA 18.3 ▼0.8 ████████]  opacity: 0.6
Ghost item (mid):    [🇧🇷 BRA 18.3 ...              opacity: 0.3, width: 140px
Ghost item (late):   [                            ]  opacity: 0.1, width: 100px
```

The ghost item's content truncates as the width shrinks — first the volume bar disappears, then the delta, then the probability, leaving only a faint flag and code before vanishing entirely. This graduated disappearance is more elegant than a uniform fade.

---

## 9. Interaction Design

### Hover Behavior

When the cursor enters the ticker strip:

```
0–100ms:
  - The entire ticker pauses (animation-play-state: paused on the
    scroll container). The stream freezes in place.
  - A subtle overlay appears: the strip background lightens from
    #08080F to #0C0C18, signaling "interaction mode."

Hover on an individual item:
  - The item scales to 105% (transform: scale(1.05)), centered on
    its own transform-origin. This makes it "pop forward" from the stream.
  - The item's background brightens to #141428.
  - A full tooltip appears below the ticker strip (not covering it):

    ┌──────────────────────────────────────────┐
    │  🇧🇷  BRAZIL                   Rank #2   │
    │                                          │
    │  Current:  18.3%                         │
    │  24h Δ:    ▼ 0.8%                        │
    │  7d Δ:     ▲ 2.1%                        │
    │                                          │
    │  Volume 24h:  $9.1M                      │
    │  Volume rank:  #4 of 48                  │
    │  Markets:      5 active                  │
    │  Trend:        ↘ Declining               │
    │                                          │
    │  [Click to focus across all modules]     │
    └──────────────────────────────────────────┘

  - The tooltip appears 4px below the ticker strip, with a subtle
    upward-pointing caret (▲) aligned to the hovered item's center.
```

### Click Behavior

Clicking a ticker item selects that country and propagates the selection to all modules:

```
Module A: Spotlight the country on the map, dim others.
Module B: Scroll to the country in the ranking list, highlight its row.
Module C: Focus the country's line in the timeline, dim other lines.

The ticker itself:
  - The selected item gets a persistent highlight: a 1px gold border
    and a subtle glow (box-shadow) that remains until deselection.
  - The item continues scrolling (does not pause — the ticker is always live)
    but the highlight scrolls with it.
```

### Right Dock Controls

```
┌────────────┐
│  ⏸ PAUSE   │  Toggle: pauses/resumes the ticker scroll.
│            │  When paused, all items freeze. The pause button
│            │  changes to ▶ PLAY. A subtle amber border pulses
│            │  on the strip to remind the user it's paused.
│            │  After 60 seconds of pause, auto-resumes.
│            │
│  ⚙ FILTER  │  Dropdown menu:
│            │  ├ All Countries (default)
│            │  ├ Top 10 Only
│            │  ├ Top 5 Only
│            │  ├ Moving Only (>0.5% change in 5min)
│            │  ├ High Volume Only (>$5M 24h)
│            │  └ My Watchlist (user-curated)
│            │
│            │  Filtering applies instantly with a 300ms crossfade
│            │  as items enter/leave the stream.
```

### Keyboard Shortcuts (When Ticker is Focused)

| Key | Action |
|-----|--------|
| `Space` | Pause/resume scroll |
| `←` / `→` | Nudge scroll left/right by one item width |
| `F` | Open filter dropdown |
| `1`-`9` | Select country #1-#9 in the visible stream |
| `0` | Deselect |
| `/` | Search: type a country name to find and select it |

---

## 10. Edge States

### Loading State (Initial)

```
Before the first data snapshot arrives:

  - The ticker strip renders at full width with the dark background.
  - No items are visible.
  - A subtle scanning animation plays: a 3px-tall, 200px-wide highlight
    bar sweeps from left to right across the strip over 2 seconds,
    repeating (similar to Module C's loading state).
    Color: #1C1C2E at 40% opacity.
  - The Left Dock shows: "◆ INIT  --:--:--" with a pulsing white dot.
  - The Right Dock controls are visible but dimmed (opacity: 0.4,
    non-interactive).

When first data arrives:
  - The scanning bar fades out over 300ms.
  - Items fade in, staggered left to right, 40ms per item.
  - Items begin scrolling immediately (no "intro" pause — the ticker
    launches at full speed).
  - Left Dock timestamp populates.
  - Right Dock controls activate.
  - Total time to first meaningful display: ~1.5 seconds.
```

### Empty State (No Data)

```
If the data pipeline returns zero countries:

  - A single "item" scrolls across the strip:
    [No active markets — Waiting for data...]
    in #556677, scrolling at 30px/s (slow, calm).
  - Left Dock: "◇ OFFLINE" in amber.
  - Right Dock: Pause disabled, Filter disabled.

  This empty message scrolls on loop. The fact that something is
  still moving reassures the user the system hasn't crashed —
  it's just waiting.
```

### Stale Data State

```
If no update received for >10 seconds:

  - All items continue scrolling at their current speeds.
  - A subtle "frosted" overlay (white at 3% opacity) dims the strip
    slightly, indicating the data is not fresh.
  - Left Dock timestamp changes color: #8899AA → #FFC107 (amber).
  - A small "⚠" appears next to the timestamp.

If no update for >30 seconds:
  - Overlay deepens to 6% opacity.
  - Items reduce speed by 30% (the ticker "slows its breathing").
  - Left Dock: "◇ STALE 14:32:05 ⚠" in amber, pulsing.
  - The strip's bottom border turns amber (1px solid #FFC107).

When connection restores:
  - Overlay fades out (500ms).
  - Items return to full speed.
  - A brief "catch-up" surge: items accelerate to 1.5× normal speed
    for 3 seconds to quickly cycle through any accumulated changes.
  - Status returns to green.
```

### Disconnected State

```
If the WebSocket/SSE connection drops entirely:

  - Items freeze in place (pause scroll) for 2 seconds.
  - A banner slides down from the top of the ticker strip (not blocking items):
    "Connection lost. Retrying..." with a pulsing red left-border.
  - After 2 seconds, items resume scrolling at 50% speed with
    the stale data overlay.
  - Automatic retry every 5 seconds.

  On reconnect:
    - Banner slides up (300ms).
    - Items "snap" update: all values transition to current data
      simultaneously (300ms crossfade from stale to fresh values).
    - Catch-up surge (2× speed for 5 seconds).
    - Status returns to green.
```

---

## 11. Technical Notes

### Rendering Strategy

The ticker uses **DOM rendering** for several reasons:

1. **Text clarity:** The ticker is entirely text + simple shapes. DOM text rendering is sharper than Canvas at small sizes (subpixel anti-aliasing).
2. **CSS animations:** `transform: translateX()` for the scroll, `opacity` for fades, and `scale` for item pop effects are all GPU-composited CSS properties — no JavaScript needed per frame for the steady-state scroll.
3. **Accessibility:** DOM elements are inherently accessible to screen readers (each item is a `<button>` with `aria-label`).
4. **Simplicity:** The ticker's visual complexity is in its motion design, not its rendering. DOM handles the rendering so the animation logic can focus on timing and coordination.

### Scroll Implementation

```css
/* The scroll container */
.ticker-stream {
  display: flex;
  will-change: transform;
  /* translateX is set via JavaScript on each rAF frame */
}

/* Individual items */
.ticker-item {
  flex-shrink: 0;
  width: 180px;
  height: 36px;
  will-change: width, opacity, transform;  /* Only during animations */
  transition: none;  /* All animations are JS-driven for precise timing */
}

/* Direction bar */
.ticker-item-bar {
  height: 3px;
  width: 100%;
  will-change: opacity, background-color;
  transition: background-color 400ms ease-out;
}
```

### Animation Loop

The ticker's animation loop runs on `requestAnimationFrame`:

```javascript
function tickerLoop(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // 1. Update global base speed (smoothed over 5s)
  globalSpeed = lerp(globalSpeed, targetGlobalSpeed, deltaTime / 5000);

  // 2. For each item, update position based on its speed multiplier
  for (const item of items) {
    item.speed = globalSpeed * item.speedMultiplier;
    item.position += item.speed * (deltaTime / 1000);
  }

  // 3. Check for overtakes
  detectAndAnimateOvertakes(items);

  // 4. Check for loop reset
  const copyAWidth = totalItemWidth;
  if (streamPosition <= -copyAWidth) {
    streamPosition += copyAWidth;  // Instant reset
  }

  // 5. Apply position to DOM
  streamElement.style.transform = `translateX(${streamPosition}px)`;

  // 6. Process animation queue
  processAnimationQueue(timestamp);

  // 7. Schedule next frame
  rafId = requestAnimationFrame(tickerLoop);
}
```

The loop runs continuously (even when the ticker appears static to the user) because:
- Sentiment decay animations run perpetually.
- Overtake detection is continuous.
- The global speed may change at any time.

### Performance Budget

| Metric | Target |
|--------|--------|
| Animation loop CPU time | < 3ms per frame |
| DOM nodes (items) | ≤ 40 (20 items × 2 copies for seamless loop) |
| CSS properties animated | `transform`, `opacity`, `width` only |
| Layout thrash | Zero (no style reads in animation loop — all state is tracked in JS) |
| Memory | < 5MB for item state + animation queue |
| Frame rate | 60fps target, 30fps minimum acceptable |

### Volume Data Handling

Volume data (24h USD volume per country) is displayed in the ticker but is not the primary data feed. It is updated less frequently than probability data:

```
Probability:  Every ~3 seconds (SSE push from data pipeline).
Volume:       Every ~30 seconds (separate REST poll, lower priority).

When volume updates:
  - The volume number and mini-bar update with a subtle "pop" animation
    (scale 1.0 → 1.05 → 1.0 over 150ms).
  - Volume surge detection runs after each update.
```

---

*End of Module D Design Specification*
