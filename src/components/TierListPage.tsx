import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type {
  GenreCacheEntry,
  LibraryGame,
  TierListPlayer,
  TierListSessionState,
  TierListTier,
} from "../types/discovery";
import { fetchGenresBatch, loadLibrary } from "../services/library";
import {
  createTier,
  getDefaultTiers,
  loadTierList,
  saveTierList,
} from "../services/tierListStorage";
import {
  createTierListSession,
  joinTierListSession,
  leaveTierListSession,
  updateTierListGames,
  updateTierListSession,
} from "../services/tierListSession";
import { getSteamStoreUrl } from "../services/steam";
import { LibraryInput } from "./LibraryInput";

function removeGameFromAllTiers(tiers: TierListTier[], appid: number) {
  return tiers.map((tier) => ({
    ...tier,
    gameIds: tier.gameIds.filter((id) => id !== appid),
  }));
}

function compactGameName(name: string) {
  return name.length > 42 ? `${name.slice(0, 39)}...` : name;
}

interface TierGameProps {
  game: LibraryGame;
  onDragStart: (appid: number) => void;
  onUnrank?: (appid: number) => void;
}

function TierGameCard({ game, onDragStart, onUnrank }: TierGameProps) {
  return (
    <article
      className="tier-game-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(game.appid));
        onDragStart(game.appid);
      }}
      title={game.name}
    >
      <a href={getSteamStoreUrl(game.appid)} target="_blank" rel="noreferrer">
        {game.headerImage ? (
          <img src={game.headerImage} alt="" loading="lazy" />
        ) : (
          <div className="tier-game-placeholder" />
        )}
      </a>
      <div className="tier-game-card__body">
        <strong>{compactGameName(game.name)}</strong>
        <span>{game.playtimeHours}h played</span>
      </div>
      {onUnrank && (
        <button type="button" onClick={() => onUnrank(game.appid)}>
          Remove
        </button>
      )}
    </article>
  );
}

interface UnrankedGameProps {
  game: LibraryGame;
  tiers: TierListTier[];
  isSelected: boolean;
  onDragStart: (appid: number) => void;
  onRank: (appid: number, tierId: string) => void;
  onToggleSelected: (appid: number) => void;
}

