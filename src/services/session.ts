import { io, Socket } from "socket.io-client";
import type { SessionState, GameDetails } from "../types/steam";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const url =
      import.meta.env.MODE === "development"
        ? "http://localhost:3001"
        : window.location.origin;
    socket = io(url);
  }
  return socket;
}

export function createSession(
  games: GameDetails[],
  onState: (state: SessionState) => void,
  onError: (msg: string) => void
) {
  const s = getSocket();
  s.off("session:state");
  s.off("session:error");
  s.on("session:state", onState);
  s.on("session:error", onError);
  s.emit("session:create", { games });
}

export function joinSession(
  sessionId: string,
  onState: (state: SessionState) => void,
  onError: (msg: string) => void
) {
  const s = getSocket();
  s.off("session:state");
  s.off("session:error");
  s.on("session:state", onState);
  s.on("session:error", onError);
  s.emit("session:join", { sessionId });
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

export function disconnectSession() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
