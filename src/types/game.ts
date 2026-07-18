/** Core game type definitions — shared by client and server */

export type TileType =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community_chest"
  | "jail"
  | "free_parking"
  | "go_to_jail";

export type ColorGroup =
  | "brown"
  | "lightblue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "darkblue"
  | "railroad"
  | "utility"
  | "none";

export type TokenId =
  | "car"
  | "dog"
  | "hat"
  | "ship"
  | "cat"
  | "duck"
  | "robot"
  | "pizza";

export type ThemeId = "classic" | "winter" | "cyberpunk" | "custom";

export type CardType = "chance" | "community_chest";

export type CardAction =
  | "advance_to_go"
  | "go_to_jail"
  | "go_back"
  | "pay_bank"
  | "collect_bank"
  | "pay_each_player"
  | "collect_each_player"
  | "advance_to"
  | "nearest_railroad"
  | "nearest_utility"
  | "get_out_of_jail"
  | "repairs"
  | "advance_to_go_collect";

export interface RentSchedule {
  base: number;
  monopoly: number;
  houses: [number, number, number, number];
  hotel: number;
}

export interface BoardTile {
  id: number;
  name: string;
  type: TileType;
  colorGroup: ColorGroup;
  price: number;
  houseCost: number;
  mortgageValue: number;
  rent: RentSchedule | null;
  taxAmount: number;
  description?: string;
  image?: string;
}

export interface BoardDefinition {
  id: string;
  name: string;
  version: string;
  currency: string;
  theme: ThemeId;
  tiles: BoardTile[];
  colorGroupSizes: Record<string, number>;
}

export interface CardDefinition {
  id: string;
  type: CardType;
  title: string;
  description: string;
  action: CardAction;
  amount?: number;
  spaces?: number;
  targetTileId?: number;
  perHouse?: number;
  perHotel?: number;
}

export interface CardsDeck {
  chance: CardDefinition[];
  communityChest: CardDefinition[];
}

export interface OwnedProperty {
  tileId: number;
  houses: number; // 0-4, 5 = hotel
  mortgaged: boolean;
}

export interface PlayerState {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  color: string;
  emoji: string;
  token: TokenId;
  cash: number;
  position: number;
  properties: OwnedProperty[];
  getOutOfJailCards: number;
  /** Card ids held for Get Out of Jail Free (returned to discard when used) */
  heldJailCardIds: string[];
  bankrupt: boolean;
  jailed: boolean;
  jailTurns: number;
  isReady: boolean;
  isConnected: boolean;
  isSpectator: boolean;
  doublesCount: number;
  netWorth: number;
}

export interface GameSettings {
  startingMoney: number;
  salaryAtGo: number;
  freeParkingJackpot: boolean;
  auctionEnabled: boolean;
  timePerTurn: number; // seconds, 0 = disabled
  maxPlayers: number;
  evenBuild: boolean;
  auctionOnDecline: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  startingMoney: 15000,
  salaryAtGo: 2000,
  freeParkingJackpot: true,
  auctionEnabled: true,
  timePerTurn: 60,
  maxPlayers: 8,
  evenBuild: true,
  auctionOnDecline: true,
};

export type GamePhase =
  | "lobby"
  | "rolling"
  | "moving"
  | "action"
  | "buying"
  | "auction"
  | "trading"
  | "building"
  | "jail_choice"
  | "card"
  | "bankruptcy"
  | "paused"
  | "ended";

export interface DiceResult {
  die1: number;
  die2: number;
  total: number;
  isDoubles: boolean;
}

export interface AuctionState {
  tileId: number;
  highestBid: number;
  highestBidderId: string | null;
  participants: string[];
  currentBidderIndex: number;
  endsAt: number;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerCash: number;
  requestCash: number;
  offerProperties: number[];
  requestProperties: number[];
  offerJailCards: number;
  requestJailCards: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
  isSystem: boolean;
}

export interface EmoteEvent {
  id: string;
  playerId: string;
  emote: string;
  timestamp: number;
}

export interface GameLogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: "roll" | "buy" | "rent" | "build" | "trade" | "jail" | "card" | "bankrupt" | "system" | "win";
  playerId?: string;
}

export interface PendingPurchase {
  tileId: number;
  playerId: string;
}

export interface PendingDebt {
  playerId: string;
  amount: number;
  toPlayerId: string | null;
  reason: string;
}

export interface GameState {
  id: string;
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: PlayerState[];
  currentPlayerIndex: number;
  boardId: string;
  settings: GameSettings;
  dice: DiceResult | null;
  freeParkingPot: number;
  /** Classic Monopoly bank supply */
  housesInBank: number;
  hotelsInBank: number;
  auction: AuctionState | null;
  trade: TradeOffer | null;
  pendingPurchase: PendingPurchase | null;
  pendingDebt: PendingDebt | null;
  lastCard: CardDefinition | null;
  turnStartedAt: number;
  turnEndsAt: number | null;
  winnerId: string | null;
  log: GameLogEntry[];
  chanceDeck: string[];
  communityDeck: string[];
  discardedChance: string[];
  discardedCommunity: string[];
  paused: boolean;
  phaseBeforePause: GamePhase | null;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  endedAt: number | null;
  replayEvents: ReplayEvent[];
}

export interface ReplayEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  stateSnapshot?: Partial<GameState>;
}

export interface RoomState {
  id: string;
  code: string;
  hostId: string;
  password: string | null;
  settings: GameSettings;
  players: PlayerState[];
  spectators: PlayerState[];
  gameId: string | null;
  game: GameState | null;
  chat: ChatMessage[];
  theme: ThemeId;
  boardId: string;
  createdAt: number;
  status: "waiting" | "playing" | "finished";
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

export interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  totalMoneyEarned: number;
  propertiesBought: number;
  hotelsBuilt: number;
  timesJailed: number;
  tradesCompleted: number;
  achievements: string[];
}

export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  reward: number;
  target: number;
  metric: string;
}
