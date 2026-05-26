# Handoff Notes

## Current State

This project has been migrated from the original static `index.html` / `script.js` / `style.css` implementation into a Next.js App Router app using TailwindCSS and Framer Motion.

The current UI direction is a futuristic FIFA World Cup 2026 dashboard:

- dark luxury interface
- glassmorphism cards
- Apple Vision Pro / Nothing UI / Linear-inspired restraint
- neon lime accent `#D8FF3E`
- orange secondary accent `#FF9A1F`

## Active Stack

- Next.js App Router
- React
- TypeScript
- TailwindCSS
- Framer Motion
- lucide-react
- Static export configured for GitHub Pages

## Important Commands

Install dependencies:

```bash
npm.cmd install --cache .\.npm-cache
```

Run locally:

```bash
npm.cmd run dev -- -p 3000
```

Build:

```bash
npm.cmd run build
```

Preview URLs:

```text
http://localhost:3000/
http://localhost:3000/matches/
```

On this Windows machine, use `npm.cmd` instead of `npm` because PowerShell blocks `npm.ps1`.

## Current Routing

- `/`
  - Home page.
  - Only renders the Hero/dashboard top section.

- `/matches/`
  - Moved from the old content below the Hero.
  - Contains match stats, search/filter controls, and the full schedule list.
  - Styling is intentionally not yet reworked.

## Key Files

- `app/page.tsx`
  - Home route.
  - Uses `WorldCupHero` only.

- `app/matches/page.tsx`
  - Matches route.
  - Contains the former lower-page schedule/stat/search UI.

- `components/world-cup-hero.tsx`
  - Main Hero/dashboard component.
  - Includes top nav, compressed left tournament panel, control cards, Next Match card, and FIFA news panel.

- `components/match-card.tsx`
  - Existing match card for `/matches/`.

- `components/stat-card.tsx`
  - Existing stat cards for `/matches/`.

- `lib/use-world-cup-data.ts`
  - Shared client hook for loading `/calendar.ics`.
  - Provides matches, cities, firstMatch, progress, calendarUrl, and webcalUrl.

- `lib/calendar.ts`
  - ICS parsing and match grouping/status helpers.

- `lib/teams.ts`
  - Team parsing and flag image mapping.

- `app/globals.css`
  - Tailwind imports.
  - Global dark background.
  - Glass panel/chip classes.
  - Hero-specific classes such as `hero-shell`, `hero-card`, `dot-display`, and `line-clamp-2`.

## Assets

- `public/calendar.ics`
  - Runtime calendar feed used by the app.

- `public/2026_FIFA_World_Cup_emblem.svg`
  - Header logo.

- `public/estadio-azteca-aerial.jpg`
  - Hero Next Match background image.
  - Source: Wikimedia Commons, Estadio Azteca aerial/night image, CC BY 4.0.

## Legacy Files

These files are from the original static implementation and are not used by the Next.js app:

- `index.html`
- `script.js`
- `style.css`
- root `calendar.ics` is still present for legacy/static hosting, but the Next app reads `public/calendar.ics`.

Do not delete them unless the user explicitly approves cleanup.

## Known Notes

- Running `npm.cmd run build` while `next dev` is still running can corrupt or confuse the local `.next` dev cache. If the browser suddenly shows broken styling, huge SVG/logo, black screen, or 500 chunk errors:

```bash
# stop the 3000 process, delete .next, then restart dev
npm.cmd run dev -- -p 3000
```

- `/matches` redirects to `/matches/` because `next.config.mjs` has `trailingSlash: true`.

- `useWorldCupData` must fetch `/calendar.ics` with a leading slash. Relative `calendar.ics` breaks on nested routes like `/matches/`.

- Some terminal output displays Chinese as mojibake due to PowerShell encoding, but the source files themselves should be edited as UTF-8.

## Suggested Next Steps

1. Rework `/matches/` page visual design to match the Hero style.
2. Split `/matches/` into smaller components:
   - `MatchesHeader`
   - `MatchFilters`
   - `MatchStats`
   - `ScheduleList`
   - `DaySection`
3. Replace static `fifaNews` in `world-cup-hero.tsx` with a proper data module or CMS/API fetch if live news is required.
4. Clean up unused `components/hero-status.tsx` if no longer needed.
5. Consider removing legacy static files after user approval.
