import { useState } from "react";
import { MOOD_PRESETS } from "../types/discovery";

interface Props {
  selectedMoods: string[];
  onToggleMood: (moodLabel: string) => void;
  customGenres: string[];
  onToggleCustomGenre: (genre: string) => void;
  allGenres: string[];
  genresLoading: boolean;
}

export function MoodSelector({
  selectedMoods,
  onToggleMood,
  customGenres,
  onToggleCustomGenre,
  allGenres,
  genresLoading,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="mood-selector">
      <div className="mood-header">
        <span className="mood-label">Mood</span>
        {genresLoading && (
          <span className="mood-loading">(loading genres...)</span>
        )}
        {selectedMoods.length > 0 && (
          <span className="mood-active-hint">
            (select multiple)
          </span>
        )}
      </div>
      <div className="mood-buttons">
        {MOOD_PRESETS.map((mood) => {
          const isActive = selectedMoods.includes(mood.label);
          return (
            <button
              key={mood.label}
              className={`btn-mood ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? { background: mood.color, borderColor: mood.color, color: "#fff" }
                  : { borderColor: "#555", color: "#888" }
              }
              onClick={() => onToggleMood(mood.label)}
            >
              {mood.emoji} {mood.label} {isActive && "✓"}
            </button>
          );
        })}
        <button
          className={`btn-mood ${showCustom ? "active" : ""}`}
          style={
            showCustom
              ? { background: "#1abc9c", borderColor: "#1abc9c", color: "#fff" }
              : { borderColor: "#555", color: "#888" }
          }
          onClick={() => setShowCustom(!showCustom)}
        >
          🎭 Custom...
        </button>
      </div>
      {showCustom && (
        <div className="custom-genres">
          {allGenres.map((genre) => (
            <label key={genre} className="genre-checkbox">
              <input
                type="checkbox"
                checked={customGenres.includes(genre)}
                onChange={() => onToggleCustomGenre(genre)}
              />
              {genre}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
