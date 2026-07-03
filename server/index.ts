import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

const STEAM_API = "https://api.steampowered.com";
const STORE_API = "https://store.steampowered.com";

interface SteamSpyAppDetails {
  tags?: Record<string, number>;
}

// --- Steam API proxy routes ---

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
    const url = `${STORE_API}/api/appdetails?appids=${appids}&l=english`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch app details: ${err}` });
  }
});

app.get("/api/app-tags", async (req, res) => {
  const { appid } = req.query;
  if (!appid) {
    res.status(400).json({ error: "appid is required" });
    return;
  }
  try {
    const url = `https://steamspy.com/api.php?request=appdetails&appid=${appid}`;
    const response = await fetch(url);
    const data = (await response.json()) as SteamSpyAppDetails;
    const tags = data.tags ? Object.keys(data.tags) : [];
    res.json({ appid: Number(appid), tags });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch app tags: ${err}` });
  }
});

app.get("/api/player-summaries", async (req, res) => {
  const { key, steamids } = req.query;
  if (!key || !steamids) {
    res.status(400).json({ error: "key and steamids are required" });
    return;
  }
  try {
    const url = `${STEAM_API}/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamids}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch player summaries: ${err}` });
  }
});

app.get("/api/family-group-for-user", async (req, res) => {
  const { key, steamid } = req.query;
  if (!key || !steamid) {
    res.status(400).json({ error: "key and steamid are required" });
    return;
  }
  try {
    const url = `${STEAM_API}/IFamilyGroupsService/GetFamilyGroupForUser/v1/?key=${key}&steamid=${steamid}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch family group: ${err}` });
  }
});

app.get("/api/family-group", async (req, res) => {
  const { key, familygroupid } = req.query;
  if (!key || !familygroupid) {
    res.status(400).json({ error: "key and familygroupid are required" });
    return;
  }
  try {
    const url = `${STEAM_API}/IFamilyGroupsService/GetFamilyGroup/v1/?key=${key}&family_groupid=${familygroupid}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch family group details: ${err}` });
  }
});

app.get("/api/family-shared-library", async (req, res) => {
  const { key, familygroupid } = req.query;
  if (!key || !familygroupid) {
    res.status(400).json({ error: "key and familygroupid are required" });
    return;
  }
  try {
    const url = `${STEAM_API}/IFamilyGroupsService/GetSharedLibraryApps/v1/?key=${key}&family_groupid=${familygroupid}&include_own=true`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch shared library: ${err}` });
  }
});

// --- Session management ---

interface GameData {
  appid: number;
  name: string;
  headerImage: string;
  isMultiplayer: boolean;
  categories: string[];
  genres: string[];
  copiesInFamily: number;
  ownedBy: string[];
}

interface RandomPick {
  source: string;
  appid: number;
  timestamp: number;
}

interface SessionPlayer {
  socketId: string;
  nickname: string;
}

interface Session {
  id: string;
  games: GameData[];
  players: (SessionPlayer | null)[];
  wantToPlay: number[][];
  votes: number[][];
  randomPick: RandomPick | null;
}

const sessions = new Map<string, Session>();

interface LibraryGameData {
  appid: number;
  name: string;
  playtimeMinutes: number;
  playtimeHours: number;
  headerImage: string;
  genres: string[];
  categories: string[];
  tags: string[];
  genreLoaded: boolean;
}

interface TierListTierData {
  id: string;
  name: string;
  color: string;
  gameIds: number[];
}

interface TierListPlayer {
  socketId: string;
  nickname: string;
}

interface TierListSession {
  id: string;
  games: LibraryGameData[];
  tiers: TierListTierData[];
  players: TierListPlayer[];
  updatedAt: number;
}

const tierListSessions = new Map<string, TierListSession>();

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function broadcastState(session: Session) {
  const base = {
    sessionId: session.id,
    games: session.games,
    players: session.players.map((p) =>
      p ? { nickname: p.nickname, connected: true } : null
    ),
    wantToPlay: session.wantToPlay,
    votes: session.votes,
    randomPick: session.randomPick,
    connectedPlayers: session.players.filter((p) => p !== null).length,
  };

  for (let i = 0; i < session.players.length; i++) {
    const p = session.players[i];
    if (p) {
      io.to(p.socketId).emit("session:state", {
        ...base,
        playerSlot: i,
      });
    }
  }
}

