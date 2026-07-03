import { useState, useCallback } from "react";
import { InputForm } from "./components/InputForm";
import { ResultsList } from "./components/ResultsList";
import { SessionPanel } from "./components/SessionPanel";
import { WantToPlayList } from "./components/WantToPlayList";
import { JoinPanel } from "./components/JoinPanel";
import { ModeToggle } from "./components/ModeToggle";
import { DiscoveryPage } from "./components/DiscoveryPage";
import { TierListPage } from "./components/TierListPage";
import { findSharedMultiplayerGames } from "./services/steam";
import {
  createSession,
  joinSession,
  addGameToWantList,
  removeGameFromWantList,
  voteForGame,
  clearAllPicks,
  triggerRandomPick,
} from "./services/session";
import type { GameDetails, SessionState } from "./types/steam";
import "./App.css";

function App() {
  const [mode, setMode] = useState<"together" | "discover" | "tierlist">("together");
  const [results, setResults] = useState<GameDetails[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  async function handleSubmit(
    apiKey: string,
    players: string[],
    familyMembers: string[],
  ) {
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress("");
    setSession(null);

    try {
      const games = await findSharedMultiplayerGames(
        apiKey,
        players,
        familyMembers,
        setProgress,
      );
      setResults(games);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleSessionState = useCallback((state: SessionState) => {
    setSession(state);
    setSessionError(null);
    if (state.games.length > 0) {
      setResults(state.games);
    }
  }, []);

  function handleCreateSession(nickname: string) {
    if (!results) return;
    setSessionError(null);
    createSession(results, nickname, handleSessionState, setSessionError);
  }

  function handleJoinSession(code: string, nickname: string) {
    setSessionError(null);
    joinSession(code, nickname, handleSessionState, setSessionError);
  }

  const hasResults = results && results.length > 0;
  const inSession = !!session?.sessionId;

  return (
    <div className="app">
      <header>
        <h1>What Game to Play?</h1>
        <p>
          Find multiplayer games you and your friends can play together on
          Steam — or explore your own library.
        </p>
      </header>

      <ModeToggle mode={mode} onChangeMode={setMode} />

      {mode === "discover" ? (
        <DiscoveryPage />
      ) : mode === "tierlist" ? (
        <TierListPage />
      ) : (
        <>
          {!inSession && !hasResults && (
            <>
              <JoinPanel onJoin={handleJoinSession} error={sessionError} />
              <div className="section-divider">
                <span>or search for shared games</span>
              </div>
              <InputForm onSubmit={handleSubmit} loading={loading} />
            </>
          )}

          {!inSession && hasResults && (
            <InputForm onSubmit={handleSubmit} loading={loading} />
          )}

          {progress && <div className="progress">{progress}</div>}
          {error && <div className="error">{error}</div>}

          {hasResults && (
            <SessionPanel
              onCreateSession={handleCreateSession}
              onJoinSession={handleJoinSession}
              sessionId={session?.sessionId ?? null}
              players={session?.players ?? []}
              playerSlot={session?.playerSlot ?? -1}
              sessionError={sessionError}
            />
          )}

          {session && results && (
            <WantToPlayList
              session={session}
              games={results}
              onRemove={removeGameFromWantList}
              onVote={voteForGame}
              onClearAll={clearAllPicks}
              onRandomPick={triggerRandomPick}
              onAdd={addGameToWantList}
            />
          )}

          {results && (
            <ResultsList
              games={results}
              session={session}
              onAddToWantList={session ? addGameToWantList : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
