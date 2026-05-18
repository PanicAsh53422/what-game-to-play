import type { LibraryGame } from "../types/discovery";
import { getSteamStoreUrl } from "../services/steam";

interface Props {
  game: LibraryGame;
  isStarred: boolean;
  onStar: (appid: number) => void;
  onFindSimilar?: (appid: number) => void;
}

function playtimeColor(hours: number): string {
  if (hours === 0) return "#e74c3c";
  if (hours < 2) return "#f39c12";
  if (hours < 10) return "#3498db";
  if (hours < 40) return "#2ecc71";
  return "#9b59b6";
}

export function LibraryGameCard({ game, isStarred, onStar, onFindSimilar }: Props) {
  return (
    <div className={`game-card library-card ${isStarred ? "starred" : ""}`}>
      <div className="library-card-img-wrap">
        <a
          href={getSteamStoreUrl(game.appid)}
          target="_blank"
          rel="noreferrer"
          className="game-card-link"
        >
          {game.headerImage ? (
            <img
              src={game.headerImage}
              alt={game.name}
              className="game-image"
              loading="lazy"
            />
          ) : (
            <div className="game-image-placeholder" />
          )}
        </a>
        <button
          className={`btn-star ${isStarred ? "active" : ""}`}
          onClick={() => onStar(game.appid)}
          title={isStarred ? "Remove from priorities" : "Add to priorities"}
        >
          {isStarred ? "⭐" : "☆"}
        </button>
      </div>
      <div className="game-info">
        <h3>{game.name}</h3>
        <div
          className="playtime-display"
          style={{ color: playtimeColor(game.playtimeHours) }}
        >
          {game.playtimeHours} hours played
        </div>
        <div className="game-tags">
          {game.genreLoaded ? (
            game.genres.map((g) => (
              <span key={g} className="tag tag-genre">
                {g}
              </span>
            ))
          ) : (
            <span className="tag tag-loading">Loading...</span>
          )}
        </div>
        {game.genreLoaded && onFindSimilar && (
          <div className="game-actions">
            <button
              className="btn-secondary btn-small"
              onClick={() => onFindSimilar(game.appid)}
            >
              Find Similar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
