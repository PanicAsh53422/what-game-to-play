import { useState, useEffect } from "react";
import { loadConfig, saveConfig } from "../services/storage";

interface Props {
  onSubmit: (apiKey: string, steamId: string) => void;
  loading: boolean;
}

export function LibraryInput({ onSubmit, loading }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [steamId, setSteamId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = loadConfig();
    setApiKey(config.apiKey);
    if (config.players.length > 0 && config.players[0]) {
      setSteamId(config.players[0]);
    }
  }, []);

  function handleSave() {
    const config = loadConfig();
    saveConfig({ ...config, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || !steamId.trim()) return;
    const config = loadConfig();
    saveConfig({ ...config, apiKey });
    onSubmit(apiKey, steamId);
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
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Loading..." : "Load Library"}
        </button>
        <button type="button" className="btn-secondary" onClick={handleSave}>
          {saved ? "Saved!" : "Save API Key"}
        </button>
      </div>
    </form>
  );
}
