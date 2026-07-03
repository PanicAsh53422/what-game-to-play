export interface LibraryGame {
  appid: number;
  name: string;
  playtimeMinutes: number;
  playtimeHours: number;
  headerImage: string;
  genres: string[];
  categories: string[];
  tags: string[];
  genreLoaded: boolean;
}

export interface MoodPreset {
  label: string;
  emoji: string;
  color: string;
  genres: string[];
}

export type PlaytimeQuickFilter = "all" | "never" | "lt2" | "lt10" | "gt20" | "gt40" | "category";

export interface PlaytimeCategoryFilter {
  label: string;
  min: number;
  max: number;
}

export interface SimilarFilter {
  appid: number;
  name: string;
  genres: string[];
  tags: string[];
}

export type SortOption = "name-asc" | "name-desc" | "playtime-asc" | "playtime-desc" | "random";

export interface GenreCacheEntry {
  genres: string[];
  categories: string[];
  tags: string[];
  headerImage: string;
}

export interface TierListTier {
  id: string;
  name: string;
  color: string;
  gameIds: number[];
}

export interface TierListPlayer {
  nickname: string;
  connected: boolean;
}

export interface TierListSessionState {
  sessionId: string;
  games: LibraryGame[];
  tiers: TierListTier[];
  players: TierListPlayer[];
  connectedPlayers: number;
  updatedAt: number;
}

export const MOOD_PRESETS: MoodPreset[] = [
  { label: "Chill", emoji: "\u{1F9D8}", color: "#27ae60", genres: ["Casual", "Simulation", "Puzzle", "Relaxing"] },
  { label: "Action", emoji: "\u{1F4A5}", color: "#e74c3c", genres: ["Action", "Shooter", "Fighting", "Hack and Slash"] },
  { label: "Story", emoji: "\u{1F4D6}", color: "#9b59b6", genres: ["RPG", "Adventure", "Visual Novel", "Walking Simulator", "Interactive Fiction"] },
  { label: "Competitive", emoji: "\u{1F3C6}", color: "#f39c12", genres: ["Sports", "Racing", "Fighting", "eSports"] },
  { label: "Strategy", emoji: "\u{1F527}", color: "#3498db", genres: ["Strategy", "Tower Defense", "Turn-Based Strategy", "Real Time Strategist", "City Builder", "4X"] },
  { label: "Indie", emoji: "\u{1F3A8}", color: "#e67e22", genres: ["Indie"] },
  { label: "Survival", emoji: "\u{1F525}", color: "#c0392b", genres: ["Survival", "Horror", "Crafting", "Open World Survival Craft"] },
  { label: "MMO", emoji: "\u{1F30D}", color: "#2980b9", genres: ["Massively Multiplayer", "MMORPG"] },
  { label: "Racing", emoji: "\u{1F3CE}\u{FE0F}", color: "#16a085", genres: ["Racing", "Driving"] },
  { label: "Platformer", emoji: "\u{1F3AE}", color: "#8e44ad", genres: ["Platformer", "Action", "2D Platformer", "3D Platformer"] },
];

export const SUB_GENRES: { label: string; genres: string[]; color: string }[] = [
  { label: "Roguelike", genres: ["Rogue-like", "Roguelike", "Action Roguelike", "Rogue-lite", "Roguelite"], color: "#8e44ad" },
  { label: "Metroidvania", genres: ["Metroidvania"], color: "#2c3e50" },
  { label: "Souls-like", genres: ["Souls-like"], color: "#7f8c8d" },
  { label: "Open World", genres: ["Open World", "Open World Survival Craft"], color: "#27ae60" },
  { label: "Sandbox", genres: ["Sandbox"], color: "#f39c12" },
  { label: "Turn-Based", genres: ["Turn-Based", "Turn-Based Strategy", "Turn-Based Combat", "Turn-Based Tactics"], color: "#3498db" },
  { label: "Co-op", genres: ["Co-op", "Online Co-Op", "Local Co-Op"], color: "#e67e22" },
  { label: "Stealth", genres: ["Stealth"], color: "#34495e" },
  { label: "Horror", genres: ["Horror", "Psychological Horror", "Survival Horror"], color: "#c0392b" },
  { label: "Puzzle", genres: ["Puzzle", "Puzzle Platformer"], color: "#1abc9c" },
  { label: "Card Game", genres: ["Card Game", "Card Battler", "Deckbuilding"], color: "#d35400" },
  { label: "City Builder", genres: ["City Builder", "Building"], color: "#16a085" },
  { label: "Bullet Hell", genres: ["Bullet Hell"], color: "#e74c3c" },
  { label: "Point & Click", genres: ["Point & Click"], color: "#8e44ad" },
  { label: "Management", genres: ["Management", "Resource Management"], color: "#2980b9" },
  { label: "Crafting", genres: ["Crafting"], color: "#95a5a6" },
  { label: "Story Rich", genres: ["Story Rich", "Narrative", "Interactive Fiction", "Visual Novel"], color: "#9b59b6" },
  { label: "Exploration", genres: ["Exploration"], color: "#1abc9c" },
  { label: "Pixel Art", genres: ["Pixel Graphics"], color: "#e67e22" },
  { label: "Relaxing", genres: ["Relaxing"], color: "#27ae60" },
];

export const PLAYTIME_CATEGORIES = [
  { label: "Never Played", min: 0, max: 0, color: "#e74c3c" },
  { label: "Barely Touched", min: 0.01, max: 2, color: "#f39c12" },
  { label: "Unfinished", min: 2, max: 10, color: "#3498db" },
  { label: "Moderate", min: 10, max: 40, color: "#2ecc71" },
  { label: "Well Played", min: 40, max: Infinity, color: "#9b59b6" },
] as const;
