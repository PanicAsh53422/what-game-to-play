import type { SteamGame, GameDetails } from "../types/steam";

const MULTIPLAYER_CATEGORY_IDS = [1, 9, 36, 37, 38, 39, 49];

interface SteamCategory {
  id: number;
  description: string;
}

interface SteamGenre {
  id: string;
  description: string;
}

export async function resolveToSteamId(
  apiKey: string,
  input: string
): Promise<string> {
  const trimmed = input.trim();
  if (/^\d{17}$/.test(trimmed)) return trimmed;

  const vanity = trimmed
    .replace(/^https?:\/\/steamcommunity\.com\/id\//, "")
    .replace(/\/$/, "");

  const res = await fetch(
    `/api/resolve-vanity?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(vanity)}`
  );
  const data = await res.json();

  if (data?.response?.success !== 1) {
    throw new Error(`Could not resolve "${input}" to a Steam ID`);
  }
  return data.response.steamid;
}

export async function getPlayerNames(
  apiKey: string,
  steamIds: string[]
): Promise<Map<string, string>> {
  const res = await fetch(
    `/api/player-summaries?key=${encodeURIComponent(apiKey)}&steamids=${steamIds.join(",")}`
  );
  const data = await res.json();
  const map = new Map<string, string>();
  const players = data?.response?.players || [];
  for (const p of players) {
    map.set(p.steamid, p.personaname);
  }
  return map;
}

export async function getOwnedGames(
  apiKey: string,
  steamId: string
): Promise<SteamGame[]> {
  const res = await fetch(
    `/api/owned-games?key=${encodeURIComponent(apiKey)}&steamid=${encodeURIComponent(steamId)}`
  );
  const data = await res.json();

  if (!data.response?.games) {
    throw new Error(
      `No games found for Steam ID ${steamId}. Make sure the profile's game list is public.`
    );
  }
  return data.response.games;
}

async function getAppDetails(
  appid: number
): Promise<{
  isMultiplayer: boolean;
  categories: string[];
  genres: string[];
  headerImage: string;
} | null> {
  try {
    const res = await fetch(`/api/app-details?appids=${appid}`);
    const data = await res.json();

    const appData = data[String(appid)];
    if (!appData?.success) return null;

    const categories: SteamCategory[] = appData.data.categories || [];
    const genres: SteamGenre[] = appData.data.genres || [];
    const categoryNames = categories.map((c) => c.description);
    const genreNames = genres.map((g) => g.description);
    const isMultiplayer = categories.some((c) =>
      MULTIPLAYER_CATEGORY_IDS.includes(c.id)
    );

    return {
      isMultiplayer,
      categories: categoryNames,
      genres: genreNames,
      headerImage: appData.data.header_image || "",
    };
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findSharedMultiplayerGames(
  apiKey: string,
  playerInputs: string[],
  familyMemberInputs: string[],
  onProgress: (msg: string) => void
): Promise<GameDetails[]> {
  const playerCount = playerInputs.length;
  onProgress("Resolving Steam IDs...");

  const allInputs = [...playerInputs, ...familyMemberInputs];
  const steamIds = await Promise.all(
    allInputs.map((input) => resolveToSteamId(apiKey, input))
  );

  onProgress("Fetching Steam profile names...");
  const nameMap = await getPlayerNames(apiKey, steamIds);

  onProgress("Fetching game libraries...");

  const allLibraries = await Promise.all(
    steamIds.map((id) => getOwnedGames(apiKey, id))
  );

  const gameNameMap = new Map<number, string>();
  for (const lib of allLibraries) {
    for (const game of lib) {
      gameNameMap.set(game.appid, game.name);
    }
  }

  const copiesCount = new Map<number, number>();
  const ownedByMap = new Map<number, string[]>();

  for (let i = 0; i < allLibraries.length; i++) {
    const steamId = steamIds[i];
    const label =
      nameMap.get(steamId) ||
      (i < playerCount
        ? `Player ${i + 1}`
        : `Family Member ${i - playerCount + 1}`);

    for (const game of allLibraries[i]) {
      copiesCount.set(game.appid, (copiesCount.get(game.appid) || 0) + 1);
      const owners = ownedByMap.get(game.appid) || [];
      owners.push(label);
      ownedByMap.set(game.appid, owners);
    }
  }

  const candidateAppIds: number[] = [];
  for (const [appid, copies] of copiesCount) {
    if (copies >= playerCount) {
      candidateAppIds.push(appid);
    }
  }

  onProgress(
    `Found ${candidateAppIds.length} games with ${playerCount}+ copies. Checking which are multiplayer...`
  );

  const results: GameDetails[] = [];
  const batchSize = 5;

  for (let i = 0; i < candidateAppIds.length; i += batchSize) {
    const batch = candidateAppIds.slice(i, i + batchSize);
    const details = await Promise.all(batch.map((id) => getAppDetails(id)));

    for (let j = 0; j < batch.length; j++) {
      const appid = batch[j];
      const detail = details[j];

      if (detail?.isMultiplayer) {
        results.push({
          appid,
          name: gameNameMap.get(appid) || `App ${appid}`,
          headerImage: detail.headerImage,
          isMultiplayer: true,
          categories: detail.categories,
          genres: detail.genres,
          copiesInFamily: copiesCount.get(appid) || 0,
          ownedBy: ownedByMap.get(appid) || [],
        });
      }
    }

    const checked = Math.min(i + batchSize, candidateAppIds.length);
    onProgress(
      `Checked ${checked}/${candidateAppIds.length} games... (${results.length} multiplayer found)`
    );

    if (i + batchSize < candidateAppIds.length) {
      await delay(300);
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export function getSteamStoreUrl(appid: number): string {
  return `https://store.steampowered.com/app/${appid}`;
}
