import { useState } from "react";
import type { SessionPlayer } from "../types/steam";

interface Props {
  onCreateSession: (nickname: string) => void;
  onJoinSession: (code: string, nickname: string) => void;
  sessionId: string | null;
  players: (SessionPlayer | null)[];
  playerSlot: number;
  sessionError: string | null;
}

export function SessionPanel({
  onCreateSession,
  onJoinSession,
  sessionId,
  players,
  playerSlot,
  sessionError,
}: Props) {
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (sessionId) {
    const connected = players.filter((p) => p !== null).length;
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
            <span
              className={`status-dot ${connected >= 2 ? "connected" : ""}`}
            />
            {connected}/4 players
          </div>
        </div>
        <div className="session-players">
          {players.map((p, i) =>
            p ? (
              <span
                key={i}
                className={`player-badge ${i === playerSlot ? "you" : ""}`}
              >
                {p.nickname}
                {i === playerSlot && " (you)"}
              </span>
            ) : null
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="session-panel">
      <div className="session-actions">
        <div className="session-create">
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="nickname-input"
          />
          <button
            className="btn-primary"
            onClick={() => onCreateSession(nickname.trim())}
          >
            Create Session
          </button>
        </div>
        <span className="session-divider">or</span>
        <div className="session-join">
          <input
            type="text"
            placeholder="Session code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="nickname-input"
          />
          <button
            className="btn-primary"
            onClick={() =>
              joinCode && onJoinSession(joinCode, nickname.trim())
            }
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
