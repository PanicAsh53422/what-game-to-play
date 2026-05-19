import { useState } from "react";
import { MOOD_PRESETS, SUB_GENRES } from "../types/discovery";

interface Props {
  selectedMoods: string[];
  onToggleMood: (moodLabel: string) => void;
  customGenres: string[];
  onToggleCustomGenre: (genre: string) => void;
  onToggleCustomGenres: (genres: string[], active: boolean) => void;
  allGenres: string[];
  genresLoading: boolean;
}

export function MoodSelector({
  selectedMoods,
  onToggleMood,
  customGenres,
  onToggleCustomGenre,
  onToggleCustomGenres,
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
      </div>
      <div className="mood-header" style={{ marginTop: "0.5rem" }}>
        <span className="mood-label">Sub-Genres</span>
      </div>
      <div className="sub-genre-buttons">
        {SUB_GENRES.map((sg) => {
          const isActive = sg.genres.some((g) => customGenres.includes(g));
          return (
            <button
              key={sg.label}
              className={`btn-sub-genre ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? { background: sg.color, borderColor: sg.color, color: "#fff" }
                  : { borderColor: "#555", color: "#888" }
              }
              onClick={() => onToggleCustomGenres(sg.genres, isActive)}
            >
              {sg.label} {isActive && "✓"}
            </button>
          );
        })}
        <button
          className={`btn-sub-genre ${showCustom ? "active" : ""}`}
          style={
            showCustom
              ? { background: "#1abc9c", borderColor: "#1abc9c", color: "#fff" }
              : { borderColor: "#555", color: "#888" }
          }
          onClick={() => setShowCustom(!showCustom)}
        >
          All Genres...
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
