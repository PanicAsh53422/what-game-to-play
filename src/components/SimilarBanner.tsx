import type { SimilarFilter } from "../types/discovery";

interface Props {
  filter: SimilarFilter;
  onClear: () => void;
}

export function SimilarBanner({ filter, onClear }: Props) {
  const allTags = [...new Set([...filter.genres, ...filter.tags])];
  const displayTags = allTags.slice(0, 10);
  return (
    <div className="similar-banner">
      <span>
        Similar to: <strong>{filter.name}</strong>
        <span className="similar-genres">
          {" "}({displayTags.join(", ")}{allTags.length > 10 ? `, +${allTags.length - 10} more` : ""})
        </span>
      </span>
      <button className="btn-clear-similar" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
