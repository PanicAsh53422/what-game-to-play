import { useState } from "react";

interface Props {
  onCreateSession: () => void;
  onJoinSession: (code: string) => void;
  sessionId: string | null;
  connectedPlayers: number;
  playerSlot: "player1" | "player2" | null;
  sessionError: string | null;
}

export function SessionPanel({
  onCreateSession,
  onJoinSession,
  sessionId,
  connectedPlayers,
  playerSlot,
  sessionError,
}: Props) {
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (sessionId) {
    return (
      <div className="session-panel active">
        <div className="session-info">
          <div className="session-code-display">
            <span className="session-label">Session Code:</span>
            <span className="session-code">{sessionId}</span>
            <button className="btn-secondary btn-small" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="session-status">
            <span className={`status-dot ${connectedPlayers >= 2 ? "connected" : ""}`} />
            {connectedPlayers}/2 players connected
            {playerSlot && <span className="slot-label"> (You are {playerSlot === "player1" ? "Player 1" : "Player 2"})</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-panel">
      <div className="session-actions">
        <button className="btn-primary" onClick={onCreateSession}>
          Create Session
        </button>
        <span className="session-divider">or</span>
        <div className="session-join">
          <input
            type="text"
            placeholder="Enter session code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="btn-primary"
            onClick={() => joinCode && onJoinSession(joinCode)}
            disabled={!joinCode}
          >
            Join
          </button>
        </div>
      </div>
      {sessionError && <div className="session-error">{sessionError}</div>}
    </div>
  );
}
