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
