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
  copiesInFamily: number;
  ownedBy: string[];
}

export interface PlayerInput {
  steamId: string;
  label: string;
}

export interface FamilyMember {
  steamId: string;
  label: string;
}

export interface AppState {
  apiKey: string;
  player1: PlayerInput;
  player2: PlayerInput;
  familyMembers: FamilyMember[];
  results: GameDetails[];
  loading: boolean;
  error: string | null;
  progress: string;
}
