import type { SimilarFilter } from "../types/discovery";

interface Props {
  filter: SimilarFilter;
  onClear: () => void;
}

export function SimilarBanner({ filter, onClear }: Props) {
  return (
    <div className="similar-banner">
      <span>
        Similar to: <strong>{filter.name}</strong>
        <span className="similar-genres">
          {" "}({filter.genres.join(", ")})
        </span>
      </span>
      <button className="btn-clear-similar" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
