import { useMemo, useState } from "react";
import type { GameDetails, SessionState } from "../types/steam";
import { GameCard } from "./GameCard";

interface Props {
  games: GameDetails[];
  session: SessionState | null;
  onAddToWantList?: (appid: number) => void;
}

export function ResultsList({ games, session, onAddToWantList }: Props) {
  const [nameFilter, setNameFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      for (const genre of g.genres) set.add(genre);
    }
    return Array.from(set).sort();
  }, [games]);

  const filtered = games.filter((g) => {
    if (nameFilter && !g.name.toLowerCase().includes(nameFilter.toLowerCase())) {
      return false;
    }
    if (genreFilter && !g.genres.includes(genreFilter)) {
      return false;
    }
    return true;
  });

  const myWantList = session
    ? session.wantToPlay[session.playerSlot]
    : [];
  const canAdd = myWantList.length < 5;

  return (
    <div className="results">
      <div className="results-header">
        <h2>
          {games.length} Multiplayer {games.length === 1 ? "Game" : "Games"} You
          Can Play Together
        </h2>
        <div className="results-filters">
          <input
            type="text"
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="filter-input"
          />
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Genres</option>
            {allGenres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length > 0 && (
        <p className="results-count">
          Showing {filtered.length} of {games.length}
        </p>
      )}
      <div className="game-grid">
        {filtered.map((game) => (
          <GameCard
            key={game.appid}
            game={game}
            isInWantList={myWantList.includes(game.appid)}
            canAdd={canAdd}
            onAdd={
              session && onAddToWantList
                ? () => onAddToWantList(game.appid)
                : undefined
            }
          />
        ))}
      </div>
      {games.length > 0 && filtered.length === 0 && (
        <p className="no-results">No games match your filters.</p>
      )}
    </div>
  );
}
