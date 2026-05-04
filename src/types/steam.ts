export interface SteamGame {
  appid: number;
  name: string;
  img_icon_url: string;
  playtime_forever: number;
}

export interface GameDetails {
  appid: number;
  name: string;
  headerImage: string;
  isMultiplayer: boolean;
  categories: string[];
  genres: string[];
  copiesInFamily: number;
  ownedBy: string[];
}

export interface RandomPick {
  source: string;
  appid: number;
  timestamp: number;
}

export interface SessionPlayer {
  nickname: string;
  connected: boolean;
}

export interface SessionState {
  sessionId: string;
  games: GameDetails[];
  players: (SessionPlayer | null)[];
  wantToPlay: number[][];
  votes: number[][];
  randomPick: RandomPick | null;
  playerSlot: number;
  connectedPlayers: number;
}

export interface SavedConfig {
  apiKey: string;
  players: string[];
  familyMembers: string[];
}
