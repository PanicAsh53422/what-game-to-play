import { useState, useEffect } from "react";
import { loadConfig, saveConfig } from "../services/storage";

interface Props {
  onSubmit: (
    apiKey: string,
    players: string[],
    familyMembers: string[]
  ) => void;
  loading: boolean;
}

export function InputForm({ onSubmit, loading }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [players, setPlayers] = useState<string[]>(["", ""]);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = loadConfig();
    setApiKey(config.apiKey);
    setPlayers(config.players.length >= 2 ? config.players : ["", ""]);
    setFamilyMembers(config.familyMembers);
  }, []);

  function handleSave() {
    saveConfig({ apiKey, players, familyMembers });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updatePlayer(index: number, value: string) {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  }

  function addPlayer() {
    if (players.length < 4) {
      setPlayers([...players, ""]);
    }
  }

  function removePlayer(index: number) {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, i) => i !== index));
  }

  function addFamilyMember() {
    setFamilyMembers([...familyMembers, ""]);
  }

  function removeFamilyMember(index: number) {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  }

  function updateFamilyMember(index: number, value: string) {
    const updated = [...familyMembers];
    updated[index] = value;
    setFamilyMembers(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveConfig({ apiKey, players, familyMembers });
    const activeFamilyMembers = familyMembers.filter((m) => m.trim());
    const activePlayers = players.filter((p) => p.trim());
    if (activePlayers.length < 2) return;
    onSubmit(apiKey, activePlayers, activeFamilyMembers);
  }

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <div className="form-section">
        <label htmlFor="apiKey">Steam API Key</label>
        <input
          id="apiKey"
          type="password"
          placeholder="Your Steam Web API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <small>
          Get one at{" "}
          <a
            href="https://steamcommunity.com/dev/apikey"
            target="_blank"
            rel="noreferrer"
          >
            steamcommunity.com/dev/apikey
          </a>
        </small>
      </div>

      <div className="form-section">
        <div className="family-header">
          <label>Players (2-4)</label>
          {players.length < 4 && (
            <button type="button" className="btn-secondary" onClick={addPlayer}>
              + Add Player
            </button>
          )}
        </div>
        <div className="players-grid">
          {players.map((player, i) => (
            <div key={i} className="player-input-row">
              <input
                type="text"
                placeholder={`Player ${i + 1} — Steam ID or vanity URL`}
                value={player}
                onChange={(e) => updatePlayer(i, e.target.value)}
                required
              />
              {players.length > 2 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removePlayer(i)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="form-section family-section">
        <div className="family-header">
          <label>Steam Family Members (optional)</label>
          <button
            type="button"
            className="btn-secondary"
            onClick={addFamilyMember}
          >
            + Add Member
          </button>
        </div>
        <small>
          Add other family members to count extra copies in the shared family
          library.
        </small>
        {familyMembers.map((member, i) => (
          <div key={i} className="family-member-row">
            <input
              type="text"
              placeholder={`Family member ${i + 1} Steam ID or vanity URL`}
              value={member}
              onChange={(e) => updateFamilyMember(i, e.target.value)}
            />
            <button
              type="button"
              className="btn-remove"
              onClick={() => removeFamilyMember(i)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Find Games"}
        </button>
        <button type="button" className="btn-secondary" onClick={handleSave}>
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
