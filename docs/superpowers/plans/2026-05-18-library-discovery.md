# Library Discovery Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-player "Explore My Library" mode that lets users browse, filter, and discover games from their Steam library using playtime data, mood/genre filters, similarity matching, and priority picks with randomization.

**Architecture:** New `DiscoveryPage` orchestrator component manages all state for the discovery mode. A `ModeToggle` at the top of `App.tsx` switches between the existing multiplayer flow and the new discovery flow. Genre data is progressively loaded in background batches and cached in localStorage. All logic is client-side — no server changes.

**Tech Stack:** React 19, TypeScript, Vite, existing Express proxy endpoints (`/api/owned-games`, `/api/app-details`)

**Note:** This project has no test framework. Verification steps use `tsc --noEmit` for type-checking and manual browser testing via the dev server (`npm run dev`).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/types/discovery.ts` | LibraryGame, MoodPreset, PlaytimeQuickFilter, SimilarFilter types |
| Create | `src/services/genreCache.ts` | Read/write genre data from localStorage |
| Create | `src/services/library.ts` | Load library, progressive genre fetching |
| Create | `src/components/ModeToggle.tsx` | Two-tab mode switcher |
| Create | `src/components/LibraryInput.tsx` | API key + Steam ID input form |
| Create | `src/components/LibraryStats.tsx` | Smart category count cards |
| Create | `src/components/LibraryGameCard.tsx` | Game card with playtime, star, find similar |
| Create | `src/components/LibraryFilters.tsx` | Quick filter buttons, range slider, search, sort |
| Create | `src/components/MoodSelector.tsx` | Multi-select mood presets + custom genre picker |
| Create | `src/components/SimilarBanner.tsx` | Dismissible "Similar to: X" banner |
| Create | `src/components/PriorityPicks.tsx` | Starred games row + randomizer + clear all |
| Create | `src/components/LibraryGrid.tsx` | Game grid + "Pick from All Results" randomizer |
| Create | `src/components/DiscoveryPage.tsx` | Orchestrator wiring all discovery components |
| Modify | `src/App.tsx` | Add mode state, ModeToggle, render DiscoveryPage |
| Modify | `src/App.css` | All new styles for discovery mode |

---

### Task 1: Discovery Types

**Files:**
- Create: `src/types/discovery.ts`

- [ ] **Step 1: Create discovery types file**

```ts
// src/types/discovery.ts

export interface LibraryGame {
  appid: number;
  name: string;
  playtimeMinutes: number;
  playtimeHours: number;
  headerImage: string;
  genres: string[];
  categories: string[];
  genreLoaded: boolean;
}

export interface MoodPreset {
  label: string;
  emoji: string;
  color: string;
  genres: string[];
}

export type PlaytimeQuickFilter = "all" | "never" | "lt2" | "lt10" | "gt20" | "gt40";

export interface SimilarFilter {
  appid: number;
  name: string;
  genres: string[];
}

export type SortOption = "name-asc" | "name-desc" | "playtime-asc" | "playtime-desc" | "random";

export interface GenreCacheEntry {
  genres: string[];
  categories: string[];
  headerImage: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  { label: "Chill", emoji: "\u{1F9D8}", color: "#27ae60", genres: ["Casual", "Simulation", "Puzzle"] },
  { label: "Action", emoji: "\u{1F4A5}", color: "#e74c3c", genres: ["Action", "Shooter", "Fighting"] },
  { label: "Story", emoji: "\u{1F4D6}", color: "#9b59b6", genres: ["RPG", "Adventure", "Visual Novel"] },
  { label: "Competitive", emoji: "\u{1F3C6}", color: "#f39c12", genres: ["Sports", "Racing", "Fighting"] },
  { label: "Strategy", emoji: "\u{1F527}", color: "#3498db", genres: ["Strategy", "Tower Defense"] },
];

export const PLAYTIME_CATEGORIES = [
  { label: "Never Played", min: 0, max: 0, color: "#e74c3c" },
  { label: "Barely Touched", min: 0.01, max: 2, color: "#f39c12" },
  { label: "Unfinished", min: 2, max: 10, color: "#3498db" },
  { label: "Moderate", min: 10, max: 40, color: "#2ecc71" },
  { label: "Well Played", min: 40, max: Infinity, color: "#9b59b6" },
] as const;
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors related to `src/types/discovery.ts`

- [ ] **Step 3: Commit**

```bash
git add src/types/discovery.ts
git commit -m "feat: add discovery mode types and constants"
```

---

### Task 2: Genre Cache Service

**Files:**
- Create: `src/services/genreCache.ts`

- [ ] **Step 1: Create genre cache service**

```ts
// src/services/genreCache.ts

import type { GenreCacheEntry } from "../types/discovery";

const CACHE_KEY = "genre-cache";

export function readGenreCache(): Record<string, GenreCacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function writeGenreCache(cache: Record<string, GenreCacheEntry>): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCachedGenre(appid: number): GenreCacheEntry | null {
  const cache = readGenreCache();
  return cache[String(appid)] || null;
}

export function setCachedGenres(entries: Record<number, GenreCacheEntry>): void {
  const cache = readGenreCache();
  for (const [appid, entry] of Object.entries(entries)) {
    cache[String(appid)] = entry;
  }
  writeGenreCache(cache);
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/genreCache.ts
git commit -m "feat: add localStorage genre cache service"
```

