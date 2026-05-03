import { useState, useCallback } from "react";
import type { GameDetails } from "../types/steam";
import { GameCard } from "./GameCard";

interface Props {
  games: GameDetails[];
  label: string;
  onAddToPicks?: (appid: number) => void;
  canAdd?: boolean;
  wantList?: number[];
}

export function RandomPicker({ games, label, onAddToPicks, canAdd, wantList }: Props) {
  const [picked, setPicked] = useState<GameDetails | null>(null);
  const [spinning, setSpinning] = useState(false);

  const pickRandom = useCallback(() => {
    if (games.length === 0) return;

    setSpinning(true);
    setPicked(null);

    let ticks = 0;
    const totalTicks = 12;
    const interval = setInterval(() => {
      const rand = games[Math.floor(Math.random() * games.length)];
      setPicked(rand);
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 100);
  }, [games]);

  if (games.length === 0) return null;

  const alreadyInList = picked && wantList?.includes(picked.appid);

  return (
    <div className="random-picker">
      <button
        className="btn-random"
        onClick={pickRandom}
        disabled={spinning}
      >
        {spinning ? "Picking..." : label}
      </button>
      {picked && (
        <div className={`random-result ${spinning ? "spinning" : "landed"}`}>
          <GameCard game={picked} />
          {!spinning && onAddToPicks && canAdd && !alreadyInList && (
            <button
              className="btn-want random-add"
              onClick={() => onAddToPicks(picked.appid)}
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
