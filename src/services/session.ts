import { io, Socket } from "socket.io-client";
import type { SessionState, GameDetails } from "../types/steam";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const url =
      import.meta.env.MODE === "development"
        ? import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"
        : window.location.origin;
    socket = io(url);
  }
  return socket;
}

function bindListeners(
  s: Socket,
  onState: (state: SessionState) => void,
  onError: (msg: string) => void
) {
  s.off("session:state");
  s.off("session:error");
  s.on("session:state", onState);
  s.on("session:error", onError);
}

export function createSession(
  games: GameDetails[],
  nickname: string,
  onState: (state: SessionState) => void,
  onError: (msg: string) => void
) {
  const s = getSocket();
  bindListeners(s, onState, onError);
  s.emit("session:create", { games, nickname });
}

export function joinSession(
  sessionId: string,
  nickname: string,
  onState: (state: SessionState) => void,
  onError: (msg: string) => void
) {
  const s = getSocket();
  bindListeners(s, onState, onError);
  s.emit("session:join", { sessionId, nickname });
}

export function addGameToWantList(appid: number) {
  getSocket().emit("session:add-game", { appid });
}

export function removeGameFromWantList(appid: number) {
  getSocket().emit("session:remove-game", { appid });
}

export function voteForGame(appid: number) {
  getSocket().emit("session:vote", { appid });
}

export function clearAllPicks() {
  getSocket().emit("session:clear-picks");
}

export function triggerRandomPick(source: string, appids: number[]) {
  getSocket().emit("session:random-pick", { source, appids });
}

export function disconnectSession() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
