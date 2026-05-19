import type { LibraryGame, PlaytimeCategoryFilter } from "../types/discovery";
import { PLAYTIME_CATEGORIES } from "../types/discovery";

interface Props {
  games: LibraryGame[];
  activeCategory: PlaytimeCategoryFilter | null;
  onCategoryClick: (cat: PlaytimeCategoryFilter) => void;
}

function countInCategory(games: LibraryGame[], min: number, max: number): number {
  return games.filter((g) => {
    if (min === 0 && max === 0) return g.playtimeHours === 0;
    if (max === Infinity) return g.playtimeHours >= min;
    return g.playtimeHours >= min && g.playtimeHours < max;
  }).length;
}

export function LibraryStats({ games, activeCategory, onCategoryClick }: Props) {
  return (
    <div className="library-stats">
      <div className="library-stats-title">Your Library: {games.length} games</div>
      <div className="stats-cards">
        {PLAYTIME_CATEGORIES.map((cat) => {
          const isActive = activeCategory?.label === cat.label;
          return (
            <button
              key={cat.label}
              className={`stat-card ${isActive ? "stat-card-active" : ""}`}
              style={{
                borderColor: cat.color,
                background: isActive ? `${cat.color}55` : `${cat.color}22`,
              }}
              onClick={() => onCategoryClick({ label: cat.label, min: cat.min, max: cat.max })}
            >
              <div className="stat-count" style={{ color: cat.color }}>
                {countInCategory(games, cat.min, cat.max)}
              </div>
              <div className="stat-label" style={{ color: cat.color }}>
                {cat.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
