import { useState, useCallback } from "react";
import { InputForm } from "./components/InputForm";
import { ResultsList } from "./components/ResultsList";
import { SessionPanel } from "./components/SessionPanel";
import { WantToPlayList } from "./components/WantToPlayList";
import { findSharedMultiplayerGames } from "./services/steam";
import {
  createSession,
  joinSession,
  addGameToWantList,
  removeGameFromWantList,
  voteForGame,
} from "./services/session";
import type { GameDetails, SessionState } from "./types/steam";
import "./App.css";

function App() {
  const [results, setResults] = useState<GameDetails[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  async function handleSubmit(
    apiKey: string,
    player1: string,
    player2: string,
    familyMembers: string[]
  ) {
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress("");
    setSession(null);

    try {
      const games = await findSharedMultiplayerGames(
        apiKey,
        player1,
        player2,
        familyMembers,
        setProgress
      );
      setResults(games);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
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

  function handleCreateSession() {
    if (!results) return;
    setSessionError(null);
    createSession(results, handleSessionState, setSessionError);
  }

  function handleJoinSession(code: string) {
    setSessionError(null);
    joinSession(code, handleSessionState, setSessionError);
  }

  return (
    <div className="app">
      <header>
        <h1>What Game to Play?</h1>
        <p>
          Find multiplayer games you and your friend can play together on Steam.
        </p>
      </header>

      {!session?.games.length && (
        <InputForm onSubmit={handleSubmit} loading={loading} />
      )}

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}

      {results && results.length > 0 && (
        <SessionPanel
          onCreateSession={handleCreateSession}
          onJoinSession={handleJoinSession}
          sessionId={session?.sessionId ?? null}
          connectedPlayers={session?.connectedPlayers ?? 0}
          playerSlot={session?.playerSlot ?? null}
          sessionError={sessionError}
        />
      )}

      {session && results && (
        <WantToPlayList
          session={session}
          games={results}
          onRemove={removeGameFromWantList}
          onVote={voteForGame}
        />
      )}

      {results && (
        <ResultsList
          games={results}
          session={session}
          onAddToWantList={session ? addGameToWantList : undefined}
        />
      )}
    </div>
  );
}

export default App;
