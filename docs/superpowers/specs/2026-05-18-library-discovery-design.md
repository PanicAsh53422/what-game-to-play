# Single-Player Library Discovery Mode

## Overview

A new "Explore My Library" tab alongside the existing "Find Games Together" multiplayer mode. Lets a single user load their entire Steam library, filter and sort by playtime and mood/genre, find similar games, star priority picks, and randomize from those picks.

Uses progressive loading: playtime data renders instantly from a single API call, genre data fills in via background batches and is cached in localStorage for near-instant repeat visits.

## Data Flow

1. User enters API key + Steam ID, clicks "Load Library"
2. Single call to `/api/owned-games` returns all games with `playtime_forever` and `name` — library renders immediately
3. Check localStorage genre cache — skip already-cached games
4. Background: fetch `/api/app-details` in batches of 5 (300ms delay between batches) for uncached games
5. Store each game's genre/category/headerImage in localStorage cache
6. UI updates progressively as genre data arrives — mood filters and "Find Similar" become functional

## No Server Changes

All new logic is client-side. The existing `/api/owned-games` and `/api/app-details` proxy endpoints are sufficient.

## New Types

```ts
interface LibraryGame {
  appid: number;
  name: string;
  playtimeMinutes: number;
  playtimeHours: number;       // playtimeMinutes / 60, rounded to 1 decimal
  headerImage: string;         // from cache or empty string while loading
  genres: string[];            // from cache or empty while loading
  categories: string[];        // from cache or empty while loading
  genreLoaded: boolean;        // true once genre data fetched/cached
}

interface MoodPreset {
  label: string;
  emoji: string;
  color: string;
  genres: string[];            // Steam genre strings this mood maps to
}

type PlaytimeQuickFilter = "all" | "never" | "lt2" | "lt10" | "gt20" | "gt40";

interface SimilarFilter {
  appid: number;
  name: string;
  genres: string[];
}
```

## Mood Presets

| Mood | Emoji | Genres |
|------|-------|--------|
| Chill | 🧘 | Casual, Simulation, Puzzle |
| Action | 💥 | Action, Shooter, Fighting |
| Story | 📖 | RPG, Adventure, Visual Novel |
| Competitive | 🏆 | Sports, Racing, Fighting |
| Strategy | 🔧 | Strategy, Tower Defense |
| Custom | 🎭 | User picks from genre multi-select dropdown (checkboxes for all genres found in library) |

Multiple moods can be active simultaneously (OR logic). Selecting a mood highlights its button; clicking again deselects it.

## Smart Category Thresholds

| Category | Range | Color |
|----------|-------|-------|
| Never Played | 0 hours | Red |
| Barely Touched | >0 to <2 hours | Orange |
| Unfinished | 2 to 10 hours | Blue |
| Moderate | 10 to 40 hours | Green |
| Well Played | 40+ hours | Purple |

## Quick Filter Buttons

All, Never Played, <2 hrs, <10 hrs, 20+ hrs, 40+ hrs. Each sets min/max on the playtime filter. Clicking a quick filter updates the slider position to match. Moving the slider manually deselects any active quick filter button. The range slider allows custom thresholds beyond presets.

## Sort Options

- Name (A-Z / Z-A)
- Playtime (low to high / high to low)
- Random shuffle

## Find Similar

- Each game card shows a "Find Similar" button once its genre data is loaded
- Clicking activates a "Similar to: [Game Name]" banner at the top of the results
- Filters library to games sharing at least one genre with the selected game
- Results sorted by genre overlap count (most shared genres first)
- Combines with other active filters (playtime, mood)
- One-click dismiss to clear the similarity filter

## Priority Picks

- Star icon on each game card toggles it into priority picks (no limit)
- Priority section renders above the game grid as a compact horizontal scrollable row
- Each priority card shows: thumbnail, name, playtime, remove (✕) button
- "Pick from Priorities" randomizer uses existing RandomPicker component with shuffle animation
- "Clear All" button to reset
- Priority picks stored in component state (not persisted across sessions)

## Genre Cache (localStorage)

- Key: `genre-cache`
- Value: `Record<string, { genres: string[], categories: string[], headerImage: string }>`
- Keyed by appid as string
- On load: read cache, determine which appids need fetching, only fetch those
- No TTL — game genres are static

## New Components

1. **`ModeToggle`** — two tabs at the top of the app: "Find Games Together" / "Explore My Library". Controls which mode renders.
2. **`LibraryInput`** — simplified input: API key + Steam ID. Loads/saves from localStorage.
3. **`LibraryStats`** — smart category cards showing count per playtime bucket.
4. **`LibraryFilters`** — quick filter buttons, range slider, name search, sort dropdown.
5. **`MoodSelector`** — multi-select mood preset buttons + custom genre picker.
6. **`SimilarBanner`** — dismissible banner showing "Similar to: [Game Name]" when similarity filter is active.
7. **`PriorityPicks`** — horizontal scrollable row of starred games with randomizer and clear all.
8. **`LibraryGrid`** — game cards with star toggle, playtime, genre tags, "Find Similar" button.
9. **`DiscoveryPage`** — orchestrator wiring all above components, manages all discovery state.

## Reused Components

- **`RandomPicker`** — reuse for both "Pick from Priorities" and "Pick from All Results"
- **`GameCard`** — extend with optional `playtimeHours`, `onStar`/`isStarred`, `onFindSimilar` props

## App Structure Change

`App.tsx` gains a `mode` state (`"together" | "discover"`). When `mode` is `"together"`, existing multiplayer flow renders. When `"discover"`, `DiscoveryPage` renders. `ModeToggle` sits above both.

## Progressive Loading UX

- Before genre data loads: game cards show name + playtime + loading shimmer for genre tags
- Mood buttons are visible but show "(loading genres...)" hint until first batch completes
- "Find Similar" button hidden on cards without genre data
- A small progress indicator: "Loading genre data... 45/347"
