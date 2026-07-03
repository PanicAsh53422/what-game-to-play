import { io, Socket } from "socket.io-client";
import type { LibraryGame, TierListSessionState, TierListTier } from "../types/discovery";

let tierSocket: Socket | null = null;

function getTierSocket(): Socket {
  if (!tierSocket) {
    const url =
      import.meta.env.MODE === "development"
        ? import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"
        : window.location.origin;
    tierSocket = io(url);
  }
  return tierSocket;
}

function bindTierListeners(
  socket: Socket,
  onState: (state: TierListSessionState) => void,
  onError: (message: string) => void,
) {
  socket.off("tier-list:state");
  socket.off("tier-list:error");
  socket.on("tier-list:state", onState);
  socket.on("tier-list:error", onError);
}

export function createTierListSession(
  games: LibraryGame[],
  tiers: TierListTier[],
  nickname: string,
  onState: (state: TierListSessionState) => void,
  onError: (message: string) => void,
) {
  const socket = getTierSocket();
  bindTierListeners(socket, onState, onError);
  socket.emit("tier-list:create", { games, tiers, nickname });
}

export function joinTierListSession(
  sessionId: string,
  nickname: string,
  onState: (state: TierListSessionState) => void,
  onError: (message: string) => void,
) {
  const socket = getTierSocket();
  bindTierListeners(socket, onState, onError);
  socket.emit("tier-list:join", { sessionId, nickname });
}

export function updateTierListSession(tiers: TierListTier[]) {
  getTierSocket().emit("tier-list:update-tiers", { tiers });
}

export function updateTierListGames(games: LibraryGame[]) {
  getTierSocket().emit("tier-list:update-games", { games });
}

export function leaveTierListSession() {
  if (tierSocket) {
    tierSocket.emit("tier-list:leave");
    tierSocket.disconnect();
    tierSocket = null;
  }
}
