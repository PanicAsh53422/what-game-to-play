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

export interface SessionState {
  sessionId: string;
  games: GameDetails[];
  wantToPlay: {
    player1: number[];
    player2: number[];
  };
  votes: {
    player1: number[];
    player2: number[];
  };
  randomPick: RandomPick | null;
  playerSlot: "player1" | "player2";
  connectedPlayers: number;
}

export interface SavedConfig {
  apiKey: string;
  player1: string;
  player2: string;
  familyMembers: string[];
}
