import type { SavedConfig } from "../types/steam";

const STORAGE_KEY = "wgtp_config";

export function loadConfig(): SavedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { apiKey: "", player1: "", player2: "", familyMembers: [] };
    return JSON.parse(raw);
  } catch {
    return { apiKey: "", player1: "", player2: "", familyMembers: [] };
  }
}

export function saveConfig(config: SavedConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
