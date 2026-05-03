import type { GameDetails, SessionState } from "../types/steam";
import { GameCard } from "./GameCard";
import { RandomPicker } from "./RandomPicker";

interface Props {
  session: SessionState;
  games: GameDetails[];
  onRemove: (appid: number) => void;
  onVote: (appid: number) => void;
  onClearAll: () => void;
  onRandomPick: (source: string, appids: number[]) => void;
  onAdd: (appid: number) => void;
}

export function WantToPlayList({
  session,
  games,
  onRemove,
  onVote,
  onClearAll,
  onRandomPick,
  onAdd,
}: Props) {
  const myWant = session.wantToPlay[session.playerSlot];
  const otherSlot = session.playerSlot === "player1" ? "player2" : "player1";
  const otherWant = session.wantToPlay[otherSlot];

  const allWanted = [...new Set([...myWant, ...otherWant])];
  const allWantedGames = games.filter((g) => allWanted.includes(g.appid));
  const myGames = games.filter((g) => myWant.includes(g.appid));
  const canAdd = myWant.length < 5;

  function getVoteCount(appid: number): number {
    let count = 0;
    if (session.votes.player1.includes(appid)) count++;
    if (session.votes.player2.includes(appid)) count++;
    return count;
  }

  const mutualVotes = allWanted.filter((appid) => getVoteCount(appid) >= 2);
  const mutualGames = games.filter((g) => mutualVotes.includes(g.appid));

  if (allWanted.length === 0) {
    return (
      <div className="want-to-play">
        <h2>Want to Play</h2>
        <p className="empty-state">
          No games added yet. Browse the results below and click "+ Want to
          Play" to add up to 5 games each.
        </p>
      </div>
    );
  }

  return (
    <div className="want-to-play">
      {mutualGames.length > 0 && (
        <div className="mutual-section">
          <h2>Both Voted For</h2>
          <RandomPicker
            games={mutualGames}
            label="Pick Random from Mutual Votes"
            source="mutualVotes"
            syncedPick={session.randomPick}
            onSyncedPick={onRandomPick}
            onAddToPicks={onAdd}
            canAdd={canAdd}
            wantList={myWant}
          />
          <div className="game-grid">
            {mutualGames.map((game) => (
              <GameCard key={game.appid} game={game} voteCount={2} />
            ))}
          </div>
        </div>
      )}

      {allWantedGames.length > 1 && (
        <RandomPicker
          games={allWantedGames}
          label="Pick Random from All Picks"
          source="allPicks"
          syncedPick={session.randomPick}
          onSyncedPick={onRandomPick}
          onAddToPicks={onAdd}
          canAdd={canAdd}
          wantList={myWant}
        />
      )}

      <div className="picks-header">
        <h2>Your Picks ({myGames.length}/5)</h2>
        {myGames.length > 0 && (
          <button className="btn-clear" onClick={onClearAll}>
            Clear All
          </button>
        )}
      </div>
      {myGames.length > 0 ? (
        <div className="game-grid">
          {myGames.map((game) => (
            <GameCard
              key={game.appid}
              game={game}
              isInWantList
              onRemove={() => onRemove(game.appid)}
              voteCount={getVoteCount(game.appid)}
              onVote={() => onVote(game.appid)}
              hasVoted={session.votes[session.playerSlot].includes(game.appid)}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">You haven't picked any games yet.</p>
      )}

      <h2>
        {session.playerSlot === "player1" ? "Player 2" : "Player 1"}'s Picks (
        {otherWant.length})
      </h2>
      {otherWant.length > 0 ? (
        <div className="game-grid">
          {games
            .filter((g) => otherWant.includes(g.appid))
            .map((game) => (
              <GameCard
                key={game.appid}
                game={game}
                voteCount={getVoteCount(game.appid)}
                onVote={() => onVote(game.appid)}
                hasVoted={session.votes[session.playerSlot].includes(
                  game.appid
                )}
              />
            ))}
        </div>
      ) : (
        <p className="empty-state">Waiting for the other player to pick...</p>
      )}
    </div>
  );
}