function sanitizeTierListTiers(tiers: TierListTierData[]): TierListTierData[] {
  const usedTierIds = new Set<string>();
  const usedGameIds = new Set<number>();

  return tiers
    .filter((tier) => tier && typeof tier.id === "string")
    .map((tier, index) => {
      let id = tier.id.trim() || `tier-${index}`;
      if (usedTierIds.has(id)) id = `${id}-${index}`;
      usedTierIds.add(id);

      const gameIds = Array.isArray(tier.gameIds)
        ? tier.gameIds
            .map((appid) => Number(appid))
            .filter((appid) => Number.isFinite(appid) && !usedGameIds.has(appid))
        : [];

      gameIds.forEach((appid) => usedGameIds.add(appid));

      return {
        id,
        name: String(tier.name || `Tier ${index + 1}`).slice(0, 40),
        color: /^#[0-9a-f]{6}$/i.test(tier.color) ? tier.color : "#66c0f4",
        gameIds,
      };
    })
    .slice(0, 20);
}

function sanitizeTierListGames(games: LibraryGameData[]): LibraryGameData[] {
  const usedAppIds = new Set<number>();

  return games
    .filter((game) => game && Number.isFinite(Number(game.appid)))
    .map((game) => ({
      appid: Number(game.appid),
      name: String(game.name || `App ${game.appid}`).slice(0, 180),
      playtimeMinutes: Number(game.playtimeMinutes) || 0,
      playtimeHours: Number(game.playtimeHours) || 0,
      headerImage: String(game.headerImage || ""),
      genres: Array.isArray(game.genres) ? game.genres.map(String).slice(0, 30) : [],
      categories: Array.isArray(game.categories) ? game.categories.map(String).slice(0, 30) : [],
      tags: Array.isArray(game.tags) ? game.tags.map(String).slice(0, 40) : [],
      genreLoaded: Boolean(game.genreLoaded),
    }))
    .filter((game) => {
      if (usedAppIds.has(game.appid)) return false;
      usedAppIds.add(game.appid);
      return true;
    })
    .slice(0, 2500);
}

function broadcastTierListState(session: TierListSession) {
  const state = {
    sessionId: session.id,
    games: session.games,
    tiers: session.tiers,
    players: session.players.map((player) => ({
      nickname: player.nickname,
      connected: true,
    })),
    connectedPlayers: session.players.length,
    updatedAt: session.updatedAt,
  };

  for (const player of session.players) {
    io.to(player.socketId).emit("tier-list:state", state);
  }
}

