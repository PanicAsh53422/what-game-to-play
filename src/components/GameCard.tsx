import type { GameDetails } from "../types/steam";
import { getSteamStoreUrl } from "../services/steam";

interface Props {
  game: GameDetails;
}

export function GameCard({ game }: Props) {
  return (
    <a
      href={getSteamStoreUrl(game.appid)}
      target="_blank"
      rel="noreferrer"
      className="game-card"
    >
      <img
        src={game.headerImage}
        alt={game.name}
        className="game-image"
        loading="lazy"
      />
      <div className="game-info">
        <h3>{game.name}</h3>
        <div className="game-tags">
          {game.categories
            .filter((c) =>
              [
                "Multi-player",
                "Co-op",
                "Online Multi-Player",
                "Local Multi-Player",
                "Online Co-op",
                "Local Co-op",
                "MMO",
              ].includes(c)
            )
            .map((c) => (
              <span key={c} className="tag">
                {c}
              </span>
            ))}
        </div>
        <div className="game-meta">
          <span className="copies">
            {game.copiesInFamily} {game.copiesInFamily === 1 ? "copy" : "copies"} in family
          </span>
          <span className="owners">Owned by: {game.ownedBy.join(", ")}</span>
        </div>
      </div>
    </a>
  );
}
