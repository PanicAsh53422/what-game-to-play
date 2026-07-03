interface Props {
  mode: "together" | "discover" | "tierlist";
  onChangeMode: (mode: "together" | "discover" | "tierlist") => void;
}

export function ModeToggle({ mode, onChangeMode }: Props) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-tab ${mode === "together" ? "active" : ""}`}
        onClick={() => onChangeMode("together")}
      >
        Find Games Together
      </button>
      <button
        className={`mode-tab ${mode === "discover" ? "active" : ""}`}
        onClick={() => onChangeMode("discover")}
      >
        Explore My Library
      </button>
      <button
        className={`mode-tab ${mode === "tierlist" ? "active" : ""}`}
        onClick={() => onChangeMode("tierlist")}
      >
        Tier List
      </button>
    </div>
  );
}