---

### Task 3: Library Loading Service

**Files:**
- Create: `src/services/library.ts`

This service reuses `resolveToSteamId` and `getOwnedGames` from `src/services/steam.ts`, and adds progressive genre fetching.

- [ ] **Step 1: Create library service**

```ts
// src/services/library.ts

import type { LibraryGame, GenreCacheEntry } from "../types/discovery";
import { resolveToSteamId, getOwnedGames } from "./steam";
import { readGenreCache, setCachedGenres } from "./genreCache";

export async function loadLibrary(
  apiKey: string,
  steamInput: string,
  onProgress: (msg: string) => void,
): Promise<LibraryGame[]> {
  onProgress("Resolving Steam ID...");
  const steamId = await resolveToSteamId(apiKey, steamInput);

  onProgress("Fetching game library...");
  const rawGames = await getOwnedGames(apiKey, steamId);

  const cache = readGenreCache();
  const games: LibraryGame[] = rawGames.map((g) => {
    const cached = cache[String(g.appid)];
    return {
      appid: g.appid,
      name: g.name,
      playtimeMinutes: g.playtime_forever,
      playtimeHours: Math.round((g.playtime_forever / 60) * 10) / 10,
      headerImage: cached?.headerImage || "",
      genres: cached?.genres || [],
      categories: cached?.categories || [],
      genreLoaded: !!cached,
    };
  });

  games.sort((a, b) => a.name.localeCompare(b.name));
  onProgress(`Loaded ${games.length} games.`);
  return games;
}

export async function fetchGenresBatch(
  appids: number[],
  onBatchDone: (updated: Record<number, GenreCacheEntry>) => void,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  const batchSize = 5;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let loaded = 0;

  for (let i = 0; i < appids.length; i += batchSize) {
    const batch = appids.slice(i, i + batchSize);
    const results: Record<number, GenreCacheEntry> = {};

    await Promise.all(
      batch.map(async (appid) => {
        try {
          const res = await fetch(`/api/app-details?appids=${appid}`);
          const data = await res.json();
          const appData = data[String(appid)];
          if (appData?.success) {
            const cats = (appData.data.categories || []).map(
              (c: { description: string }) => c.description,
            );
            const gens = (appData.data.genres || []).map(
              (g: { description: string }) => g.description,
            );
            results[appid] = {
              genres: gens,
              categories: cats,
              headerImage: appData.data.header_image || "",
            };
          }
        } catch {
          // skip failed fetches
        }
      }),
    );

    if (Object.keys(results).length > 0) {
      setCachedGenres(results);
      onBatchDone(results);
    }

    loaded += batch.length;
    onProgress(loaded, appids.length);

    if (i + batchSize < appids.length) {
      await delay(300);
    }
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/library.ts
git commit -m "feat: add library loading with progressive genre fetch"
```

---

### Task 4: ModeToggle Component

**Files:**
- Create: `src/components/ModeToggle.tsx`

- [ ] **Step 1: Create ModeToggle component**

```tsx
// src/components/ModeToggle.tsx

interface Props {
  mode: "together" | "discover";
  onChangeMode: (mode: "together" | "discover") => void;
}

export function ModeToggle({ mode, onChangeMode }: Props) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-tab ${mode === "together" ? "active" : ""}`}
        onClick={() => onChangeMode("together")}
      >
        Find Games Together
      </button>
      <button
        className={`mode-tab ${mode === "discover" ? "active" : ""}`}
        onClick={() => onChangeMode("discover")}
      >
        Explore My Library
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ModeToggle.tsx
git commit -m "feat: add ModeToggle component"
```

---

### Task 5: LibraryInput Component

**Files:**
- Create: `src/components/LibraryInput.tsx`

- [ ] **Step 1: Create LibraryInput component**

```tsx
// src/components/LibraryInput.tsx

import { useState, useEffect } from "react";
import { loadConfig, saveConfig } from "../services/storage";

interface Props {
  onSubmit: (apiKey: string, steamId: string) => void;
  loading: boolean;
}

