import type { GameDetails } from "../types/steam";
import { getSteamStoreUrl } from "../services/steam";

interface Props {
  game: GameDetails;
  onAdd?: () => void;
  onRemove?: () => void;
  isInWantList?: boolean;
  canAdd?: boolean;
  voteCount?: number;
  totalPlayers?: number;
  onVote?: () => void;
  hasVoted?: boolean;
}

export function GameCard({
  game,
  onAdd,
  onRemove,
  isInWantList,
  canAdd,
  voteCount,
  totalPlayers,
  onVote,
  hasVoted,
}: Props) {
  const allVoted =
    voteCount !== undefined &&
    totalPlayers !== undefined &&
    voteCount >= totalPlayers &&
    totalPlayers >= 2;

  return (
    <div
      className={`game-card ${isInWantList ? "in-want-list" : ""} ${allVoted ? "mutual-vote" : ""}`}
    >
      <a
        href={getSteamStoreUrl(game.appid)}
        target="_blank"
        rel="noreferrer"
        className="game-card-link"
      >
        <img
          src={game.headerImage}
          alt={game.name}
          className="game-image"
          loading="lazy"
        />
      </a>
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
          {game.genres.map((g) => (
            <span key={g} className="tag tag-genre">
              {g}
            </span>
          ))}
        </div>
        <div className="game-meta">
          <span className="copies">
            {game.copiesInFamily}{" "}
            {game.copiesInFamily === 1 ? "copy" : "copies"} in family
          </span>
          <span className="owners">Owned by: {game.ownedBy.join(", ")}</span>
        </div>
        <div className="game-actions">
          {onAdd && canAdd && !isInWantList && (
            <button
              className="btn-want"
              onClick={(e) => {
                e.preventDefault();
                onAdd();
              }}
            >
              + Want to Play
            </button>
          )}
          {onRemove && isInWantList && (
            <button
              className="btn-remove-want"
              onClick={(e) => {
                e.preventDefault();
                onRemove();
              }}
            >
              Remove
            </button>
          )}
          {onVote !== undefined && (
            <button
              className={`btn-vote ${hasVoted ? "voted" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                onVote();
              }}
            >
              {hasVoted ? "Voted!" : "Vote"}{" "}
              {voteCount ? `(${voteCount})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
