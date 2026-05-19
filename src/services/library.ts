import type { LibraryGame, GenreCacheEntry } from "../types/discovery";
import { resolveToSteamId, getOwnedGames } from "./steam";
import { readGenreCache, setCachedGenres } from "./genreCache";

export async function loadLibrary(
  apiKey: string,
  steamInput: string,
  familyMemberInputs: string[],
  onProgress: (msg: string) => void,
): Promise<LibraryGame[]> {
  onProgress("Resolving Steam ID...");
  const steamId = await resolveToSteamId(apiKey, steamInput);

  const familyIds: string[] = [];
  for (const input of familyMemberInputs) {
    if (input.trim()) {
      onProgress(`Resolving family member: ${input.trim()}...`);
      familyIds.push(await resolveToSteamId(apiKey, input));
    }
  }

  onProgress("Fetching your game library...");
  const myGames = await getOwnedGames(apiKey, steamId);

  const gameMap = new Map<number, { name: string; playtime: number }>();
  for (const g of myGames) {
    gameMap.set(g.appid, { name: g.name, playtime: g.playtime_forever });
  }

  for (let i = 0; i < familyIds.length; i++) {
    onProgress(`Fetching family member ${i + 1} library...`);
    try {
      const familyGames = await getOwnedGames(apiKey, familyIds[i]);
      for (const g of familyGames) {
        if (!gameMap.has(g.appid)) {
          gameMap.set(g.appid, { name: g.name, playtime: 0 });
        }
      }
    } catch {
      // skip family members with private libraries
    }
  }

  const cache = readGenreCache();
  const games: LibraryGame[] = [];
  for (const [appid, info] of gameMap) {
    const cached = cache[String(appid)];
    games.push({
      appid,
      name: info.name,
      playtimeMinutes: info.playtime,
      playtimeHours: Math.round((info.playtime / 60) * 10) / 10,
      headerImage: cached?.headerImage || "",
      genres: cached?.genres || [],
      categories: cached?.categories || [],
      tags: cached?.tags || [],
      genreLoaded: !!cached,
    });
  }

  games.sort((a, b) => a.name.localeCompare(b.name));
  const familyNote = familyIds.length > 0 ? ` (including ${familyIds.length} family libraries)` : "";
  onProgress(`Loaded ${games.length} games${familyNote}.`);
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
          const [detailsRes, tagsRes] = await Promise.all([
            fetch(`/api/app-details?appids=${appid}`),
            fetch(`/api/app-tags?appid=${appid}`),
          ]);
          const data = await detailsRes.json();
          const appData = data[String(appid)];
          let tags: string[] = [];
          try {
            const tagsData = await tagsRes.json();
            tags = tagsData.tags || [];
          } catch {
            // tags fetch failed, proceed without
          }
          if (appData?.success) {
            const cats = (appData.data.categories || []).map(
              (c: { description: string }) => c.description,
            );
            const gens = (appData.data.genres || []).map(
              (g: { description: string }) => g.description,
            );
            const allGenres = [...new Set([...gens, ...tags])];
            results[appid] = {
              genres: allGenres,
              categories: cats,
              tags,
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
