import type { LibraryGame } from "../types/discovery";
import type { GameDetails } from "../types/steam";
import { LibraryGameCard } from "./LibraryGameCard";
import { RandomPicker } from "./RandomPicker";

interface Props {
  games: LibraryGame[];
  starredIds: Set<number>;
  onStar: (appid: number) => void;
  onFindSimilar: (appid: number) => void;
  totalCount: number;
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

export function LibraryGrid({
  games,
  starredIds,
  onStar,
  onFindSimilar,
  totalCount,
}: Props) {
  const asDetails = games.map(toGameDetails);

  return (
    <div className="library-grid-section">
      <div className="library-grid-header">
        <p className="results-count">
          Showing {games.length} of {totalCount}
        </p>
        <RandomPicker
          games={asDetails}
          label="Pick from All Results"
        />
      </div>
      <div className="game-grid">
        {games.map((game) => (
          <LibraryGameCard
            key={game.appid}
            game={game}
            isStarred={starredIds.has(game.appid)}
            onStar={onStar}
            onFindSimilar={onFindSimilar}
          />
        ))}
      </div>
      {games.length === 0 && (
        <p className="no-results">No games match your filters.</p>
      )}
    </div>
  );
}
