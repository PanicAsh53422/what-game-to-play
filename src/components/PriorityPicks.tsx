import type { LibraryGame } from "../types/discovery";
import type { GameDetails } from "../types/steam";
import { RandomPicker } from "./RandomPicker";

interface Props {
  games: LibraryGame[];
  onRemove: (appid: number) => void;
  onClearAll: () => void;
}

function toGameDetails(game: LibraryGame): GameDetails {
  return {
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage,
    isMultiplayer: false,
    categories: game.categories,
    genres: game.genres,
    copiesInFamily: 0,
    ownedBy: [],
  };
}

export function PriorityPicks({ games, onRemove, onClearAll }: Props) {
  if (games.length === 0) return null;

  const asDetails = games.map(toGameDetails);

  return (
    <div className="priority-picks">
      <div className="priority-header">
        <div>
          <h2 className="priority-title">
            Priority Picks <span className="priority-count">({games.length} selected)</span>
          </h2>
          <p className="priority-hint">Star games you're considering, then randomize from your picks</p>
        </div>
        <div className="priority-actions">
          <button className="btn-clear" onClick={onClearAll}>
            Clear All
          </button>
        </div>
      </div>
      <RandomPicker
        games={asDetails}
        label="Pick from Priorities"
      />
      <div className="priority-row">
        {games.map((game) => (
          <div key={game.appid} className="priority-card">
            {game.headerImage && (
              <img
                src={game.headerImage}
                alt={game.name}
                className="priority-thumb"
                loading="lazy"
              />
            )}
            <div className="priority-info">
              <div className="priority-name">{game.name}</div>
              <div className="priority-playtime">{game.playtimeHours}h</div>
            </div>
            <button
              className="priority-remove"
              onClick={() => onRemove(game.appid)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
