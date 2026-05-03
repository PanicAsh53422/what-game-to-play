import { useState } from "react";

interface Props {
  onSubmit: (
    apiKey: string,
    player1: string,
    player2: string,
    familyMembers: string[]
  ) => void;
  loading: boolean;
}

export function InputForm({ onSubmit, loading }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);

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
    const activeFamilyMembers = familyMembers.filter((m) => m.trim());
    onSubmit(apiKey, player1, player2, activeFamilyMembers);
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

      <div className="form-row">
        <div className="form-section">
          <label htmlFor="player1">Player 1</label>
          <input
            id="player1"
            type="text"
            placeholder="Steam ID or vanity URL"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            required
          />
        </div>
        <div className="form-section">
          <label htmlFor="player2">Player 2</label>
          <input
            id="player2"
            type="text"
            placeholder="Steam ID or vanity URL"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
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
          Add other family members to check for games with 2+ copies in the
          shared family library.
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

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Searching..." : "Find Games"}
      </button>
    </form>
  );
}
