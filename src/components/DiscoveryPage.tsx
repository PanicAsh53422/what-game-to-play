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
