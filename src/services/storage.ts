import type { SavedConfig } from "../types/steam";

const STORAGE_KEY = "wgtp_config";

const DEFAULT: SavedConfig = { apiKey: "", players: ["", ""], familyMembers: [] };

export function loadConfig(): SavedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    if (parsed.player1 !== undefined) {
      return {
        apiKey: parsed.apiKey || "",
        players: [parsed.player1 || "", parsed.player2 || ""],
        familyMembers: parsed.familyMembers || [],
      };
    }
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

export function saveConfig(config: SavedConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
