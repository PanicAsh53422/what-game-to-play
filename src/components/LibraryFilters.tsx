import type { PlaytimeQuickFilter, SortOption } from "../types/discovery";

interface Props {
  quickFilter: PlaytimeQuickFilter;
  onQuickFilter: (filter: PlaytimeQuickFilter) => void;
  sliderValue: number;
  sliderMax: number;
  onSliderChange: (value: number) => void;
  nameFilter: string;
  onNameFilter: (value: string) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

const QUICK_FILTERS: { value: PlaytimeQuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "never", label: "Never Played" },
  { value: "lt2", label: "<2 hrs" },
  { value: "lt10", label: "<10 hrs" },
  { value: "gt20", label: "20+ hrs" },
  { value: "gt40", label: "40+ hrs" },
];

export function LibraryFilters({
  quickFilter,
  onQuickFilter,
  sliderValue,
  sliderMax,
  onSliderChange,
  nameFilter,
  onNameFilter,
  sortOption,
  onSortChange,
}: Props) {
  return (
    <div className="library-filters">
      <div className="filters-row">
        <div className="quick-filters">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn-chip ${quickFilter === f.value ? "active" : ""}`}
              onClick={() => onQuickFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="slider-wrap">
          <span className="slider-label">0h</span>
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            className="playtime-slider"
          />
          <span className="slider-label">{sliderMax}h+</span>
        </div>
      </div>
      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by name..."
          value={nameFilter}
          onChange={(e) => onNameFilter(e.target.value)}
          className="filter-input"
        />
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="filter-select"
        >
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="playtime-asc">Playtime: Low to High</option>
          <option value="playtime-desc">Playtime: High to Low</option>
          <option value="random">Random Shuffle</option>
        </select>
      </div>
    </div>
  );
}
