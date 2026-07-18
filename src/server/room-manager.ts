import type {
  ChatMessage,
  GameSettings,
  GameState,
  PlayerState,
  RoomState,
  ThemeId,
  TokenId,
} from "@/types/game";
import { DEFAULT_GAME_SETTINGS } from "@/types/game";
import {
  createId,
  generateRoomCode,
  PLAYER_COLORS,
  PLAYER_EMOJIS,
} from "@/lib/utils";
import {
  buyProperty,
  buildHouse,
  createGameState,
  declareBankruptcy,
  declinePurchase,
  dismissCard,
  endTurn,
  forceEndTurnOnTimeout,
  mortgageProperty,
  pauseGame,
  payJailFine,
  placeAuctionBid,
  proposeTrade,
  resolveAuction,
  restartGame,
  respondToTrade,
  resumeGame,
  rollDice,
  sellHouse,
  settleDebt,
  unmortgageProperty,
  redeemJailCard,
} from "@/game/engine";
import type { TradeOffer } from "@/types/game";

/** In-memory room store with optional DB persistence hooks */
class RoomManager {
  private rooms = new Map<string, RoomState>();
  private codeIndex = new Map<string, string>();
  private socketToPlayer = new Map<string, { roomId: string; playerId: string }>();
  private timers = new Map<string, NodeJS.Timeout>();

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): RoomState | undefined {
    const id = this.codeIndex.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  getPlayerSocket(socketId: string) {
    return this.socketToPlayer.get(socketId);
  }

  createRoom(params: {
    hostUserId: string;
    hostUsername: string;
    hostAvatar: string;
    password?: string;
    settings?: Partial<GameSettings>;
    theme?: ThemeId;
    token?: TokenId;
  }): RoomState {
    const code = generateRoomCode();
    const playerId = createId();
    const host: PlayerState = {
      id: playerId,
      userId: params.hostUserId,
      username: params.hostUsername,
      avatar: params.hostAvatar,
      color: PLAYER_COLORS[0],
      emoji: PLAYER_EMOJIS[0],
      token: params.token ?? "car",
      cash: 0,
      position: 0,
      properties: [],
      getOutOfJailCards: 0,
      heldJailCardIds: [],
      bankrupt: false,
      jailed: false,
      jailTurns: 0,
      isReady: false,
      isConnected: true,
      isSpectator: false,
      doublesCount: 0,
      netWorth: 0,
    };

    const room: RoomState = {
      id: createId(),
      code,
      hostId: playerId,
      password: params.password ?? null,
      settings: { ...DEFAULT_GAME_SETTINGS, ...params.settings },
      players: [host],
      spectators: [],
      gameId: null,
      game: null,
      chat: [
        {
          id: createId(),
          roomId: "",
          playerId: "system",
          username: "System",
          avatar: "🎲",
          message: `${params.hostUsername} created the room`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      theme: params.theme ?? "classic",
      boardId: "india-cities",
      createdAt: Date.now(),
      status: "waiting",
    };
    room.chat[0].roomId = room.id;

    this.rooms.set(room.id, room);
    this.codeIndex.set(code, room.id);
    return room;
  }

  joinRoom(params: {
    code: string;
    password?: string;
    userId: string;
    username: string;
    avatar: string;
    token?: TokenId;
    asSpectator?: boolean;
  }): { room: RoomState; player: PlayerState } | { error: string } {
    const room = this.getRoomByCode(params.code);
    if (!room) return { error: "Room not found" };
    if (room.password && room.password !== params.password) {
      return { error: "Incorrect password" };
    }

    const existing = room.players.find((p) => p.userId === params.userId);
    if (existing) {
      existing.isConnected = true;
      existing.username = params.username;
      return { room, player: existing };
    }

    const existingSpec = room.spectators.find((p) => p.userId === params.userId);
    if (existingSpec) {
      existingSpec.isConnected = true;
      return { room, player: existingSpec };
    }

    if (params.asSpectator || room.status === "playing") {
      const spectator: PlayerState = this.makePlayer(params, room, true);
      room.spectators.push(spectator);
      this.addSystemMessage(room, `${params.username} joined as spectator`);
      return { room, player: spectator };
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return { error: "Room is full" };
    }

    const usedTokens = new Set(room.players.map((p) => p.token));
    const tokens: TokenId[] = ["car", "dog", "hat", "ship", "cat", "duck", "robot", "pizza"];
    const token =
      params.token && !usedTokens.has(params.token)
        ? params.token
        : tokens.find((t) => !usedTokens.has(t)) ?? "car";

    const player = this.makePlayer({ ...params, token }, room, false);
    room.players.push(player);
    this.addSystemMessage(room, `${params.username} joined the room`);
    return { room, player };
  }

  private makePlayer(
    params: {
      userId: string;
      username: string;
      avatar: string;
      token?: TokenId;
    },
    room: RoomState,
    spectator: boolean
  ): PlayerState {
    const index = room.players.length;
    return {
      id: createId(),
      userId: params.userId,
      username: params.username,
      avatar: params.avatar,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      emoji: PLAYER_EMOJIS[index % PLAYER_EMOJIS.length],
      token: params.token ?? "car",
      cash: 0,
      position: 0,
      properties: [],
      getOutOfJailCards: 0,
      heldJailCardIds: [],
      bankrupt: false,
      jailed: false,
      jailTurns: 0,
      isReady: false,
      isConnected: true,
      isSpectator: spectator,
      doublesCount: 0,
      netWorth: 0,
    };
  }

  bindSocket(socketId: string, roomId: string, playerId: string): void {
    this.socketToPlayer.set(socketId, { roomId, playerId });
  }

  unbindSocket(socketId: string): RoomState | undefined {
    const binding = this.socketToPlayer.get(socketId);
    this.socketToPlayer.delete(socketId);
    if (!binding) return undefined;

    const room = this.rooms.get(binding.roomId);
    if (!room) return undefined;

    const player =
      room.players.find((p) => p.id === binding.playerId) ??
      room.spectators.find((p) => p.id === binding.playerId);
    if (player) {
      player.isConnected = false;
      this.addSystemMessage(room, `${player.username} disconnected`);
    }
    return room;
  }

  setReady(roomId: string, playerId: string, ready: boolean): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { error: "Player not found" };
    player.isReady = ready;
    return room;
  }

  kickPlayer(roomId: string, hostPlayerId: string, targetId: string): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.hostId !== hostPlayerId) return { error: "Only host can kick" };
    if (targetId === hostPlayerId) return { error: "Cannot kick yourself" };

    const idx = room.players.findIndex((p) => p.id === targetId);
    if (idx < 0) return { error: "Player not found" };

    // Mid-game: force bankruptcy so assets transfer properly
    if (room.game && room.status === "playing") {
      const result = declareBankruptcy(room.game, targetId, room.game.pendingDebt?.toPlayerId ?? null);
      room.game = result.state;
      room.players = result.state.players;
      if (result.state.phase === "ended") room.status = "finished";
      this.addSystemMessage(room, `${result.state.players.find((p) => p.id === targetId)?.username ?? "Player"} was kicked (bankrupt)`);
      return room;
    }

    const [removed] = room.players.splice(idx, 1);
    this.addSystemMessage(room, `${removed.username} was kicked`);
    return room;
  }

  findSocketIdsForPlayer(playerId: string): string[] {
    const ids: string[] = [];
    for (const [socketId, binding] of this.socketToPlayer) {
      if (binding.playerId === playerId) ids.push(socketId);
    }
    return ids;
  }

  transferHost(roomId: string, hostPlayerId: string, targetId: string): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.hostId !== hostPlayerId) return { error: "Only host can transfer" };
    const target = room.players.find((p) => p.id === targetId);
    if (!target) return { error: "Player not found" };
    room.hostId = targetId;
    if (room.game) room.game.hostId = targetId;
    this.addSystemMessage(room, `${target.username} is now the host`);
    return room;
  }

  updateSettings(
    roomId: string,
    hostPlayerId: string,
    settings: Partial<GameSettings>
  ): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.hostId !== hostPlayerId) return { error: "Only host can change settings" };
    if (room.status !== "waiting") return { error: "Cannot change settings mid-game" };
    room.settings = { ...room.settings, ...settings };
    return room;
  }

  updateTheme(roomId: string, hostPlayerId: string, theme: ThemeId): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.hostId !== hostPlayerId) return { error: "Only host can change theme" };
    room.theme = theme;
    return room;
  }

  setToken(roomId: string, playerId: string, token: TokenId): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.status !== "waiting") return { error: "Cannot change token now" };
    if (room.players.some((p) => p.token === token && p.id !== playerId)) {
      return { error: "Token already taken" };
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { error: "Player not found" };
    player.token = token;
    return room;
  }

  startGame(roomId: string, hostPlayerId: string): RoomState | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.hostId !== hostPlayerId) return { error: "Only host can start" };
    if (room.players.length < 2) return { error: "Need at least 2 players" };
    if (!room.players.every((p) => p.isReady)) return { error: "All players must be ready" };

    const game = createGameState({
      roomCode: room.code,
      hostId: room.hostId,
      players: room.players,
      settings: room.settings,
      boardId: room.boardId,
    });

    room.game = game;
    room.gameId = game.id;
    room.status = "playing";
    room.players = game.players;
    this.addSystemMessage(room, "Game started!");
    this.scheduleTurnTimer(room);
    return room;
  }

  addChat(
    roomId: string,
    playerId: string,
    message: string
  ): ChatMessage | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    const player =
      room.players.find((p) => p.id === playerId) ??
      room.spectators.find((p) => p.id === playerId);
    if (!player) return { error: "Player not found" };

    const trimmed = message.trim().slice(0, 500);
    if (!trimmed) return { error: "Empty message" };

    const chat: ChatMessage = {
      id: createId(),
      roomId,
      playerId,
      username: player.username,
      avatar: player.avatar,
      message: trimmed,
      timestamp: Date.now(),
      isSystem: false,
    };
    room.chat.push(chat);
    if (room.chat.length > 300) room.chat = room.chat.slice(-300);
    return chat;
  }

  private addSystemMessage(room: RoomState, message: string): void {
    room.chat.push({
      id: createId(),
      roomId: room.id,
      playerId: "system",
      username: "System",
      avatar: "🎲",
      message,
      timestamp: Date.now(),
      isSystem: true,
    });
  }

  /** Apply a game action with server-side validation */
  applyAction(
    roomId: string,
    playerId: string,
    action: string,
    payload: Record<string, unknown> = {}
  ): { room: RoomState; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || !room.game) return { room: room!, error: "No active game" };

    let result;
    const game = room.game;

    switch (action) {
      case "roll":
        result = rollDice(game, playerId);
        break;
      case "buy":
        result = buyProperty(game, playerId);
        break;
      case "decline_buy":
        result = declinePurchase(game, playerId);
        break;
      case "auction_bid":
        result = placeAuctionBid(game, playerId, Number(payload.amount));
        break;
      case "auction_resolve":
        result = resolveAuction(game, playerId);
        break;
      case "build":
        result = buildHouse(game, playerId, Number(payload.tileId));
        break;
      case "sell_house":
        result = sellHouse(game, playerId, Number(payload.tileId));
        break;
      case "mortgage":
        result = mortgageProperty(game, playerId, Number(payload.tileId));
        break;
      case "unmortgage":
        result = unmortgageProperty(game, playerId, Number(payload.tileId));
        break;
      case "pay_jail":
        result = payJailFine(game, playerId);
        break;
      case "use_jail_card":
        result = redeemJailCard(game, playerId);
        break;
      case "end_turn":
        result = endTurn(game, playerId);
        break;
      case "propose_trade":
        result = proposeTrade(game, playerId, payload as unknown as Omit<TradeOffer, "id" | "status" | "createdAt" | "fromPlayerId">);
        break;
      case "respond_trade":
        result = respondToTrade(game, playerId, Boolean(payload.accept));
        break;
      case "bankrupt":
        result = declareBankruptcy(
          game,
          playerId,
          (payload.creditorId as string) ?? game.pendingDebt?.toPlayerId ?? null
        );
        break;
      case "settle_debt":
        result = settleDebt(game, playerId);
        break;
      case "dismiss_card":
        result = dismissCard(game, playerId);
        break;
      case "pause":
        result = pauseGame(game, playerId);
        break;
      case "resume":
        result = resumeGame(game, playerId);
        break;
      case "restart":
        result = restartGame(game, playerId);
        break;
      default:
        return { room, error: "Unknown action" };
    }

    if (result.error) return { room, error: result.error };

    room.game = result.state;
    room.players = result.state.players;
    if (result.state.phase === "ended") {
      room.status = "finished";
      this.clearTurnTimer(room.id);
    } else {
      this.scheduleTurnTimer(room);
    }

    return { room };
  }

  private scheduleTurnTimer(room: RoomState): void {
    this.clearTurnTimer(room.id);
    if (!room.game || room.game.paused || room.game.phase === "ended") return;

    const deadlines: number[] = [];
    if (room.game.turnEndsAt) deadlines.push(room.game.turnEndsAt);
    if (room.game.phase === "auction" && room.game.auction?.endsAt) {
      deadlines.push(room.game.auction.endsAt);
    }
    if (deadlines.length === 0) return;

    const nextAt = Math.min(...deadlines);
    const delay = Math.max(0, nextAt - Date.now());
    const timer = setTimeout(() => {
      if (!room.game) return;
      const result = forceEndTurnOnTimeout(room.game);
      if (!result.error) {
        room.game = result.state;
        room.players = result.state.players;
        this.onTimerExpired?.(room);
        this.scheduleTurnTimer(room);
      }
    }, delay + 50);
    this.timers.set(room.id, timer);
  }

  private clearTurnTimer(roomId: string): void {
    const t = this.timers.get(roomId);
    if (t) clearTimeout(t);
    this.timers.delete(roomId);
  }

  /** Callback set by socket layer when timer expires */
  onTimerExpired: ((room: RoomState) => void) | null = null;

  serializeRoom(room: RoomState): RoomState {
    return {
      ...room,
      password: room.password ? "***" : null,
    };
  }

  getPublicGame(game: GameState | null): GameState | null {
    return game;
  }
}

export const roomManager = new RoomManager();
