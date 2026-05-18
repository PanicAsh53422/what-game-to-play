import type { LibraryGame } from "../types/discovery";
import { PLAYTIME_CATEGORIES } from "../types/discovery";

interface Props {
  games: LibraryGame[];
}

function countInCategory(games: LibraryGame[], min: number, max: number): number {
  return games.filter((g) => {
    if (min === 0 && max === 0) return g.playtimeHours === 0;
    if (max === Infinity) return g.playtimeHours >= min;
    return g.playtimeHours >= min && g.playtimeHours < max;
  }).length;
}

export function LibraryStats({ games }: Props) {
  return (
    <div className="library-stats">
      <div className="library-stats-title">Your Library: {games.length} games</div>
      <div className="stats-cards">
        {PLAYTIME_CATEGORIES.map((cat) => (
          <div
            key={cat.label}
            className="stat-card"
            style={{
              borderColor: cat.color,
              background: `${cat.color}22`,
            }}
          >
            <div className="stat-count" style={{ color: cat.color }}>
              {countInCategory(games, cat.min, cat.max)}
            </div>
            <div className="stat-label" style={{ color: cat.color }}>
              {cat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
