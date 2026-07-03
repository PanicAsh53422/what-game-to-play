import type { TierListTier } from "../types/discovery";

const TIER_LIST_STORAGE_KEY = "wgtp_tier_list";

export const DEFAULT_TIERS: TierListTier[] = [
  { id: "tier-a", name: "A", color: "#2ecc71", gameIds: [] },
  { id: "tier-b", name: "B", color: "#66c0f4", gameIds: [] },
  { id: "tier-c", name: "C", color: "#f1c40f", gameIds: [] },
  { id: "tier-d", name: "D", color: "#e67e22", gameIds: [] },
  { id: "tier-f", name: "F", color: "#e74c3c", gameIds: [] },
];

function cloneDefaultTiers() {
  return DEFAULT_TIERS.map((tier) => ({ ...tier, gameIds: [] }));
}

function normalizeTiers(value: unknown): TierListTier[] {
  if (!Array.isArray(value)) return cloneDefaultTiers();

  const usedIds = new Set<string>();
  const usedGames = new Set<number>();

  const tiers = value
    .map((tier, index) => {
      if (!tier || typeof tier !== "object") return null;
      const raw = tier as Partial<TierListTier>;
      const fallback = DEFAULT_TIERS[index % DEFAULT_TIERS.length];
      let id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `tier-${Date.now()}-${index}`;
      if (usedIds.has(id)) id = `${id}-${index}`;
      usedIds.add(id);

      const gameIds = Array.isArray(raw.gameIds)
        ? raw.gameIds
            .map((appid) => Number(appid))
            .filter((appid) => Number.isFinite(appid) && !usedGames.has(appid))
        : [];

      gameIds.forEach((appid) => usedGames.add(appid));

      return {
        id,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name : fallback.name,
        color: typeof raw.color === "string" && raw.color.trim() ? raw.color : fallback.color,
        gameIds,
      };
    })
    .filter((tier): tier is TierListTier => Boolean(tier));

  return tiers.length > 0 ? tiers : cloneDefaultTiers();
}

export function loadTierList(): TierListTier[] {
  try {
    const raw = localStorage.getItem(TIER_LIST_STORAGE_KEY);
    if (!raw) return cloneDefaultTiers();
    return normalizeTiers(JSON.parse(raw));
  } catch {
    return cloneDefaultTiers();
  }
}

export function saveTierList(tiers: TierListTier[]) {
  localStorage.setItem(TIER_LIST_STORAGE_KEY, JSON.stringify(normalizeTiers(tiers)));
}

export function createTier(name = "New Tier"): TierListTier {
  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    color: "#8e44ad",
    gameIds: [],
  };
}

export function getDefaultTiers(): TierListTier[] {
  return cloneDefaultTiers();
}
