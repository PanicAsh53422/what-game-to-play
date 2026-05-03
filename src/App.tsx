import { useState } from "react";
import { InputForm } from "./components/InputForm";
import { ResultsList } from "./components/ResultsList";
import { findSharedMultiplayerGames } from "./services/steam";
import type { GameDetails } from "./types/steam";
import "./App.css";

function App() {
  const [results, setResults] = useState<GameDetails[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

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
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>What Game to Play?</h1>
        <p>Find multiplayer games you and your friend can play together on Steam.</p>
      </header>

      <InputForm onSubmit={handleSubmit} loading={loading} />

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}
      {results && <ResultsList games={results} />}
    </div>
  );
}

export default App;
