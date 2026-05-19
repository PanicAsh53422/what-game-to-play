import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  LibraryGame,
  PlaytimeQuickFilter,
  PlaytimeCategoryFilter,
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
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const loadGeneration = useRef(0);

  // Filters
  const [quickFilter, setQuickFilter] = useState<PlaytimeQuickFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<PlaytimeCategoryFilter | null>(null);
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

  const handleLoad = useCallback(async (apiKey: string, steamId: string, familyMembers: string[]) => {
    const gen = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    setGames([]);
    setProgress("");
    setGenreProgress("");
    setStarredIds(new Set());
    setSimilarFilter(null);

    try {
      const library = await loadLibrary(apiKey, steamId, familyMembers, setProgress);
      if (gen !== loadGeneration.current) return;
      setGames(library);
      setProgress("");

      const uncached = library.filter((g) => !g.genreLoaded).map((g) => g.appid);
      if (uncached.length > 0) {
        fetchGenresBatch(
          uncached,
          (updated: Record<number, GenreCacheEntry>) => {
            if (gen !== loadGeneration.current) return;
            setGames((prev) =>
              prev.map((g) => {
                const entry = updated[g.appid];
                if (!entry) return g;
                return {
                  ...g,
                  genres: entry.genres,
                  categories: entry.categories,
                  tags: entry.tags || [],
                  headerImage: entry.headerImage || g.headerImage,
                  genreLoaded: true,
                };
              }),
            );
          },
          (loaded, total) => {
            if (gen !== loadGeneration.current) return;
            setGenreProgress(`Loading genre data... ${loaded}/${total}`);
            if (loaded >= total) {
              setGenreProgress("");
            }
          },
        );
      }
    } catch (err) {
      if (gen !== loadGeneration.current) return;
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      if (gen === loadGeneration.current) setLoading(false);
    }
  }, []);

  // Reset slider when quick filter changes
  useEffect(() => {
    if (quickFilter === "category") return;
    setCategoryFilter(null);
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
    setCategoryFilter(null);
  }

  function handleCategoryClick(cat: PlaytimeCategoryFilter) {
    if (categoryFilter?.label === cat.label) {
      setCategoryFilter(null);
      setQuickFilter("all");
    } else {
      setCategoryFilter(cat);
      setQuickFilter("category");
    }
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

  function handleToggleCustomGenres(genres: string[], active: boolean) {
    setCustomGenres((prev) => {
      if (active) {
        return prev.filter((g) => !genres.includes(g));
      }
      return [...new Set([...prev, ...genres])];
    });
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
    setSimilarFilter({ appid: game.appid, name: game.name, genres: game.genres, tags: game.tags });
  }

  // Apply all filters
  const filtered = useMemo(() => {
    let result = [...games];

    // Playtime quick filter
    if (quickFilter === "category" && categoryFilter) {
      result = result.filter((g) => {
        if (categoryFilter.min === 0 && categoryFilter.max === 0) return g.playtimeHours === 0;
        if (categoryFilter.max === Infinity) return g.playtimeHours >= categoryFilter.min;
        return g.playtimeHours >= categoryFilter.min && g.playtimeHours < categoryFilter.max;
      });
    } else if (quickFilter === "never") {
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

    // Similar filter — match on all available tags for best results
    if (similarFilter) {
      const allSourceTags = new Set([...similarFilter.genres, ...similarFilter.tags]);

      result = result
        .filter((g) => g.appid !== similarFilter.appid)
        .map((g) => {
          const allGameTags = new Set([...g.genres, ...g.tags]);
          const overlap = [...allSourceTags].filter((t) => allGameTags.has(t)).length;
          return { game: g, overlap };
        })
        .filter((item) => item.overlap >= 2)
        .sort((a, b) => b.overlap - a.overlap)
        .map((item) => item.game);

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
      // Seeded shuffle — stable until user re-selects random
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.abs(((shuffleSeed * 9301 + 49297) % 233280) * (i + 1) % (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }

    return result;
  }, [games, quickFilter, categoryFilter, sliderValue, nameFilter, selectedMoods, customGenres, similarFilter, sortOption, shuffleSeed]);

  const starredGames = useMemo(
    () => games.filter((g) => starredIds.has(g.appid)),
    [games, starredIds],
  );
  const hasGames = games.length > 0;

  return (
    <div className="discovery-page">
      <LibraryInput onSubmit={handleLoad} loading={loading} />

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}

      {hasGames && (
        <>
          <LibraryStats games={games} activeCategory={categoryFilter} onCategoryClick={handleCategoryClick} />
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
            onSortChange={(opt) => {
              setSortOption(opt);
              if (opt === "random") setShuffleSeed(Date.now());
            }}
          />

          <MoodSelector
            selectedMoods={selectedMoods}
            onToggleMood={handleToggleMood}
            customGenres={customGenres}
            onToggleCustomGenre={handleToggleCustomGenre}
            onToggleCustomGenres={handleToggleCustomGenres}
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
