import { useState, useCallback, useEffect, useRef } from "react";
import type { GameDetails, RandomPick } from "../types/steam";
import { GameCard } from "./GameCard";

interface Props {
  games: GameDetails[];
  label: string;
  source?: string;
  syncedPick?: RandomPick | null;
  onSyncedPick?: (source: string, appids: number[]) => void;
  onAddToPicks?: (appid: number) => void;
  canAdd?: boolean;
  wantList?: number[];
}

export function RandomPicker({
  games,
  label,
  source,
  syncedPick,
  onSyncedPick,
  onAddToPicks,
  canAdd,
  wantList,
}: Props) {
  const [displayedGame, setDisplayedGame] = useState<GameDetails | null>(null);
  const [spinning, setSpinning] = useState(false);
  const lastTimestamp = useRef<number>(0);
  const isSynced = !!source && !!onSyncedPick;

  useEffect(() => {
    if (!isSynced || !syncedPick) return;
    if (syncedPick.source !== source) return;
    if (syncedPick.timestamp <= lastTimestamp.current) return;

    lastTimestamp.current = syncedPick.timestamp;
    const target = games.find((g) => g.appid === syncedPick.appid);
    if (!target) return;

    setSpinning(true);
    let ticks = 0;
    const totalTicks = 12;
    const interval = setInterval(() => {
      const rand = games[Math.floor(Math.random() * games.length)];
      setDisplayedGame(rand);
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(interval);
        setDisplayedGame(target);
        setSpinning(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [syncedPick, source, games, isSynced]);

  const pickLocal = useCallback(() => {
    if (games.length === 0) return;
    setSpinning(true);
    setDisplayedGame(null);

    let ticks = 0;
    const totalTicks = 12;
    const interval = setInterval(() => {
      const rand = games[Math.floor(Math.random() * games.length)];
      setDisplayedGame(rand);
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 100);
  }, [games]);

  function handleClick() {
    if (isSynced) {
      onSyncedPick(source, games.map((g) => g.appid));
    } else {
      pickLocal();
    }
  }

  if (games.length === 0) return null;

  const alreadyInList = displayedGame && wantList?.includes(displayedGame.appid);

  return (
    <div className="random-picker">
      <button
        className="btn-random"
        onClick={handleClick}
        disabled={spinning}
      >
        {spinning ? "Picking..." : label}
      </button>
      {displayedGame && (
        <div className={`random-result ${spinning ? "spinning" : "landed"}`}>
          <GameCard game={displayedGame} />
          {!spinning && onAddToPicks && canAdd && !alreadyInList && (
            <button
              className="btn-want random-add"
              onClick={() => onAddToPicks(displayedGame.appid)}
            >
              + Add to Picks
            </button>
          )}
          {!spinning && alreadyInList && (
            <span className="random-already">Already in your picks</span>
          )}
        </div>
      )}
    </div>
  );
}
