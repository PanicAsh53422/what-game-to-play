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
    const url = `${STORE_API}/api/appdetails?appids=${appids}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch app details: ${err}` });
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

interface Session {
  id: string;
  games: GameData[];
  wantToPlay: { player1: number[]; player2: number[] };
  votes: { player1: number[]; player2: number[] };
  sockets: { player1: string | null; player2: string | null };
}

const sessions = new Map<string, Session>();

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function getConnectedCount(session: Session): number {
  let count = 0;
  if (session.sockets.player1) count++;
  if (session.sockets.player2) count++;
  return count;
}

function broadcastState(session: Session) {
  const base = {
    sessionId: session.id,
    games: session.games,
    wantToPlay: session.wantToPlay,
    votes: session.votes,
    connectedPlayers: getConnectedCount(session),
  };

  if (session.sockets.player1) {
    io.to(session.sockets.player1).emit("session:state", {
      ...base,
      playerSlot: "player1",
    });
  }
  if (session.sockets.player2) {
    io.to(session.sockets.player2).emit("session:state", {
      ...base,
      playerSlot: "player2",
    });
  }
}

io.on("connection", (socket) => {
  let currentSessionId: string | null = null;
  let currentSlot: "player1" | "player2" | null = null;

  socket.on("session:create", (data: { games: GameData[] }) => {
    const id = generateSessionId();
    const session: Session = {
      id,
      games: data.games,
      wantToPlay: { player1: [], player2: [] },
      votes: { player1: [], player2: [] },
      sockets: { player1: socket.id, player2: null },
    };
    sessions.set(id, session);
    currentSessionId = id;
    currentSlot = "player1";
    broadcastState(session);
  });

  socket.on("session:join", (data: { sessionId: string }) => {
    const session = sessions.get(data.sessionId.toUpperCase());
    if (!session) {
      socket.emit("session:error", "Session not found");
      return;
    }

    if (session.sockets.player1 === socket.id || session.sockets.player2 === socket.id) {
      broadcastState(session);
      return;
    }

    if (session.sockets.player2 && session.sockets.player2 !== socket.id) {
      socket.emit("session:error", "Session is full");
      return;
    }

    session.sockets.player2 = socket.id;
    currentSessionId = session.id;
    currentSlot = "player2";
    broadcastState(session);
  });

  socket.on(
    "session:add-game",
    (data: { appid: number }) => {
      if (!currentSessionId || !currentSlot) return;
      const session = sessions.get(currentSessionId);
      if (!session) return;

      const list = session.wantToPlay[currentSlot];
      if (list.length >= 5 || list.includes(data.appid)) return;

      list.push(data.appid);
      broadcastState(session);
    }
  );

  socket.on(
    "session:remove-game",
    (data: { appid: number }) => {
      if (!currentSessionId || !currentSlot) return;
      const session = sessions.get(currentSessionId);
      if (!session) return;

      session.wantToPlay[currentSlot] = session.wantToPlay[currentSlot].filter(
        (id) => id !== data.appid
      );
      session.votes[currentSlot] = session.votes[currentSlot].filter(
        (id) => id !== data.appid
      );
      broadcastState(session);
    }
  );

  socket.on(
    "session:vote",
    (data: { appid: number }) => {
      if (!currentSessionId || !currentSlot) return;
      const session = sessions.get(currentSessionId);
      if (!session) return;

      const allWanted = [
        ...session.wantToPlay.player1,
        ...session.wantToPlay.player2,
      ];
      if (!allWanted.includes(data.appid)) return;

      const votes = session.votes[currentSlot];
      if (votes.includes(data.appid)) {
        session.votes[currentSlot] = votes.filter((id) => id !== data.appid);
      } else {
        session.votes[currentSlot].push(data.appid);
      }
      broadcastState(session);
    }
  );

  socket.on("disconnect", () => {
    if (!currentSessionId) return;
    const session = sessions.get(currentSessionId);
    if (!session) return;

    if (session.sockets.player1 === socket.id) {
      session.sockets.player1 = null;
    }
    if (session.sockets.player2 === socket.id) {
      session.sockets.player2 = null;
    }

    if (!session.sockets.player1 && !session.sockets.player2) {
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
