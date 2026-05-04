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
  const mySlot = session.playerSlot;
  const myWant = session.wantToPlay[mySlot] || [];
  const myGames = games.filter((g) => myWant.includes(g.appid));
  const canAdd = myWant.length < 5;

  const allWanted = [...new Set(session.wantToPlay.flat())];
  const allWantedGames = games.filter((g) => allWanted.includes(g.appid));

  const activePlayers = session.players
    .map((p, i) => (p ? { ...p, slot: i } : null))
    .filter((p) => p !== null);

  function getVoteCount(appid: number): number {
    return session.votes.filter((v) => v.includes(appid)).length;
  }

  const totalPlayers = activePlayers.length;
  const mutualVotes = allWanted.filter(
    (appid) => getVoteCount(appid) >= Math.max(2, totalPlayers)
  );
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
          <h2>Everyone Voted For</h2>
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
              <GameCard
                key={game.appid}
                game={game}
                voteCount={getVoteCount(game.appid)}
                totalPlayers={totalPlayers}
              />
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
              totalPlayers={totalPlayers}
              onVote={() => onVote(game.appid)}
              hasVoted={(session.votes[mySlot] || []).includes(game.appid)}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">You haven't picked any games yet.</p>
      )}

      {activePlayers
        .filter((p) => p.slot !== mySlot)
        .map((p) => {
          const theirWant = session.wantToPlay[p.slot] || [];
          const theirGames = games.filter((g) => theirWant.includes(g.appid));
          return (
            <div key={p.slot}>
              <h2>
                {p.nickname}'s Picks ({theirGames.length})
              </h2>
              {theirGames.length > 0 ? (
                <div className="game-grid">
                  {theirGames.map((game) => (
                    <GameCard
                      key={game.appid}
                      game={game}
                      voteCount={getVoteCount(game.appid)}
                      totalPlayers={totalPlayers}
                      onVote={() => onVote(game.appid)}
                      hasVoted={(session.votes[mySlot] || []).includes(
                        game.appid
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  Waiting for {p.nickname} to pick...
                </p>
              )}
            </div>
          );
        })}
    </div>
  );
}
