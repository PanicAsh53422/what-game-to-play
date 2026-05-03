import { useState } from "react";

interface Props {
  onJoin: (code: string) => void;
  error: string | null;
}

export function JoinPanel({ onJoin, error }: Props) {
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) onJoin(code.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="join-panel">
      <h2>Join a Session</h2>
      <p>Have a session code? Jump straight in — no API key needed.</p>
      <div className="join-row">
        <input
          type="text"
          placeholder="Enter 6-character code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="join-input"
        />
        <button type="submit" className="btn-primary" disabled={code.length < 6}>
          Join Session
        </button>
      </div>
      {error && <div className="session-error">{error}</div>}
    </form>
  );
}