export function LibraryInput({ onSubmit, loading }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [steamId, setSteamId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = loadConfig();
    setApiKey(config.apiKey);
    if (config.players.length > 0 && config.players[0]) {
      setSteamId(config.players[0]);
    }
  }, []);

  function handleSave() {
    const config = loadConfig();
    saveConfig({ ...config, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || !steamId.trim()) return;
    const config = loadConfig();
    saveConfig({ ...config, apiKey });
    onSubmit(apiKey, steamId);
  }

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <div className="form-row">
        <div className="form-section">
          <label htmlFor="discoverApiKey">Steam API Key</label>
          <input
            id="discoverApiKey"
            type="password"
            placeholder="Your Steam Web API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
          <small>
            Get one at{" "}
            <a
              href="https://steamcommunity.com/dev/apikey"
              target="_blank"
              rel="noreferrer"
            >
              steamcommunity.com/dev/apikey
            </a>
          </small>
        </div>
        <div className="form-section">
          <label htmlFor="discoverSteamId">Your Steam ID</label>
          <input
            id="discoverSteamId"
            type="text"
            placeholder="Steam ID or vanity URL"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Loading..." : "Load Library"}
        </button>
        <button type="button" className="btn-secondary" onClick={handleSave}>
          {saved ? "Saved!" : "Save API Key"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LibraryInput.tsx
git commit -m "feat: add LibraryInput component for discovery mode"
```

---

### Task 6: LibraryStats Component

**Files:**
- Create: `src/components/LibraryStats.tsx`

- [ ] **Step 1: Create LibraryStats component**

```tsx
// src/components/LibraryStats.tsx

import type { LibraryGame } from "../types/discovery";
import { PLAYTIME_CATEGORIES } from "../types/discovery";

interface Props {
  games: LibraryGame[];
}

function countInCategory(games: LibraryGame[], min: number, max: number): number {
  return games.filter((g) => {
    if (min === 0 && max === 0) return g.playtimeHours === 0;
    if (max === Infinity) return g.playtimeHours >= min;
    return g.playtimeHours >= min && g.playtimeHours < max;
  }).length;
}

export function LibraryStats({ games }: Props) {
  return (
    <div className="library-stats">
      <div className="library-stats-title">Your Library: {games.length} games</div>
      <div className="stats-cards">
        {PLAYTIME_CATEGORIES.map((cat) => (
          <div
            key={cat.label}
            className="stat-card"
            style={{
              borderColor: cat.color,
              background: `${cat.color}22`,
            }}
          >
            <div className="stat-count" style={{ color: cat.color }}>
              {countInCategory(games, cat.min, cat.max)}
            </div>
            <div className="stat-label" style={{ color: cat.color }}>
              {cat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LibraryStats.tsx
git commit -m "feat: add LibraryStats smart category cards"
```

---

### Task 7: LibraryGameCard Component

**Files:**
- Create: `src/components/LibraryGameCard.tsx`

- [ ] **Step 1: Create LibraryGameCard component**

```tsx
// src/components/LibraryGameCard.tsx

import type { LibraryGame } from "../types/discovery";
import { getSteamStoreUrl } from "../services/steam";

interface Props {
  game: LibraryGame;
  isStarred: boolean;
  onStar: (appid: number) => void;
  onFindSimilar?: (appid: number) => void;
}

function playtimeColor(hours: number): string {
  if (hours === 0) return "#e74c3c";
  if (hours < 2) return "#f39c12";
  if (hours < 10) return "#3498db";
  if (hours < 40) return "#2ecc71";
  return "#9b59b6";
}

export function LibraryGameCard({ game, isStarred, onStar, onFindSimilar }: Props) {
  return (
    <div className={`game-card library-card ${isStarred ? "starred" : ""}`}>
      <div className="library-card-img-wrap">
        <a
          href={getSteamStoreUrl(game.appid)}
          target="_blank"
          rel="noreferrer"
          className="game-card-link"
        >
          {game.headerImage ? (
            <img
              src={game.headerImage}
              alt={game.name}
              className="game-image"
              loading="lazy"
            />
          ) : (
            <div className="game-image-placeholder" />
          )}
        </a>
        <button
          className={`btn-star ${isStarred ? "active" : ""}`}
          onClick={() => onStar(game.appid)}
          title={isStarred ? "Remove from priorities" : "Add to priorities"}
        >
          {isStarred ? "⭐" : "☆"}
        </button>
      </div>
      <div className="game-info">
        <h3>{game.name}</h3>
        <div
          className="playtime-display"
          style={{ color: playtimeColor(game.playtimeHours) }}
        >
          {game.playtimeHours} hours played
        </div>
        <div className="game-tags">
          {game.genreLoaded ? (
            game.genres.map((g) => (
              <span key={g} className="tag tag-genre">
                {g}
              </span>
            ))
          ) : (
            <span className="tag tag-loading">Loading...</span>
          )}
        </div>
        {game.genreLoaded && onFindSimilar && (
          <div className="game-actions">
            <button
              className="btn-secondary btn-small"
              onClick={() => onFindSimilar(game.appid)}
            >
              Find Similar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LibraryGameCard.tsx
git commit -m "feat: add LibraryGameCard with playtime, star, find similar"
```

---

### Task 8: LibraryFilters Component

**Files:**
- Create: `src/components/LibraryFilters.tsx`

- [ ] **Step 1: Create LibraryFilters component**

```tsx
// src/components/LibraryFilters.tsx

import type { PlaytimeQuickFilter, SortOption } from "../types/discovery";

interface Props {
  quickFilter: PlaytimeQuickFilter;
  onQuickFilter: (filter: PlaytimeQuickFilter) => void;
  sliderValue: number;
  sliderMax: number;
  onSliderChange: (value: number) => void;
  nameFilter: string;
  onNameFilter: (value: string) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

const QUICK_FILTERS: { value: PlaytimeQuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "never", label: "Never Played" },
  { value: "lt2", label: "<2 hrs" },
  { value: "lt10", label: "<10 hrs" },
  { value: "gt20", label: "20+ hrs" },
  { value: "gt40", label: "40+ hrs" },
];

export function LibraryFilters({
  quickFilter,
  onQuickFilter,
  sliderValue,
  sliderMax,
  onSliderChange,
  nameFilter,
  onNameFilter,
  sortOption,
  onSortChange,
}: Props) {
  return (
    <div className="library-filters">
      <div className="filters-row">
        <div className="quick-filters">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn-chip ${quickFilter === f.value ? "active" : ""}`}
              onClick={() => onQuickFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="slider-wrap">
          <span className="slider-label">0h</span>
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            className="playtime-slider"
          />
          <span className="slider-label">{sliderMax}h+</span>
        </div>
      </div>
      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by name..."
          value={nameFilter}
          onChange={(e) => onNameFilter(e.target.value)}
          className="filter-input"
        />
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="filter-select"
        >
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="playtime-asc">Playtime: Low to High</option>
          <option value="playtime-desc">Playtime: High to Low</option>
          <option value="random">Random Shuffle</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LibraryFilters.tsx
git commit -m "feat: add LibraryFilters with quick buttons, slider, search, sort"
```

---

### Task 9: MoodSelector Component

**Files:**
- Create: `src/components/MoodSelector.tsx`

- [ ] **Step 1: Create MoodSelector component**

```tsx
// src/components/MoodSelector.tsx

import { useState } from "react";
import { MOOD_PRESETS } from "../types/discovery";

interface Props {
  selectedMoods: string[];
  onToggleMood: (moodLabel: string) => void;
  customGenres: string[];
  onToggleCustomGenre: (genre: string) => void;
  allGenres: string[];
  genresLoading: boolean;
}

export function MoodSelector({
  selectedMoods,
  onToggleMood,
  customGenres,
  onToggleCustomGenre,
  allGenres,
  genresLoading,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="mood-selector">
      <div className="mood-header">
        <span className="mood-label">Mood</span>
        {genresLoading && (
          <span className="mood-loading">(loading genres...)</span>
        )}
        {selectedMoods.length > 0 && (
          <span className="mood-active-hint">
            (select multiple)
          </span>
        )}
      </div>
      <div className="mood-buttons">
        {MOOD_PRESETS.map((mood) => {
          const isActive = selectedMoods.includes(mood.label);
          return (
            <button
              key={mood.label}
              className={`btn-mood ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? { background: mood.color, borderColor: mood.color, color: "#fff" }
                  : { borderColor: "#555", color: "#888" }
              }
              onClick={() => onToggleMood(mood.label)}
            >
              {mood.emoji} {mood.label} {isActive && "✓"}
            </button>
          );
        })}
        <button
          className={`btn-mood ${showCustom ? "active" : ""}`}
          style={
            showCustom
              ? { background: "#1abc9c", borderColor: "#1abc9c", color: "#fff" }
              : { borderColor: "#555", color: "#888" }
          }
          onClick={() => setShowCustom(!showCustom)}
        >
          🎭 Custom...
        </button>
      </div>
      {showCustom && (
        <div className="custom-genres">
          {allGenres.map((genre) => (
            <label key={genre} className="genre-checkbox">
              <input
                type="checkbox"
                checked={customGenres.includes(genre)}
                onChange={() => onToggleCustomGenre(genre)}
              />
              {genre}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MoodSelector.tsx
git commit -m "feat: add MoodSelector with multi-select presets and custom genres"
```

---

### Task 10: SimilarBanner Component

**Files:**
- Create: `src/components/SimilarBanner.tsx`

- [ ] **Step 1: Create SimilarBanner component**

```tsx
// src/components/SimilarBanner.tsx

import type { SimilarFilter } from "../types/discovery";

interface Props {
  filter: SimilarFilter;
  onClear: () => void;
}

export function SimilarBanner({ filter, onClear }: Props) {
  return (
    <div className="similar-banner">
      <span>
        Similar to: <strong>{filter.name}</strong>
        <span className="similar-genres">
          {" "}({filter.genres.join(", ")})
        </span>
      </span>
      <button className="btn-clear-similar" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SimilarBanner.tsx
git commit -m "feat: add SimilarBanner dismissible filter indicator"
```

---

### Task 11: PriorityPicks Component

**Files:**
- Create: `src/components/PriorityPicks.tsx`

This component uses the existing `RandomPicker` from `src/components/RandomPicker.tsx`. Since `RandomPicker` expects `GameDetails[]`, we'll convert `LibraryGame` to `GameDetails` for the picker.

- [ ] **Step 1: Create PriorityPicks component**

```tsx
// src/components/PriorityPicks.tsx

import type { LibraryGame } from "../types/discovery";
import type { GameDetails } from "../types/steam";
import { RandomPicker } from "./RandomPicker";

interface Props {
  games: LibraryGame[];
  onRemove: (appid: number) => void;
  onClearAll: () => void;
}

function toGameDetails(game: LibraryGame): GameDetails {
  return {
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage,
    isMultiplayer: false,
    categories: game.categories,
    genres: game.genres,
    copiesInFamily: 0,
    ownedBy: [],
  };
}

export function PriorityPicks({ games, onRemove, onClearAll }: Props) {
  if (games.length === 0) return null;

  const asDetails = games.map(toGameDetails);

  return (
    <div className="priority-picks">
      <div className="priority-header">
        <div>
          <h2 className="priority-title">
            Priority Picks <span className="priority-count">({games.length} selected)</span>
          </h2>
          <p className="priority-hint">Star games you're considering, then randomize from your picks</p>
        </div>
        <div className="priority-actions">
          <button className="btn-clear" onClick={onClearAll}>
            Clear All
          </button>
        </div>
      </div>
      <RandomPicker
        games={asDetails}
        label="Pick from Priorities"
      />
      <div className="priority-row">
        {games.map((game) => (
          <div key={game.appid} className="priority-card">
            {game.headerImage && (
              <img
                src={game.headerImage}
                alt={game.name}
                className="priority-thumb"
                loading="lazy"
              />
            )}
            <div className="priority-info">
              <div className="priority-name">{game.name}</div>
              <div className="priority-playtime">{game.playtimeHours}h</div>
            </div>
            <button
              className="priority-remove"
              onClick={() => onRemove(game.appid)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PriorityPicks.tsx
git commit -m "feat: add PriorityPicks with compact cards and randomizer"
```

---

### Task 12: LibraryGrid Component

**Files:**
- Create: `src/components/LibraryGrid.tsx`

- [ ] **Step 1: Create LibraryGrid component**

```tsx
// src/components/LibraryGrid.tsx

import type { LibraryGame } from "../types/discovery";
import type { GameDetails } from "../types/steam";
import { LibraryGameCard } from "./LibraryGameCard";
import { RandomPicker } from "./RandomPicker";

interface Props {
  games: LibraryGame[];
  starredIds: Set<number>;
  onStar: (appid: number) => void;
  onFindSimilar: (appid: number) => void;
  totalCount: number;
}

function toGameDetails(game: LibraryGame): GameDetails {
  return {
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage,
    isMultiplayer: false,
    categories: game.categories,
    genres: game.genres,
    copiesInFamily: 0,
    ownedBy: [],
  };
}

export function LibraryGrid({
  games,
  starredIds,
  onStar,
  onFindSimilar,
  totalCount,
}: Props) {
  const asDetails = games.map(toGameDetails);

  return (
    <div className="library-grid-section">
      <div className="library-grid-header">
        <p className="results-count">
          Showing {games.length} of {totalCount}
        </p>
        <RandomPicker
          games={asDetails}
          label="Pick from All Results"
        />
      </div>
      <div className="game-grid">
        {games.map((game) => (
          <LibraryGameCard
            key={game.appid}
            game={game}
            isStarred={starredIds.has(game.appid)}
            onStar={onStar}
            onFindSimilar={onFindSimilar}
          />
        ))}
      </div>
      {games.length === 0 && (
        <p className="no-results">No games match your filters.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LibraryGrid.tsx
git commit -m "feat: add LibraryGrid with star toggles and randomizer"
```

---

### Task 13: DiscoveryPage Orchestrator

**Files:**
- Create: `src/components/DiscoveryPage.tsx`

This is the main orchestrator that wires all discovery components together and manages state.

- [ ] **Step 1: Create DiscoveryPage component**

```tsx
// src/components/DiscoveryPage.tsx

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  LibraryGame,
  PlaytimeQuickFilter,
  SortOption,
  SimilarFilter,
  GenreCacheEntry,
} from "../types/discovery";
import { MOOD_PRESETS } from "../types/discovery";
import { loadLibrary, fetchGenresBatch } from "../services/library";
import { LibraryInput } from "./LibraryInput";
import { LibraryStats } from "./LibraryStats";
import { LibraryFilters } from "./LibraryFilters";
import { MoodSelector } from "./MoodSelector";
import { SimilarBanner } from "./SimilarBanner";
import { PriorityPicks } from "./PriorityPicks";
import { LibraryGrid } from "./LibraryGrid";

export function DiscoveryPage() {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [genreProgress, setGenreProgress] = useState("");
  const fetchingRef = useRef(false);

  // Filters
  const [quickFilter, setQuickFilter] = useState<PlaytimeQuickFilter>("all");
  const [sliderValue, setSliderValue] = useState(0);
  const [nameFilter, setNameFilter] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [customGenres, setCustomGenres] = useState<string[]>([]);
  const [similarFilter, setSimilarFilter] = useState<SimilarFilter | null>(null);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());

  const sliderMax = useMemo(() => {
    if (games.length === 0) return 100;
    const max = Math.max(...games.map((g) => g.playtimeHours));
    return Math.ceil(max);
  }, [games]);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      for (const genre of g.genres) set.add(genre);
    }
    return Array.from(set).sort();
  }, [games]);

  const handleLoad = useCallback(async (apiKey: string, steamId: string) => {
    setLoading(true);
    setError(null);
    setGames([]);
    setProgress("");
    setGenreProgress("");
    setStarredIds(new Set());
    setSimilarFilter(null);
    fetchingRef.current = false;

    try {
      const library = await loadLibrary(apiKey, steamId, setProgress);
      setGames(library);
      setProgress("");

      const uncached = library.filter((g) => !g.genreLoaded).map((g) => g.appid);
      if (uncached.length > 0) {
        fetchingRef.current = true;
        fetchGenresBatch(
          uncached,
          (updated: Record<number, GenreCacheEntry>) => {
            setGames((prev) =>
              prev.map((g) => {
                const entry = updated[g.appid];
                if (!entry) return g;
                return {
                  ...g,
                  genres: entry.genres,
                  categories: entry.categories,
                  headerImage: entry.headerImage || g.headerImage,
                  genreLoaded: true,
                };
              }),
            );
          },
          (loaded, total) => {
            setGenreProgress(`Loading genre data... ${loaded}/${total}`);
            if (loaded >= total) {
              setGenreProgress("");
              fetchingRef.current = false;
            }
          },
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset slider when quick filter changes
  useEffect(() => {
    if (quickFilter === "all") setSliderValue(0);
    else if (quickFilter === "never") setSliderValue(0);
    else if (quickFilter === "lt2") setSliderValue(2);
    else if (quickFilter === "lt10") setSliderValue(10);
    else if (quickFilter === "gt20") setSliderValue(20);
    else if (quickFilter === "gt40") setSliderValue(40);
  }, [quickFilter]);

  function handleSliderChange(value: number) {
    setSliderValue(value);
    setQuickFilter("all");
  }

  function handleToggleMood(label: string) {
    setSelectedMoods((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  }

  function handleToggleCustomGenre(genre: string) {
    setCustomGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  }

  function handleStar(appid: number) {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(appid)) next.delete(appid);
      else next.add(appid);
      return next;
    });
  }

  function handleFindSimilar(appid: number) {
    const game = games.find((g) => g.appid === appid);
    if (!game || !game.genreLoaded) return;
    setSimilarFilter({ appid: game.appid, name: game.name, genres: game.genres });
  }

  // Apply all filters
  const filtered = useMemo(() => {
    let result = [...games];

    // Playtime quick filter
    if (quickFilter === "never") {
      result = result.filter((g) => g.playtimeHours === 0);
    } else if (quickFilter === "lt2") {
      result = result.filter((g) => g.playtimeHours < 2);
    } else if (quickFilter === "lt10") {
      result = result.filter((g) => g.playtimeHours < 10);
    } else if (quickFilter === "gt20") {
      result = result.filter((g) => g.playtimeHours >= 20);
    } else if (quickFilter === "gt40") {
      result = result.filter((g) => g.playtimeHours >= 40);
    } else if (sliderValue > 0) {
      result = result.filter((g) => g.playtimeHours <= sliderValue);
    }

    // Name filter
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(lower));
    }

    // Mood filter (OR across selected moods)
    const moodGenres = new Set<string>();
    for (const label of selectedMoods) {
      const preset = MOOD_PRESETS.find((m) => m.label === label);
      if (preset) preset.genres.forEach((g) => moodGenres.add(g));
    }
    for (const g of customGenres) moodGenres.add(g);
    if (moodGenres.size > 0) {
      result = result.filter((g) =>
        g.genres.some((genre) => moodGenres.has(genre)),
      );
    }

    // Similar filter
    if (similarFilter) {
      result = result
        .filter((g) => g.appid !== similarFilter.appid)
        .filter((g) => g.genres.some((genre) => similarFilter.genres.includes(genre)));

      // Sort by overlap count (most shared genres first)
      result.sort((a, b) => {
        const overlapA = a.genres.filter((g) => similarFilter.genres.includes(g)).length;
        const overlapB = b.genres.filter((g) => similarFilter.genres.includes(g)).length;
        return overlapB - overlapA;
      });

      return result;
    }

    // Sort
    if (sortOption === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === "playtime-asc") {
      result.sort((a, b) => a.playtimeHours - b.playtimeHours);
    } else if (sortOption === "playtime-desc") {
      result.sort((a, b) => b.playtimeHours - a.playtimeHours);
    } else if (sortOption === "random") {
      result.sort(() => Math.random() - 0.5);
    }

    return result;
  }, [games, quickFilter, sliderValue, nameFilter, selectedMoods, customGenres, similarFilter, sortOption]);

  const starredGames = games.filter((g) => starredIds.has(g.appid));
  const hasGames = games.length > 0;

  return (
    <div className="discovery-page">
      <LibraryInput onSubmit={handleLoad} loading={loading} />

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}

      {hasGames && (
        <>
          <LibraryStats games={games} />
          {genreProgress && <div className="genre-progress">{genreProgress}</div>}

          <LibraryFilters
            quickFilter={quickFilter}
            onQuickFilter={setQuickFilter}
            sliderValue={sliderValue}
            sliderMax={sliderMax}
            onSliderChange={handleSliderChange}
            nameFilter={nameFilter}
            onNameFilter={setNameFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          <MoodSelector
            selectedMoods={selectedMoods}
            onToggleMood={handleToggleMood}
            customGenres={customGenres}
            onToggleCustomGenre={handleToggleCustomGenre}
            allGenres={allGenres}
            genresLoading={!!genreProgress}
          />

          {similarFilter && (
            <SimilarBanner
              filter={similarFilter}
              onClear={() => setSimilarFilter(null)}
            />
          )}

          <PriorityPicks
            games={starredGames}
            onRemove={handleStar}
            onClearAll={() => setStarredIds(new Set())}
          />

          <LibraryGrid
            games={filtered}
            starredIds={starredIds}
            onStar={handleStar}
            onFindSimilar={handleFindSimilar}
            totalCount={games.length}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/DiscoveryPage.tsx
git commit -m "feat: add DiscoveryPage orchestrator component"
```

---

### Task 14: Integrate into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add mode toggle and DiscoveryPage to App.tsx**

Replace the entire content of `src/App.tsx` with:

```tsx
// src/App.tsx

import { useState, useCallback } from "react";
import { InputForm } from "./components/InputForm";
import { ResultsList } from "./components/ResultsList";
import { SessionPanel } from "./components/SessionPanel";
import { WantToPlayList } from "./components/WantToPlayList";
import { JoinPanel } from "./components/JoinPanel";
import { ModeToggle } from "./components/ModeToggle";
import { DiscoveryPage } from "./components/DiscoveryPage";
import { findSharedMultiplayerGames } from "./services/steam";
import {
  createSession,
  joinSession,
  addGameToWantList,
  removeGameFromWantList,
  voteForGame,
  clearAllPicks,
  triggerRandomPick,
} from "./services/session";
import type { GameDetails, SessionState } from "./types/steam";
import "./App.css";

function App() {
  const [mode, setMode] = useState<"together" | "discover">("together");
  const [results, setResults] = useState<GameDetails[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  async function handleSubmit(
    apiKey: string,
    players: string[],
    familyMembers: string[],
  ) {
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress("");
    setSession(null);

    try {
      const games = await findSharedMultiplayerGames(
        apiKey,
        players,
        familyMembers,
        setProgress,
      );
      setResults(games);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleSessionState = useCallback((state: SessionState) => {
    setSession(state);
    setSessionError(null);
    if (state.games.length > 0) {
      setResults(state.games);
    }
  }, []);

  function handleCreateSession(nickname: string) {
    if (!results) return;
    setSessionError(null);
    createSession(results, nickname, handleSessionState, setSessionError);
  }

  function handleJoinSession(code: string, nickname: string) {
    setSessionError(null);
    joinSession(code, nickname, handleSessionState, setSessionError);
  }

  const hasResults = results && results.length > 0;
  const inSession = !!session?.sessionId;

  return (
    <div className="app">
      <header>
        <h1>What Game to Play?</h1>
        <p>
          Find multiplayer games you and your friends can play together on
          Steam — or explore your own library.
        </p>
      </header>

      <ModeToggle mode={mode} onChangeMode={setMode} />

      {mode === "discover" ? (
        <DiscoveryPage />
      ) : (
        <>
          {!inSession && !hasResults && (
            <>
              <JoinPanel onJoin={handleJoinSession} error={sessionError} />
              <div className="section-divider">
                <span>or search for shared games</span>
              </div>
              <InputForm onSubmit={handleSubmit} loading={loading} />
            </>
          )}

          {!inSession && hasResults && (
            <InputForm onSubmit={handleSubmit} loading={loading} />
          )}

          {progress && <div className="progress">{progress}</div>}
          {error && <div className="error">{error}</div>}

          {hasResults && (
            <SessionPanel
              onCreateSession={handleCreateSession}
              onJoinSession={handleJoinSession}
              sessionId={session?.sessionId ?? null}
              players={session?.players ?? []}
              playerSlot={session?.playerSlot ?? -1}
              sessionError={sessionError}
            />
          )}

          {session && results && (
            <WantToPlayList
              session={session}
              games={results}
              onRemove={removeGameFromWantList}
              onVote={voteForGame}
              onClearAll={clearAllPicks}
              onRandomPick={triggerRandomPick}
              onAdd={addGameToWantList}
            />
          )}

          {results && (
            <ResultsList
              games={results}
              session={session}
              onAddToWantList={session ? addGameToWantList : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate ModeToggle and DiscoveryPage into App"
```

---

### Task 15: CSS Styles for Discovery Mode

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Add all discovery mode styles**

Append the following to the end of `src/App.css` (before the closing `}` of the responsive media query, or after it — append at the very end of the file):

```css
/* ===== Discovery Mode ===== */

/* Mode Toggle */
.mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  background: var(--bg-card);
  padding: 0.35rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.mode-tab {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-light);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.mode-tab.active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.mode-tab:hover:not(.active) {
  color: var(--text);
  background: rgba(102, 192, 244, 0.08);
}

/* Library Stats */
.library-stats {
  margin: 1rem 0;
}

.library-stats-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.75rem;
}

.stats-cards {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.stat-card {
  padding: 0.6rem 1rem;
  border: 1px solid;
  border-radius: var(--radius);
  text-align: center;
  min-width: 100px;
}

.stat-count {
  font-size: 1.4rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.78rem;
  margin-top: 0.1rem;
}

/* Genre Progress */
.genre-progress {
  color: var(--accent);
  font-size: 0.85rem;
  padding: 0.35rem 0;
}

/* Library Filters */
.library-filters {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filters-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.quick-filters {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.btn-chip {
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-light);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.btn-chip:hover:not(.active) {
  border-color: var(--accent);
  color: var(--text);
}

.slider-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slider-label {
  color: var(--text-light);
  font-size: 0.75rem;
  min-width: 2rem;
}

.playtime-slider {
  width: 120px;
  accent-color: var(--accent);
}

/* Mood Selector */
.mood-selector {
  margin: 1rem 0;
}

.mood-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.mood-label {
  color: var(--text-light);
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 600;
}

.mood-loading {
  color: var(--accent);
  font-size: 0.75rem;
}

.mood-active-hint {
  color: var(--accent);
  font-size: 0.75rem;
}

.mood-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-mood {
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  border: 1px solid;
  background: transparent;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mood.active {
  font-weight: 600;
}

.btn-mood:hover:not(.active) {
  opacity: 0.8;
}

.custom-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.genre-checkbox {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text);
  font-size: 0.82rem;
  cursor: pointer;
}

.genre-checkbox input {
  accent-color: var(--accent);
}

/* Similar Banner */
.similar-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(102, 192, 244, 0.1);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 0.6rem 1rem;
  margin: 1rem 0;
  color: var(--text);
  font-size: 0.9rem;
}

.similar-genres {
  color: var(--text-light);
  font-size: 0.82rem;
}

.btn-clear-similar {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-clear-similar:hover {
  background: rgba(102, 192, 244, 0.15);
}

/* Priority Picks */
.priority-picks {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--bg-card);
  border: 2px solid var(--accent);
  border-radius: var(--radius);
}

.priority-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.priority-title {
  font-size: 1.1rem;
  color: #fff;
}

.priority-count {
  font-weight: 400;
  color: var(--text-light);
  font-size: 0.9rem;
}

.priority-hint {
  color: var(--text-light);
  font-size: 0.8rem;
  margin-top: 0.15rem;
}

.priority-actions {
  display: flex;
  gap: 0.5rem;
}

.priority-row {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.priority-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 200px;
  background: var(--bg-input);
  border: 2px solid var(--gold);
  border-radius: var(--radius);
  padding: 0.5rem 0.7rem;
}

.priority-thumb {
  width: 50px;
  height: 24px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
}

.priority-info {
  flex: 1;
  min-width: 0;
}

.priority-name {
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.priority-playtime {
  font-size: 0.72rem;
  color: var(--text-light);
}

.priority-remove {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.15rem;
  flex-shrink: 0;
}

.priority-remove:hover {
  opacity: 0.7;
}

/* Library Game Card extras */
.library-card.starred {
  border-color: var(--gold);
}

.library-card-img-wrap {
  position: relative;
}

.btn-star {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0, 0, 0, 0.6);
  color: #888;
}

.btn-star.active {
  background: var(--gold);
  color: #fff;
}

.btn-star:hover {
  transform: scale(1.1);
}

.playtime-display {
  font-size: 0.82rem;
  font-weight: 600;
}

.game-image-placeholder {
  width: 100%;
  aspect-ratio: 460 / 215;
  background: var(--bg-input);
}

.tag-loading {
  background: rgba(102, 192, 244, 0.1);
  color: var(--text-light);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Library Grid */
.library-grid-section {
  margin-top: 1rem;
}

.library-grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Discovery responsive */
@media (max-width: 600px) {
  .stats-cards {
    flex-direction: column;
  }

  .stat-card {
    min-width: unset;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .quick-filters {
    justify-content: center;
  }

  .slider-wrap {
    justify-content: center;
  }

  .mood-buttons {
    justify-content: center;
  }

  .priority-header {
    flex-direction: column;
  }

  .similar-banner {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .library-grid-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

- [ ] **Step 2: Verify dev server renders correctly**

Run: `npm run dev`
Open browser, verify mode toggle appears, click "Explore My Library", confirm the input form renders.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "feat: add all CSS styles for discovery mode"
```

---

### Task 16: Final Verification & Cleanup

- [ ] **Step 1: Type-check the entire project**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Build for production**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Manual browser test**

Run `npm run dev` and verify:
1. Mode toggle appears at the top, both tabs work
2. "Explore My Library" shows the input form
3. Entering API key + Steam ID loads the library
4. Smart category cards show correct counts
5. Quick filter buttons filter by playtime
6. Range slider filters by playtime, deselects quick filter buttons
7. Mood buttons are multi-select, filter by genre (after genres load)
8. "Find Similar" button appears on cards once genres load
9. Clicking "Find Similar" shows the similar banner and filters results
10. Star button toggles priority picks, cards appear in the priority row
11. "Pick from Priorities" and "Pick from All Results" randomizers work
12. "Clear All" removes all priority picks
13. Switching back to "Find Games Together" shows the original multiplayer flow unchanged

- [ ] **Step 4: Add .superpowers to gitignore if not already there**

Check if `.superpowers/` is in `.gitignore`. If not, add it.

```bash
grep -q "superpowers" .gitignore || echo ".superpowers/" >> .gitignore
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete library discovery mode with filters, moods, priorities, and similarity"
```