io.on("connection", (socket) => {
  let currentSessionId: string | null = null;
  let currentSlot: number = -1;
  let currentTierListSessionId: string | null = null;

  function leaveCurrentTierListSession() {
    if (!currentTierListSessionId) return;
    const session = tierListSessions.get(currentTierListSessionId);
    if (!session) {
      currentTierListSessionId = null;
      return;
    }

    session.players = session.players.filter((player) => player.socketId !== socket.id);
    if (session.players.length === 0) {
      tierListSessions.delete(session.id);
    } else {
      session.updatedAt = Date.now();
      broadcastTierListState(session);
    }
    currentTierListSessionId = null;
  }

  socket.on(
    "session:create",
    (data: { games: GameData[]; nickname: string }) => {
      const id = generateSessionId();
      const session: Session = {
        id,
        games: data.games,
        players: [
          { socketId: socket.id, nickname: data.nickname || "Host" },
          null,
          null,
          null,
        ],
        wantToPlay: [[], [], [], []],
        votes: [[], [], [], []],
        randomPick: null,
      };
      sessions.set(id, session);
      currentSessionId = id;
      currentSlot = 0;
      broadcastState(session);
    }
  );

  socket.on(
    "tier-list:create",
    (data: { games: LibraryGameData[]; tiers: TierListTierData[]; nickname: string }) => {
      leaveCurrentTierListSession();
      const id = generateSessionId();
      const session: TierListSession = {
        id,
        games: sanitizeTierListGames(data.games || []),
        tiers: sanitizeTierListTiers(data.tiers || []),
        players: [{ socketId: socket.id, nickname: data.nickname || "Host" }],
        updatedAt: Date.now(),
      };

      tierListSessions.set(id, session);
      currentTierListSessionId = id;
      broadcastTierListState(session);
    }
  );

  socket.on(
    "tier-list:join",
    (data: { sessionId: string; nickname: string }) => {
      leaveCurrentTierListSession();
      const session = tierListSessions.get(String(data.sessionId || "").toUpperCase());
      if (!session) {
        socket.emit("tier-list:error", "Tier list session not found");
        return;
      }

      const existingPlayer = session.players.find((player) => player.socketId === socket.id);
      if (!existingPlayer) {
        if (session.players.length >= 12) {
          socket.emit("tier-list:error", "Tier list session is full");
          return;
        }
        session.players.push({
          socketId: socket.id,
          nickname: data.nickname || `Player ${session.players.length + 1}`,
        });
      }

      currentTierListSessionId = session.id;
      session.updatedAt = Date.now();
      broadcastTierListState(session);
    }
  );

  socket.on("tier-list:update-tiers", (data: { tiers: TierListTierData[] }) => {
    if (!currentTierListSessionId) return;
    const session = tierListSessions.get(currentTierListSessionId);
    if (!session) return;

    session.tiers = sanitizeTierListTiers(data.tiers || []);
    session.updatedAt = Date.now();
    broadcastTierListState(session);
  });

  socket.on("tier-list:update-games", (data: { games: LibraryGameData[] }) => {
    if (!currentTierListSessionId) return;
    const session = tierListSessions.get(currentTierListSessionId);
    if (!session) return;

    session.games = sanitizeTierListGames(data.games || []);
    session.updatedAt = Date.now();
    broadcastTierListState(session);
  });

  socket.on("tier-list:leave", () => {
    leaveCurrentTierListSession();
  });

  socket.on(
    "session:join",
    (data: { sessionId: string; nickname: string }) => {
      const session = sessions.get(data.sessionId.toUpperCase());
      if (!session) {
        socket.emit("session:error", "Session not found");
        return;
      }

      const existingSlot = session.players.findIndex(
        (p) => p?.socketId === socket.id
      );
      if (existingSlot !== -1) {
        currentSessionId = session.id;
        currentSlot = existingSlot;
        broadcastState(session);
        return;
      }

      const freeSlot = session.players.findIndex((p) => p === null);
      if (freeSlot === -1) {
        socket.emit("session:error", "Session is full (max 4 players)");
        return;
      }

      session.players[freeSlot] = {
        socketId: socket.id,
        nickname: data.nickname || `Player ${freeSlot + 1}`,
      };
      currentSessionId = session.id;
      currentSlot = freeSlot;
      broadcastState(session);
    }
  );

  socket.on("session:add-game", (data: { appid: number }) => {
    if (!currentSessionId || currentSlot < 0) return;
    const session = sessions.get(currentSessionId);
    if (!session) return;

    const list = session.wantToPlay[currentSlot];
    if (list.length >= 5 || list.includes(data.appid)) return;

    list.push(data.appid);
    broadcastState(session);
  });

  socket.on("session:remove-game", (data: { appid: number }) => {
    if (!currentSessionId || currentSlot < 0) return;
    const session = sessions.get(currentSessionId);
    if (!session) return;

    session.wantToPlay[currentSlot] = session.wantToPlay[currentSlot].filter(
      (id) => id !== data.appid
    );
    session.votes[currentSlot] = session.votes[currentSlot].filter(
      (id) => id !== data.appid
    );
    broadcastState(session);
  });

  socket.on("session:clear-picks", () => {
    if (!currentSessionId || currentSlot < 0) return;
    const session = sessions.get(currentSessionId);
    if (!session) return;

    const removed = session.wantToPlay[currentSlot];
    session.wantToPlay[currentSlot] = [];
    session.votes[currentSlot] = session.votes[currentSlot].filter(
      (id) => !removed.includes(id)
    );
    broadcastState(session);
  });

  socket.on("session:vote", (data: { appid: number }) => {
    if (!currentSessionId || currentSlot < 0) return;
    const session = sessions.get(currentSessionId);
    if (!session) return;

    const allWanted = session.wantToPlay.flat();
    if (!allWanted.includes(data.appid)) return;

    const votes = session.votes[currentSlot];
    if (votes.includes(data.appid)) {
      session.votes[currentSlot] = votes.filter((id) => id !== data.appid);
    } else {
      session.votes[currentSlot].push(data.appid);
    }
    broadcastState(session);
  });

  socket.on(
    "session:random-pick",
    (data: { source: string; appids: number[] }) => {
      if (!currentSessionId) return;
      const session = sessions.get(currentSessionId);
      if (!session || data.appids.length === 0) return;

      const picked =
        data.appids[Math.floor(Math.random() * data.appids.length)];
      session.randomPick = {
        source: data.source,
        appid: picked,
        timestamp: Date.now(),
      };
      broadcastState(session);
    }
  );

  socket.on("disconnect", () => {
    leaveCurrentTierListSession();

    if (!currentSessionId || currentSlot < 0) return;
    const session = sessions.get(currentSessionId);
    if (!session) return;

    session.players[currentSlot] = null;

    if (session.players.every((p) => p === null)) {
      sessions.delete(currentSessionId);
    } else {
      broadcastState(session);
    }
  });
});

// --- Static files (production) ---

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = parseInt(process.env.PORT || "3001", 10);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
