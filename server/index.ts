import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const STEAM_API = "https://api.steampowered.com";
const STORE_API = "https://store.steampowered.com";

app.get("/api/owned-games", async (req, res) => {
  const { key, steamid } = req.query;
  if (!key || !steamid) {
    res.status(400).json({ error: "key and steamid are required" });
    return;
  }

  try {
    const url = `${STEAM_API}/IPlayerService/GetOwnedGames/v0001/?key=${key}&steamid=${steamid}&format=json&include_appinfo=1`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch owned games: ${err}` });
  }
});

app.get("/api/resolve-vanity", async (req, res) => {
  const { key, vanityurl } = req.query;
  if (!key || !vanityurl) {
    res.status(400).json({ error: "key and vanityurl are required" });
    return;
  }

  try {
    const url = `${STEAM_API}/ISteamUser/ResolveVanityURL/v0001/?key=${key}&vanityurl=${vanityurl}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to resolve vanity URL: ${err}` });
  }
});

app.get("/api/app-details", async (req, res) => {
  const { appids } = req.query;
  if (!appids) {
    res.status(400).json({ error: "appids is required" });
    return;
  }

  try {
    const url = `${STORE_API}/api/appdetails?appids=${appids}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch app details: ${err}` });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Steam API proxy running on http://localhost:${PORT}`);
});
