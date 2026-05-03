import { useState } from "react";
import type { GameDetails } from "../types/steam";
import { GameCard } from "./GameCard";

interface Props {
  games: GameDetails[];
}

export function ResultsList({ games }: Props) {
  const [filter, setFilter] = useState("");

  const filtered = games.filter((g) =>
    g.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="results">
      <div className="results-header">
        <h2>
          {games.length} Multiplayer {games.length === 1 ? "Game" : "Games"} You
          Can Play Together
        </h2>
        {games.length > 0 && (
          <input
            type="text"
            placeholder="Filter games..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-input"
          />
        )}
      </div>
      <div className="game-grid">
        {filtered.map((game) => (
          <GameCard key={game.appid} game={game} />
        ))}
      </div>
      {games.length > 0 && filtered.length === 0 && (
        <p className="no-results">No games match your filter.</p>
      )}
    </div>
  );
}
