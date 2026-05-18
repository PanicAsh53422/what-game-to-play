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
