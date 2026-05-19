import { useState, useEffect } from "react";
import { loadConfig, saveConfig } from "../services/storage";

interface Props {
  onSubmit: (apiKey: string, steamId: string, familyMembers: string[]) => void;
  loading: boolean;
}

export function LibraryInput({ onSubmit, loading }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [steamId, setSteamId] = useState("");
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = loadConfig();
    setApiKey(config.apiKey);
    if (config.players.length > 0 && config.players[0]) {
      setSteamId(config.players[0]);
    }
    setFamilyMembers(config.familyMembers || []);
  }, []);

  function handleSave() {
    const config = loadConfig();
    const players = [...config.players];
    players[0] = steamId;
    saveConfig({ ...config, apiKey, players, familyMembers });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    if (!apiKey.trim() || !steamId.trim()) return;
    const config = loadConfig();
    const players = [...config.players];
    players[0] = steamId;
    saveConfig({ ...config, apiKey, players, familyMembers });
    onSubmit(apiKey, steamId, familyMembers.filter((m) => m.trim()));
  }

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <div className="form-row">
        <div className="form-section">
          <label htmlFor="discoverApiKey">Steam API Key</label>
          <input
            id="discoverApiKey"
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
          <label htmlFor="discoverSteamId">Your Steam ID</label>
          <input
            id="discoverSteamId"
            type="text"
            placeholder="Steam ID or vanity URL"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-section family-section">
        <div className="family-header">
          <label>Steam Family Members (optional)</label>
          <button type="button" className="btn-secondary" onClick={addFamilyMember}>
            + Add Member
          </button>
        </div>
        <small>
          Add family members to include their games in your library view.
          Games they own but you don't will show as 0 hours played.
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
          {loading ? "Loading..." : "Load Library"}
        </button>
        <button type="button" className="btn-secondary" onClick={handleSave}>
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