function UnrankedGameCard({ game, tiers, isSelected, onDragStart, onRank, onToggleSelected }: UnrankedGameProps) {
  return (
    <article
      className={`tier-pool-card ${isSelected ? "selected" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(game.appid));
        onDragStart(game.appid);
      }}
    >
      {game.headerImage ? (
        <img src={game.headerImage} alt="" loading="lazy" />
      ) : (
        <div className="tier-game-placeholder" />
      )}
      <div>
        <strong>{game.name}</strong>
        <span>{game.playtimeHours}h played</span>
      </div>
      <button
        type="button"
        className={`tier-select-game ${isSelected ? "active" : ""}`}
        onClick={() => onToggleSelected(game.appid)}
      >
        {isSelected ? "Selected" : "Select"}
      </button>
      <div className="tier-quick-rank" aria-label={`Rank ${game.name}`}>
        {tiers.slice(0, 6).map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onRank(game.appid, tier.id)}
            style={{ borderColor: tier.color, color: tier.color }}
          >
            {tier.name}
          </button>
        ))}
      </div>
    </article>
  );
}

export function TierListPage() {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [tiers, setTiers] = useState<TierListTier[]>(() => loadTierList());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [genreProgress, setGenreProgress] = useState("");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<number>>(() => new Set());
  const [draggedGameId, setDraggedGameId] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [collabSessionId, setCollabSessionId] = useState<string | null>(null);
  const [collabPlayers, setCollabPlayers] = useState<TierListPlayer[]>([]);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [collabUpdatedAt, setCollabUpdatedAt] = useState<number | null>(null);
  const loadGeneration = useRef(0);
  const collabActiveRef = useRef(false);

  useEffect(() => {
    collabActiveRef.current = Boolean(collabSessionId);
  }, [collabSessionId]);

  function handleCollaborativeState(state: TierListSessionState) {
    setCollabSessionId(state.sessionId);
    setCollabPlayers(state.players);
    setCollabUpdatedAt(state.updatedAt);
    setCollabError(null);
    setGames(state.games);
    setTiers(state.tiers);
  }

  function handleCollaborativeError(message: string) {
    setCollabError(message);
  }

  function commitTiers(updater: TierListTier[] | ((current: TierListTier[]) => TierListTier[])) {
    setTiers((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (collabActiveRef.current) {
        updateTierListSession(next);
      } else {
        saveTierList(next);
      }
      return next;
    });
  }

  const handleLoad = useCallback(async (apiKey: string, steamId: string, familyMembers: string[]) => {
    const gen = ++loadGeneration.current;
      setLoading(true);
    setError(null);
    setProgress("");
    setGenreProgress("");
      setGames([]);
      setSelectedGameIds(new Set());

    try {
      const library = await loadLibrary(apiKey, steamId, familyMembers, setProgress);
      if (gen !== loadGeneration.current) return;
      setGames(library);
      if (collabActiveRef.current) updateTierListGames(library);
      setProgress("");

      const uncached = library.filter((game) => !game.genreLoaded).map((game) => game.appid);
      if (uncached.length > 0) {
        fetchGenresBatch(
          uncached,
          (updated: Record<number, GenreCacheEntry>) => {
            if (gen !== loadGeneration.current) return;
            setGames((previous) =>
              {
                const nextGames = previous.map((game) => {
                const entry = updated[game.appid];
                if (!entry) return game;
                return {
                  ...game,
                  genres: entry.genres,
                  categories: entry.categories,
                  tags: entry.tags || [],
                  headerImage: entry.headerImage || game.headerImage,
                  genreLoaded: true,
                };
                });
                if (collabActiveRef.current) updateTierListGames(nextGames);
                return nextGames;
              },
            );
          },
          (loaded, total) => {
            if (gen !== loadGeneration.current) return;
            setGenreProgress(`Loading artwork and genre data... ${loaded}/${total}`);
            if (loaded >= total) setGenreProgress("");
          },
        );
      }
    } catch (err) {
      if (gen !== loadGeneration.current) return;
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      if (gen === loadGeneration.current) setLoading(false);
    }
  }, []);

  const gameMap = useMemo(() => {
    return new Map(games.map((game) => [game.appid, game]));
  }, [games]);

  const rankedIds = useMemo(() => {
    return new Set(tiers.flatMap((tier) => tier.gameIds));
  }, [tiers]);

  const scopeOptions = useMemo(() => {
    const options = new Set<string>();
    for (const game of games) {
      for (const value of [...game.genres, ...game.tags, ...game.categories]) {
        if (value.trim()) options.add(value);
      }
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [games]);

  const visibleUnrankedGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedGenre = genreFilter.trim().toLowerCase();
    return games
      .filter((game) => !rankedIds.has(game.appid))
      .filter((game) => !selectedOnly || selectedGameIds.has(game.appid))
      .filter((game) => {
        if (!normalizedGenre) return true;
        return [...game.genres, ...game.tags, ...game.categories].some(
          (value) => value.toLowerCase() === normalizedGenre,
        );
      })
      .filter((game) => {
        if (!normalizedSearch) return true;
        return (
          game.name.toLowerCase().includes(normalizedSearch) ||
          game.genres.some((genre) => genre.toLowerCase().includes(normalizedSearch)) ||
          game.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
          game.categories.some((category) => category.toLowerCase().includes(normalizedSearch))
        );
      });
  }, [games, rankedIds, search, genreFilter, selectedOnly, selectedGameIds]);

  const rankedCount = useMemo(() => {
    return tiers.reduce((total, tier) => total + tier.gameIds.length, 0);
  }, [tiers]);

  function rankGame(appid: number, tierId: string) {
    commitTiers((current) =>
      removeGameFromAllTiers(current, appid).map((tier) =>
        tier.id === tierId ? { ...tier, gameIds: [...tier.gameIds, appid] } : tier,
      ),
    );
  }

  function unrankGame(appid: number) {
    commitTiers((current) => removeGameFromAllTiers(current, appid));
  }

  function toggleSelectedGame(appid: number) {
    setSelectedGameIds((current) => {
      const next = new Set(current);
      if (next.has(appid)) next.delete(appid);
      else next.add(appid);
      return next;
    });
  }

  function readDroppedAppId(event: DragEvent) {
    const transferValue = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isFinite(transferValue) && transferValue > 0) return transferValue;
    return draggedGameId;
  }

  function handleTierDrop(event: DragEvent, tierId: string) {
    event.preventDefault();
    const appid = readDroppedAppId(event);
    if (!appid) return;
    rankGame(appid, tierId);
    setDraggedGameId(null);
  }

  function handleUnrankedDrop(event: DragEvent) {
    event.preventDefault();
    const appid = readDroppedAppId(event);
    if (!appid) return;
    unrankGame(appid);
    setDraggedGameId(null);
  }

  function updateTier(tierId: string, patch: Partial<Pick<TierListTier, "name" | "color">>) {
    commitTiers((current) =>
      current.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    );
  }

  function moveTier(tierId: string, direction: -1 | 1) {
    commitTiers((current) => {
      const index = current.findIndex((tier) => tier.id === tierId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function deleteTier(tierId: string) {
    commitTiers((current) => {
      if (current.length <= 1) return current;
      return current.filter((tier) => tier.id !== tierId);
    });
  }

  function startCollaboration() {
    if (games.length === 0) {
      setCollabError("Load a Steam library before creating a collaborative tier list.");
      return;
    }
    createTierListSession(
      games,
      tiers,
      nickname.trim() || "Host",
      handleCollaborativeState,
      handleCollaborativeError,
    );
  }

  function joinCollaboration() {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setCollabError("Enter a tier list session code.");
      return;
    }
    joinTierListSession(
      code,
      nickname.trim() || "Player",
      handleCollaborativeState,
      handleCollaborativeError,
    );
  }

  function leaveCollaboration() {
    leaveTierListSession();
    setCollabSessionId(null);
    setCollabPlayers([]);
    setCollabUpdatedAt(null);
    setCollabError(null);
    setTiers(loadTierList());
  }

  return (
    <div className="tier-list-page">
      <section className="tier-hero">
        <div>
          <p className="tier-kicker">Steam Library Tier List</p>
          <h2>Rank your own games into custom tiers.</h2>
          <p>
            Load your library with the same Steam API key flow, then drag games
            into A/B/C/D/F style rows. Tier names, colors, order, and count are
            editable and saved locally in this browser.
          </p>
        </div>
        <div className="tier-summary">
          <strong>{rankedCount}</strong>
          <span>ranked</span>
          <strong>{games.length}</strong>
          <span>loaded</span>
        </div>
      </section>

      <LibraryInput onSubmit={handleLoad} loading={loading} />

      <section className={`tier-collab-panel ${collabSessionId ? "active" : ""}`}>
        <div>
          <p className="tier-kicker">Collaborative tier list</p>
          <h3>{collabSessionId ? `Session ${collabSessionId}` : "Create or join a shared ranking room"}</h3>
          <p>
            Create a code after loading your library, or join someone else's code.
            Everyone in the room can move games, edit tier names, add rows, and
            see changes live.
          </p>
          {collabSessionId && (
            <div className="tier-collab-players">
              {collabPlayers.map((player, index) => (
                <span key={`${player.nickname}-${index}`}>{player.nickname}</span>
              ))}
            </div>
          )}
          {collabUpdatedAt && (
            <small>Last synced {new Date(collabUpdatedAt).toLocaleTimeString()}</small>
          )}
        </div>

        <div className="tier-collab-controls">
          {!collabSessionId ? (
            <>
              <input
                type="text"
                placeholder="Your nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
              <button type="button" className="btn-primary" onClick={startCollaboration} disabled={games.length === 0}>
                Create Room
              </button>
              <div className="tier-join-row">
                <input
                  type="text"
                  placeholder="Room code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                />
                <button type="button" className="btn-secondary" onClick={joinCollaboration}>
                  Join
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="tier-room-code">
                <span>Share code</span>
                <strong>{collabSessionId}</strong>
              </div>
              <button type="button" className="btn-remove" onClick={leaveCollaboration}>
                Leave Room
              </button>
            </>
          )}
          {collabError && <p className="session-error">{collabError}</p>}
        </div>
      </section>

      {progress && <div className="progress">{progress}</div>}
      {genreProgress && <div className="genre-progress">{genreProgress}</div>}
      {error && <div className="error">{error}</div>}

      {games.length > 0 && (
        <>
          <div className="tier-toolbar">
            <button type="button" className="btn-secondary" onClick={() => commitTiers((current) => [...current, createTier()])}>
              + Add Tier
            </button>
            <button type="button" className="btn-secondary" onClick={() => commitTiers(getDefaultTiers())}>
              Reset to A-F
            </button>
            <button type="button" className="btn-clear" onClick={() => commitTiers((current) => current.map((tier) => ({ ...tier, gameIds: [] })))}>
              Clear Rankings
            </button>
          </div>

          <section className="tier-board" aria-label="Game tier list">
            {tiers.map((tier, index) => {
              const tierGames = tier.gameIds
                .map((appid) => gameMap.get(appid))
                .filter((game): game is LibraryGame => Boolean(game));

              return (
                <div
                  key={tier.id}
                  className="tier-row"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleTierDrop(event, tier.id)}
                >
                  <div className="tier-label" style={{ borderColor: tier.color }}>
                    <input
                      value={tier.name}
                      onChange={(event) => updateTier(tier.id, { name: event.target.value })}
                      aria-label="Tier name"
                    />
                    <input
                      type="color"
                      value={tier.color}
                      onChange={(event) => updateTier(tier.id, { color: event.target.value })}
                      aria-label={`${tier.name} tier color`}
                    />
                    <div className="tier-row-actions">
                      <button type="button" onClick={() => moveTier(tier.id, -1)} disabled={index === 0}>
                        ↑
                      </button>
                      <button type="button" onClick={() => moveTier(tier.id, 1)} disabled={index === tiers.length - 1}>
                        ↓
                      </button>
                      <button type="button" onClick={() => deleteTier(tier.id)} disabled={tiers.length <= 1}>
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="tier-dropzone">
                    {tierGames.map((game) => (
                      <TierGameCard
                        key={game.appid}
                        game={game}
                        onDragStart={setDraggedGameId}
                        onUnrank={unrankGame}
                      />
                    ))}
                    {tierGames.length === 0 && (
                      <div className="tier-empty">Drop games here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <section
            className="tier-pool"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleUnrankedDrop}
          >
            <div className="tier-pool-header">
              <div>
                <h3>Unranked Games</h3>
                <p>
                  {visibleUnrankedGames.length} visible · {selectedGameIds.size} selected · drag into a row or use a quick rank button
                </p>
              </div>
              <div className="tier-scope-controls">
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Search unranked games..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  value={genreFilter}
                  onChange={(event) => setGenreFilter(event.target.value)}
                  aria-label="Rank games within a genre"
                >
                  <option value="">All genres/tags</option>
                  {scopeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`btn-chip ${selectedOnly ? "active" : ""}`}
                  onClick={() => setSelectedOnly((value) => !value)}
                >
                  Selected only
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedGameIds((current) => {
                      const next = new Set(current);
                      visibleUnrankedGames.forEach((game) => next.add(game.appid));
                      return next;
                    });
                  }}
                >
                  Select visible
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedGameIds(new Set())}
                >
                  Clear selected
                </button>
              </div>
            </div>
            <div className="tier-pool-grid">
              {visibleUnrankedGames.map((game) => (
                <UnrankedGameCard
                  key={game.appid}
                  game={game}
                  tiers={tiers}
                  isSelected={selectedGameIds.has(game.appid)}
                  onDragStart={setDraggedGameId}
                  onRank={rankGame}
                  onToggleSelected={toggleSelectedGame}
                />
              ))}
            </div>
            {visibleUnrankedGames.length === 0 && (
              <p className="no-results">No unranked games match your search.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
