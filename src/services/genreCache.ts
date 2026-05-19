import type { GenreCacheEntry } from "../types/discovery";

const CACHE_KEY = "genre-cache-v3";

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
