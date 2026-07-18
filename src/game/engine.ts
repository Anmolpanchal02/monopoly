import type {
  BoardDefinition,
  CardDefinition,
  DiceResult,
  GameLogEntry,
  GameSettings,
  GameState,
  OwnedProperty,
  PlayerState,
  TradeOffer,
} from "@/types/game";
import { DEFAULT_GAME_SETTINGS } from "@/types/game";
import { createId, shuffle, rollDie } from "@/lib/utils";
import { getTile, loadBoard, loadCards } from "@/lib/board-loader";

export type EngineResult = {
  state: GameState;
  events: Array<{ type: string; payload?: unknown }>;
  error?: string;
};

function log(
  state: GameState,
  message: string,
  type: GameLogEntry["type"],
  playerId?: string
): void {
  state.log.unshift({
    id: createId(),
    message,
    timestamp: Date.now(),
    type,
    playerId,
  });
  if (state.log.length > 200) state.log = state.log.slice(0, 200);
}

function replay(state: GameState, type: string, payload?: unknown): void {
  state.replayEvents.push({
    id: createId(),
    type,
    payload,
    timestamp: Date.now(),
  });
  if (state.replayEvents.length > 2000) {
    state.replayEvents = state.replayEvents.slice(-2000);
  }
}

function touch(state: GameState): void {
  state.updatedAt = Date.now();
}

function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.bankrupt && !p.isSpectator);
}

function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((p) => p.id === playerId);
}

function getOwned(player: PlayerState, tileId: number): OwnedProperty | undefined {
  return player.properties.find((p) => p.tileId === tileId);
}

function findOwner(state: GameState, tileId: number): PlayerState | undefined {
  return state.players.find((p) => p.properties.some((prop) => prop.tileId === tileId));
}

function ownsColorGroup(
  board: BoardDefinition,
  player: PlayerState,
  colorGroup: string
): boolean {
  const needed = board.colorGroupSizes[colorGroup] ?? 0;
  if (needed === 0) return false;
  const owned = player.properties.filter((p) => {
    const tile = board.tiles.find((t) => t.id === p.tileId);
    return tile?.colorGroup === colorGroup && !p.mortgaged;
  });
  return owned.length >= needed;
}

function countRailroads(player: PlayerState, board: BoardDefinition): number {
  return player.properties.filter((p) => {
    const tile = board.tiles.find((t) => t.id === p.tileId);
    return tile?.type === "railroad" && !p.mortgaged;
  }).length;
}

function countUtilities(player: PlayerState, board: BoardDefinition): number {
  return player.properties.filter((p) => {
    const tile = board.tiles.find((t) => t.id === p.tileId);
    return tile?.type === "utility" && !p.mortgaged;
  }).length;
}

export function calculateRent(
  state: GameState,
  board: BoardDefinition,
  tileId: number,
  diceTotal: number
): number {
  const tile = getTile(board, tileId);
  const owner = findOwner(state, tileId);
  if (!owner || owner.bankrupt) return 0;

  const owned = getOwned(owner, tileId);
  if (!owned || owned.mortgaged) return 0;
  if (!tile.rent) return 0;

  if (tile.type === "railroad") {
    const count = countRailroads(owner, board);
    return [0, 250, 500, 1000, 2000][count] ?? 250;
  }

  if (tile.type === "utility") {
    const count = countUtilities(owner, board);
    const multiplier = count >= 2 ? 10 : 4;
    return diceTotal * multiplier;
  }

  if (owned.houses === 5) return tile.rent.hotel;
  if (owned.houses > 0) return tile.rent.houses[owned.houses - 1];

  if (ownsColorGroup(board, owner, tile.colorGroup)) {
    return tile.rent.monopoly;
  }

  return tile.rent.base;
}

export function calculateNetWorth(
  player: PlayerState,
  board: BoardDefinition
): number {
  let worth = player.cash;
  for (const prop of player.properties) {
    const tile = board.tiles.find((t) => t.id === prop.tileId);
    if (!tile) continue;
    if (prop.mortgaged) {
      worth += Math.floor(tile.mortgageValue / 2);
    } else {
      worth += tile.price;
      if (prop.houses === 5) {
        worth += tile.houseCost * 5;
      } else {
        worth += tile.houseCost * prop.houses;
      }
    }
  }
  worth += player.getOutOfJailCards * 500;
  return worth;
}

function refreshNetWorth(state: GameState, board: BoardDefinition): void {
  for (const player of state.players) {
    player.netWorth = calculateNetWorth(player, board);
  }
}

function addToPot(state: GameState, amount: number): void {
  if (state.settings.freeParkingJackpot && amount > 0) {
    state.freeParkingPot += amount;
  }
}

function tryPay(
  state: GameState,
  _board: BoardDefinition,
  player: PlayerState,
  amount: number,
  toPlayerId: string | null,
  reason: string
): { paid: boolean; shortfall: number } {
  if (amount <= 0) return { paid: true, shortfall: 0 };

  if (player.cash >= amount) {
    player.cash -= amount;
    if (toPlayerId) {
      const receiver = findPlayer(state, toPlayerId);
      if (receiver) receiver.cash += amount;
    } else {
      addToPot(state, amount);
    }
    log(state, `${player.username} paid ₹${amount} — ${reason}`, "rent", player.id);
    return { paid: true, shortfall: 0 };
  }

  // Do not partial-pay: player must raise funds or bankrupt
  state.pendingDebt = {
    playerId: player.id,
    amount,
    toPlayerId,
    reason,
  };
  state.phase = "bankruptcy";
  log(
    state,
    `${player.username} owes ₹${amount} but only has ₹${player.cash}. Mortgage, sell houses, or declare bankruptcy.`,
    "bankrupt",
    player.id
  );
  replay(state, "debt", {
    playerId: player.id,
    amount,
    shortfall: amount - player.cash,
    toPlayerId,
    reason,
  });
  return { paid: false, shortfall: amount - player.cash };
}

/** After raising cash, settle outstanding debt */
export function settleDebt(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (!state.pendingDebt || state.pendingDebt.playerId !== playerId) {
    return { state, events, error: "No pending debt" };
  }
  const player = findPlayer(state, playerId);
  if (!player) return { state, events, error: "Player not found" };

  const debt = state.pendingDebt;
  if (player.cash < debt.amount) {
    return {
      state,
      events,
      error: `Still need ₹${debt.amount - player.cash} more`,
    };
  }

  player.cash -= debt.amount;
  if (debt.toPlayerId) {
    const receiver = findPlayer(state, debt.toPlayerId);
    if (receiver) receiver.cash += debt.amount;
  } else {
    addToPot(state, debt.amount);
  }

  log(
    state,
    `${player.username} paid ₹${debt.amount} debt — ${debt.reason}`,
    "rent",
    playerId
  );
  state.pendingDebt = null;
  state.phase = "action";
  touch(state);
  return { state, events: [{ type: "debt_settled" }] };
}

function sendToJail(state: GameState, player: PlayerState): void {
  player.position = 10;
  player.jailed = true;
  player.jailTurns = 0;
  player.doublesCount = 0;
  state.phase = "action";
  state.lastCard = null;
  log(state, `${player.username} was sent to Jail!`, "jail", player.id);
  replay(state, "jail", { playerId: player.id });
}

function passGo(state: GameState, player: PlayerState): void {
  player.cash += state.settings.salaryAtGo;
  log(
    state,
    `${player.username} passed GO and collected ₹${state.settings.salaryAtGo}`,
    "system",
    player.id
  );
}

function movePlayer(
  state: GameState,
  _board: BoardDefinition,
  player: PlayerState,
  steps: number,
  collectGo = true
): void {
  const prev = player.position;
  // Proper modulo for negative steps (Chance: go back 3)
  player.position = ((player.position + steps) % 40 + 40) % 40;
  if (collectGo && steps > 0 && player.position < prev) {
    passGo(state, player);
  }
}

function advanceTo(
  state: GameState,
  board: BoardDefinition,
  player: PlayerState,
  target: number,
  collectGo = true
): void {
  const prev = player.position;
  player.position = target;
  if (collectGo && target < prev) {
    passGo(state, player);
  }
}

function nearestOfType(
  board: BoardDefinition,
  from: number,
  type: "railroad" | "utility"
): number {
  for (let i = 1; i <= 40; i++) {
    const id = (from + i) % 40;
    if (board.tiles[id]?.type === type) return id;
  }
  return from;
}

function drawCard(
  state: GameState,
  deck: "chance" | "community"
): CardDefinition {
  const cards = loadCards();
  const deckKey = deck === "chance" ? "chanceDeck" : "communityDeck";
  const discardKey = deck === "chance" ? "discardedChance" : "discardedCommunity";
  const source = deck === "chance" ? cards.chance : cards.communityChest;

  if (state[deckKey].length === 0) {
    state[deckKey] = shuffle(state[discardKey].length ? state[discardKey] : source.map((c) => c.id));
    state[discardKey] = [];
  }

  const cardId = state[deckKey].shift()!;
  const card = source.find((c) => c.id === cardId)!;

  if (card.action !== "get_out_of_jail") {
    state[discardKey].push(cardId);
  }

  return card;
}

function applyCard(
  state: GameState,
  board: BoardDefinition,
  player: PlayerState,
  card: CardDefinition
): void {
  state.lastCard = card;
  state.phase = "card";
  log(state, `${player.username} drew: ${card.title} — ${card.description}`, "card", player.id);
  replay(state, "card", { playerId: player.id, card });

  switch (card.action) {
    case "advance_to_go":
      advanceTo(state, board, player, 0, false);
      player.cash += state.settings.salaryAtGo;
      break;
    case "go_to_jail":
      sendToJail(state, player);
      return;
    case "go_back":
      movePlayer(state, board, player, -(card.spaces ?? 3), false);
      resolveLanding(state, board, player, state.dice?.total ?? 0);
      return;
    case "pay_bank":
      tryPay(state, board, player, card.amount ?? 0, null, card.title);
      break;
    case "collect_bank":
      player.cash += card.amount ?? 0;
      break;
    case "pay_each_player": {
      const others = activePlayers(state).filter((p) => p.id !== player.id);
      const each = card.amount ?? 0;
      for (const other of others) {
        const result = tryPay(state, board, player, each, other.id, card.title);
        if (!result.paid) return; // pending debt set — stop
      }
      break;
    }
    case "collect_each_player": {
      for (const other of activePlayers(state).filter((p) => p.id !== player.id)) {
        const result = tryPay(state, board, other, card.amount ?? 0, player.id, card.title);
        if (!result.paid) return; // debtor must resolve — keep bankruptcy phase
      }
      break;
    }
    case "advance_to":
      if (card.targetTileId !== undefined) {
        advanceTo(state, board, player, card.targetTileId, true);
        resolveLanding(state, board, player, state.dice?.total ?? 0);
        return;
      }
      break;
    case "nearest_railroad": {
      const target = nearestOfType(board, player.position, "railroad");
      advanceTo(state, board, player, target, true);
      const owner = findOwner(state, target);
      if (owner && owner.id !== player.id) {
        const rent = calculateRent(state, board, target, state.dice?.total ?? 0) * 2;
        tryPay(state, board, player, rent, owner.id, `double railroad rent at ${getTile(board, target).name}`);
      } else if (!owner) {
        state.pendingPurchase = { tileId: target, playerId: player.id };
        state.phase = "buying";
        return;
      }
      break;
    }
    case "nearest_utility": {
      const target = nearestOfType(board, player.position, "utility");
      advanceTo(state, board, player, target, true);
      const owner = findOwner(state, target);
      if (owner && owner.id !== player.id) {
        const roll = rollDie() + rollDie();
        tryPay(state, board, player, roll * 10, owner.id, `utility rent (×10)`);
      } else if (!owner) {
        state.pendingPurchase = { tileId: target, playerId: player.id };
        state.phase = "buying";
        return;
      }
      break;
    }
    case "get_out_of_jail":
      player.getOutOfJailCards += 1;
      player.heldJailCardIds.push(card.id);
      break;
    case "repairs": {
      let cost = 0;
      for (const prop of player.properties) {
        if (prop.houses === 5) cost += card.perHotel ?? 0;
        else cost += prop.houses * (card.perHouse ?? 0);
      }
      tryPay(state, board, player, cost, null, card.title);
      break;
    }
    default:
      break;
  }
  // Leave phase as "card" so the modal stays open until dismiss_card
  // (unless tryPay/buy/jail already changed the phase)
}

function resolveLanding(
  state: GameState,
  board: BoardDefinition,
  player: PlayerState,
  diceTotal: number
): void {
  const tile = getTile(board, player.position);
  replay(state, "land", { playerId: player.id, tileId: tile.id });

  switch (tile.type) {
    case "go":
      state.phase = "action";
      break;
    case "jail":
      state.phase = "action";
      break;
    case "free_parking":
      if (state.settings.freeParkingJackpot && state.freeParkingPot > 0) {
        player.cash += state.freeParkingPot;
        log(
          state,
          `${player.username} collected Free Parking jackpot of ₹${state.freeParkingPot}!`,
          "system",
          player.id
        );
        state.freeParkingPot = 0;
      }
      state.phase = "action";
      break;
    case "go_to_jail":
      sendToJail(state, player);
      break;
    case "tax": {
      const amount = tile.taxAmount;
      tryPay(state, board, player, amount, null, tile.name);
      if (state.phase !== "bankruptcy") state.phase = "action";
      break;
    }
    case "chance":
      applyCard(state, board, player, drawCard(state, "chance"));
      break;
    case "community_chest":
      applyCard(state, board, player, drawCard(state, "community"));
      break;
    case "property":
    case "railroad":
    case "utility": {
      const owner = findOwner(state, tile.id);
      if (!owner) {
        state.pendingPurchase = { tileId: tile.id, playerId: player.id };
        state.phase = "buying";
      } else if (owner.id !== player.id) {
        const rent = calculateRent(state, board, tile.id, diceTotal);
        tryPay(state, board, player, rent, owner.id, `rent on ${tile.name}`);
        if (state.phase !== "bankruptcy") state.phase = "action";
      } else {
        state.phase = "action";
      }
      break;
    }
    default:
      state.phase = "action";
  }
}

function startTurnTimer(state: GameState): void {
  state.turnStartedAt = Date.now();
  if (state.settings.timePerTurn > 0) {
    state.turnEndsAt = Date.now() + state.settings.timePerTurn * 1000;
  } else {
    state.turnEndsAt = null;
  }
}

function checkWinner(state: GameState): boolean {
  const alive = activePlayers(state);
  if (alive.length === 1) {
    state.phase = "ended";
    state.winnerId = alive[0].id;
    state.endedAt = Date.now();
    log(state, `${alive[0].username} wins the game!`, "win", alive[0].id);
    replay(state, "win", { winnerId: alive[0].id });
    return true;
  }
  return false;
}

export function createGameState(params: {
  roomCode: string;
  hostId: string;
  players: PlayerState[];
  settings?: Partial<GameSettings>;
  boardId?: string;
}): GameState {
  const cards = loadCards();
  const settings = { ...DEFAULT_GAME_SETTINGS, ...params.settings };
  const now = Date.now();

  const state: GameState = {
    id: createId(),
    roomCode: params.roomCode,
    hostId: params.hostId,
    phase: "rolling",
    players: params.players.map((p) => ({
      ...p,
      cash: settings.startingMoney,
      position: 0,
      properties: [],
      getOutOfJailCards: 0,
      heldJailCardIds: [],
      bankrupt: false,
      jailed: false,
      jailTurns: 0,
      doublesCount: 0,
      isReady: true,
      netWorth: settings.startingMoney,
    })),
    currentPlayerIndex: 0,
    boardId: params.boardId ?? "india-cities",
    settings,
    dice: null,
    freeParkingPot: 0,
    housesInBank: 32,
    hotelsInBank: 12,
    auction: null,
    trade: null,
    pendingPurchase: null,
    pendingDebt: null,
    lastCard: null,
    turnStartedAt: now,
    turnEndsAt: settings.timePerTurn > 0 ? now + settings.timePerTurn * 1000 : null,
    winnerId: null,
    log: [],
    chanceDeck: shuffle(cards.chance.map((c) => c.id)),
    communityDeck: shuffle(cards.communityChest.map((c) => c.id)),
    discardedChance: [],
    discardedCommunity: [],
    paused: false,
    phaseBeforePause: null,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    endedAt: null,
    replayEvents: [],
  };

  log(state, "Game started! Good luck!", "system");
  return state;
}

export function rollDice(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (state.paused) return { state, events, error: "Game is paused" };
  if (state.phase === "ended") return { state, events, error: "Game has ended" };

  const player = currentPlayer(state);
  if (player.id !== playerId) return { state, events, error: "Not your turn" };
  if (!["rolling", "jail_choice"].includes(state.phase) && !(player.jailed && state.phase === "rolling")) {
    if (state.phase !== "rolling") return { state, events, error: "Cannot roll now" };
  }

  const board = loadBoard(state.boardId);
  const die1 = rollDie();
  const die2 = rollDie();
  const dice: DiceResult = {
    die1,
    die2,
    total: die1 + die2,
    isDoubles: die1 === die2,
  };
  state.dice = dice;
  events.push({ type: "dice_rolled", payload: dice });
  log(state, `${player.username} rolled ${die1} + ${die2} = ${dice.total}${dice.isDoubles ? " (doubles!)" : ""}`, "roll", player.id);
  replay(state, "roll", { playerId, dice });

  if (player.jailed) {
    if (dice.isDoubles) {
      player.jailed = false;
      player.jailTurns = 0;
      player.doublesCount = 0;
      log(state, `${player.username} rolled doubles and left Jail!`, "jail", player.id);
      state.phase = "moving";
      movePlayer(state, board, player, dice.total, true);
      resolveLanding(state, board, player, dice.total);
    } else {
      player.jailTurns += 1;
      if (player.jailTurns >= 3) {
        const pay = tryPay(state, board, player, 500, null, "jail fine after 3 turns");
        if (pay.paid) {
          player.jailed = false;
          player.jailTurns = 0;
          movePlayer(state, board, player, dice.total, true);
          resolveLanding(state, board, player, dice.total);
        }
      } else {
        state.phase = "action";
        log(state, `${player.username} remains in Jail (${player.jailTurns}/3)`, "jail", player.id);
      }
    }
    refreshNetWorth(state, board);
    touch(state);
    return { state, events };
  }

  if (dice.isDoubles) {
    player.doublesCount += 1;
    if (player.doublesCount >= 3) {
      sendToJail(state, player);
      refreshNetWorth(state, board);
      touch(state);
      return { state, events };
    }
  } else {
    player.doublesCount = 0;
  }

  state.phase = "moving";
  movePlayer(state, board, player, dice.total, true);
  resolveLanding(state, board, player, dice.total);
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function buyProperty(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (state.phase !== "buying" || !state.pendingPurchase) {
    return { state, events, error: "No property available to buy" };
  }
  if (state.pendingPurchase.playerId !== playerId) {
    return { state, events, error: "Not your purchase" };
  }

  const board = loadBoard(state.boardId);
  const player = findPlayer(state, playerId);
  if (!player) return { state, events, error: "Player not found" };

  const tile = getTile(board, state.pendingPurchase.tileId);
  if (player.cash < tile.price) return { state, events, error: "Not enough cash" };

  player.cash -= tile.price;
  player.properties.push({ tileId: tile.id, houses: 0, mortgaged: false });
  log(state, `${player.username} bought ${tile.name} for ₹${tile.price}`, "buy", player.id);
  replay(state, "buy", { playerId, tileId: tile.id, price: tile.price });
  events.push({ type: "property_bought", payload: { tileId: tile.id, playerId } });

  state.pendingPurchase = null;
  state.phase = "action";
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function declinePurchase(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (state.phase !== "buying" || !state.pendingPurchase) {
    return { state, events, error: "No pending purchase" };
  }
  if (state.pendingPurchase.playerId !== playerId) {
    return { state, events, error: "Not your purchase" };
  }

  const tileId = state.pendingPurchase.tileId;
  state.pendingPurchase = null;

  if (state.settings.auctionEnabled && state.settings.auctionOnDecline) {
    const participants = activePlayers(state).map((p) => p.id);
    state.auction = {
      tileId,
      highestBid: 0,
      highestBidderId: null,
      participants,
      currentBidderIndex: 0,
      endsAt: Date.now() + 30000,
    };
    state.phase = "auction";
    log(state, `Auction started for tile #${tileId}`, "system");
  } else {
    state.phase = "action";
  }

  touch(state);
  return { state, events };
}

export function placeAuctionBid(
  state: GameState,
  playerId: string,
  amount: number
): EngineResult {
  const events: EngineResult["events"] = [];
  if (state.phase !== "auction" || !state.auction) {
    return { state, events, error: "No active auction" };
  }

  const player = findPlayer(state, playerId);
  if (!player || player.bankrupt) return { state, events, error: "Invalid player" };
  if (!state.auction.participants.includes(playerId)) {
    return { state, events, error: "Not in auction" };
  }
  if (amount <= state.auction.highestBid) {
    return { state, events, error: "Bid must be higher" };
  }
  if (player.cash < amount) return { state, events, error: "Not enough cash" };

  state.auction.highestBid = amount;
  state.auction.highestBidderId = playerId;
  state.auction.endsAt = Date.now() + 15000;
  log(state, `${player.username} bid ₹${amount}`, "buy", playerId);
  touch(state);
  return { state, events };
}

export function resolveAuction(state: GameState, playerId?: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (!state.auction) return { state, events, error: "No auction" };

  const expired = Date.now() >= state.auction.endsAt;
  if (playerId) {
    const isHost = playerId === state.hostId;
    if (!expired && !isHost) {
      return {
        state,
        events,
        error: "Auction still open — wait for the timer or ask the host to end it",
      };
    }
  }

  const board = loadBoard(state.boardId);
  const auction = state.auction;

  if (auction.highestBidderId && auction.highestBid > 0) {
    const winner = findPlayer(state, auction.highestBidderId);
    if (winner && winner.cash >= auction.highestBid) {
      winner.cash -= auction.highestBid;
      winner.properties.push({ tileId: auction.tileId, houses: 0, mortgaged: false });
      const tile = getTile(board, auction.tileId);
      log(state, `${winner.username} won auction for ${tile.name} at ₹${auction.highestBid}`, "buy", winner.id);
    } else if (winner) {
      log(state, `${winner.username} could not afford their winning bid — auction void`, "system");
    }
  } else {
    log(state, "Auction ended with no bids", "system");
  }

  state.auction = null;
  state.phase = "action";
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function buildHouse(state: GameState, playerId: string, tileId: number): EngineResult {
  const events: EngineResult["events"] = [];
  const player = currentPlayer(state);
  if (player.id !== playerId) return { state, events, error: "Not your turn" };
  if (!["action", "building", "rolling"].includes(state.phase) && state.phase !== "action") {
    // allow building during action phase
  }
  if (state.phase !== "action" && state.phase !== "building") {
    return { state, events, error: "Cannot build now" };
  }

  const board = loadBoard(state.boardId);
  const tile = getTile(board, tileId);
  if (tile.type !== "property") return { state, events, error: "Cannot build here" };

  const owned = getOwned(player, tileId);
  if (!owned || owned.mortgaged) return { state, events, error: "You don't own this property" };
  if (!ownsColorGroup(board, player, tile.colorGroup)) {
    return { state, events, error: "Need complete color group" };
  }
  if (owned.houses >= 5) return { state, events, error: "Already has hotel" };

  if (state.settings.evenBuild) {
    const groupProps = player.properties.filter((p) => {
      const t = board.tiles.find((x) => x.id === p.tileId);
      return t?.colorGroup === tile.colorGroup;
    });
    const minHouses = Math.min(...groupProps.map((p) => p.houses));
    if (owned.houses > minHouses) {
      return { state, events, error: "Must build evenly across the color group" };
    }
  }

  if (player.cash < tile.houseCost) return { state, events, error: "Not enough cash" };

  // Classic bank supply: 32 houses / 12 hotels
  if (owned.houses === 4) {
    if (state.hotelsInBank <= 0) {
      return { state, events, error: "No hotels left in the bank" };
    }
    state.housesInBank += 4;
    state.hotelsInBank -= 1;
    owned.houses = 5;
  } else {
    if (state.housesInBank <= 0) {
      return { state, events, error: "No houses left in the bank" };
    }
    state.housesInBank -= 1;
    owned.houses += 1;
  }

  player.cash -= tile.houseCost;
  const label = owned.houses === 5 ? "hotel" : `house (${owned.houses})`;
  log(state, `${player.username} built a ${label} on ${tile.name}`, "build", playerId);
  replay(state, "build", { playerId, tileId, houses: owned.houses });
  events.push({ type: "built", payload: { tileId, houses: owned.houses } });

  state.phase = "action";
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function sellHouse(state: GameState, playerId: string, tileId: number): EngineResult {
  const events: EngineResult["events"] = [];
  const player = findPlayer(state, playerId);
  if (!player) return { state, events, error: "Player not found" };

  const isDebtor =
    state.phase === "bankruptcy" && state.pendingDebt?.playerId === playerId;
  const isTurn = currentPlayer(state).id === playerId;
  if (!isTurn && !isDebtor) return { state, events, error: "Not your turn" };

  const board = loadBoard(state.boardId);
  const tile = getTile(board, tileId);
  const owned = getOwned(player, tileId);
  if (!owned || owned.houses <= 0) return { state, events, error: "No houses to sell" };

  if (state.settings.evenBuild) {
    const groupProps = player.properties.filter((p) => {
      const t = board.tiles.find((x) => x.id === p.tileId);
      return t?.colorGroup === tile.colorGroup;
    });
    const maxHouses = Math.max(...groupProps.map((p) => p.houses));
    if (owned.houses < maxHouses) {
      return { state, events, error: "Must sell evenly across the color group" };
    }
  }

  if (owned.houses === 5) {
    // Break hotel into 4 houses — bank must have 4 houses available
    if (state.housesInBank < 4) {
      return {
        state,
        events,
        error: "Not enough houses in the bank to break this hotel",
      };
    }
    state.hotelsInBank += 1;
    state.housesInBank -= 4;
    owned.houses = 4;
  } else {
    state.housesInBank += 1;
    owned.houses -= 1;
  }

  const refund = Math.floor(tile.houseCost / 2);
  player.cash += refund;
  log(state, `${player.username} sold a building on ${tile.name} for ₹${refund}`, "build", playerId);
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function mortgageProperty(
  state: GameState,
  playerId: string,
  tileId: number
): EngineResult {
  const events: EngineResult["events"] = [];
  const player = findPlayer(state, playerId);
  if (!player) return { state, events, error: "Player not found" };

  // Own turn, or resolving your own debt
  const isDebtor =
    state.phase === "bankruptcy" && state.pendingDebt?.playerId === playerId;
  const isTurn = currentPlayer(state).id === playerId;
  if (!isTurn && !isDebtor) return { state, events, error: "Not your turn" };

  const board = loadBoard(state.boardId);
  const tile = getTile(board, tileId);
  const owned = getOwned(player, tileId);
  if (!owned) return { state, events, error: "You don't own this" };
  if (owned.mortgaged) return { state, events, error: "Already mortgaged" };
  if (owned.houses > 0) return { state, events, error: "Sell houses first" };

  owned.mortgaged = true;
  player.cash += tile.mortgageValue;
  log(state, `${player.username} mortgaged ${tile.name} for ₹${tile.mortgageValue}`, "system", playerId);
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function unmortgageProperty(
  state: GameState,
  playerId: string,
  tileId: number
): EngineResult {
  const events: EngineResult["events"] = [];
  const player = findPlayer(state, playerId);
  if (!player) return { state, events, error: "Player not found" };

  const board = loadBoard(state.boardId);
  const tile = getTile(board, tileId);
  const owned = getOwned(player, tileId);
  if (!owned?.mortgaged) return { state, events, error: "Not mortgaged" };

  const cost = Math.ceil(tile.mortgageValue * 1.1);
  if (player.cash < cost) return { state, events, error: "Not enough cash" };

  player.cash -= cost;
  owned.mortgaged = false;
  log(state, `${player.username} unmortgaged ${tile.name} for ₹${cost}`, "system", playerId);
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function payJailFine(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  const player = currentPlayer(state);
  if (player.id !== playerId) return { state, events, error: "Not your turn" };
  if (!player.jailed) return { state, events, error: "Not in jail" };

  const board = loadBoard(state.boardId);
  const result = tryPay(state, board, player, 500, null, "jail fine");
  if (!result.paid) return { state, events, error: "Cannot afford fine" };

  player.jailed = false;
  player.jailTurns = 0;
  state.phase = "rolling";
  log(state, `${player.username} paid ₹500 to leave Jail`, "jail", playerId);
  touch(state);
  return { state, events };
}

export function redeemJailCard(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  const player = currentPlayer(state);
  if (player.id !== playerId) return { state, events, error: "Not your turn" };
  if (!player.jailed) return { state, events, error: "Not in jail" };
  if (player.getOutOfJailCards <= 0) return { state, events, error: "No jail cards" };

  player.getOutOfJailCards -= 1;
  const cardId = player.heldJailCardIds.pop() ?? "ch5";
  if (cardId.startsWith("cc")) state.discardedCommunity.push(cardId);
  else state.discardedChance.push(cardId);
  player.jailed = false;
  player.jailTurns = 0;
  state.phase = "rolling";
  log(state, `${player.username} used a Get Out of Jail Free card`, "jail", playerId);
  touch(state);
  return { state, events };
}

export function endTurn(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (state.paused) return { state, events, error: "Game is paused" };
  if (state.phase === "ended") return { state, events, error: "Game ended" };
  if (
    state.phase === "buying" ||
    state.phase === "auction" ||
    state.phase === "bankruptcy" ||
    state.phase === "card" ||
    state.phase === "trading"
  ) {
    return { state, events, error: "Resolve current action first" };
  }

  const player = currentPlayer(state);
  if (player.id !== playerId) return { state, events, error: "Not your turn" };

  // Doubles: roll again (unless jailed this turn)
  if (state.dice?.isDoubles && !player.jailed && player.doublesCount > 0 && player.doublesCount < 3) {
    state.phase = "rolling";
    startTurnTimer(state);
    log(state, `${player.username} rolled doubles — roll again!`, "roll", playerId);
    touch(state);
    return { state, events: [{ type: "doubles_reroll" }] };
  }

  const alive = activePlayers(state);
  if (alive.length === 0) return { state, events, error: "No players left" };

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  let guard = 0;
  while (state.players[nextIndex].bankrupt || state.players[nextIndex].isSpectator) {
    nextIndex = (nextIndex + 1) % state.players.length;
    guard++;
    if (guard > state.players.length) break;
  }

  state.currentPlayerIndex = nextIndex;
  state.dice = null;
  state.lastCard = null;
  state.pendingPurchase = null;
  const next = currentPlayer(state);
  next.doublesCount = 0;
  state.phase = next.jailed ? "jail_choice" : "rolling";
  startTurnTimer(state);
  log(state, `It's ${next.username}'s turn`, "system", next.id);
  events.push({ type: "turn_changed", payload: { playerId: next.id } });
  touch(state);
  return { state, events };
}

export function proposeTrade(
  state: GameState,
  fromPlayerId: string,
  offer: Omit<TradeOffer, "id" | "status" | "createdAt" | "fromPlayerId">
): EngineResult {
  const events: EngineResult["events"] = [];
  const from = findPlayer(state, fromPlayerId);
  const to = findPlayer(state, offer.toPlayerId);
  if (!from || !to) return { state, events, error: "Invalid players" };
  if (from.bankrupt || to.bankrupt) return { state, events, error: "Cannot trade with bankrupt player" };
  if (currentPlayer(state).id !== fromPlayerId) {
    return { state, events, error: "Only current player can propose trades" };
  }
  if (state.phase !== "action" && state.phase !== "building") {
    return { state, events, error: "Cannot trade now" };
  }

  for (const tileId of offer.offerProperties) {
    const owned = getOwned(from, tileId);
    if (!owned) return { state, events, error: "You don't own offered property" };
    if (owned.houses > 0) return { state, events, error: "Sell houses before trading property" };
  }
  for (const tileId of offer.requestProperties) {
    const owned = getOwned(to, tileId);
    if (!owned) return { state, events, error: "They don't own requested property" };
    if (owned.houses > 0) return { state, events, error: "They must sell houses first" };
  }
  if (from.cash < offer.offerCash) return { state, events, error: "Not enough cash to offer" };
  if (from.getOutOfJailCards < offer.offerJailCards) {
    return { state, events, error: "Not enough jail cards" };
  }

  const trade: TradeOffer = {
    id: createId(),
    fromPlayerId,
    ...offer,
    status: "pending",
    createdAt: Date.now(),
  };
  state.trade = trade;
  state.phase = "trading";
  log(state, `${from.username} proposed a trade to ${to.username}`, "trade", fromPlayerId);
  touch(state);
  return { state, events };
}

export function respondToTrade(
  state: GameState,
  playerId: string,
  accept: boolean
): EngineResult {
  const events: EngineResult["events"] = [];
  if (!state.trade || state.trade.status !== "pending") {
    return { state, events, error: "No pending trade" };
  }
  if (state.trade.toPlayerId !== playerId) {
    return { state, events, error: "Not the trade recipient" };
  }

  const board = loadBoard(state.boardId);
  const trade = state.trade;
  const from = findPlayer(state, trade.fromPlayerId)!;
  const to = findPlayer(state, trade.toPlayerId)!;

  if (!accept) {
    trade.status = "rejected";
    state.trade = null;
    state.phase = "action";
    log(state, `${to.username} rejected the trade`, "trade", playerId);
    touch(state);
    return { state, events };
  }

  if (to.cash < trade.requestCash) {
    return { state, events, error: "Not enough cash to accept" };
  }
  if (to.getOutOfJailCards < trade.requestJailCards) {
    return { state, events, error: "Not enough jail cards to accept" };
  }
  if (from.cash < trade.offerCash) {
    return { state, events, error: "Offer is no longer valid" };
  }

  // Execute trade
  from.cash -= trade.offerCash;
  to.cash += trade.offerCash;
  to.cash -= trade.requestCash;
  from.cash += trade.requestCash;

  for (const tileId of trade.offerProperties) {
    const idx = from.properties.findIndex((p) => p.tileId === tileId);
    if (idx >= 0) {
      const [prop] = from.properties.splice(idx, 1);
      to.properties.push(prop);
    }
  }
  for (const tileId of trade.requestProperties) {
    const idx = to.properties.findIndex((p) => p.tileId === tileId);
    if (idx >= 0) {
      const [prop] = to.properties.splice(idx, 1);
      from.properties.push(prop);
    }
  }

  from.getOutOfJailCards -= trade.offerJailCards;
  to.getOutOfJailCards += trade.offerJailCards;
  for (let i = 0; i < trade.offerJailCards; i++) {
    const id = from.heldJailCardIds.pop();
    if (id) to.heldJailCardIds.push(id);
  }
  to.getOutOfJailCards -= trade.requestJailCards;
  from.getOutOfJailCards += trade.requestJailCards;
  for (let i = 0; i < trade.requestJailCards; i++) {
    const id = to.heldJailCardIds.pop();
    if (id) from.heldJailCardIds.push(id);
  }

  trade.status = "accepted";
  state.trade = null;
  state.phase = "action";
  log(state, `Trade between ${from.username} and ${to.username} completed!`, "trade");
  replay(state, "trade", trade);
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function declareBankruptcy(
  state: GameState,
  playerId: string,
  creditorId: string | null
): EngineResult {
  const events: EngineResult["events"] = [];
  const player = findPlayer(state, playerId);
  if (!player) return { state, events, error: "Player not found" };
  if (player.bankrupt) return { state, events, error: "Already bankrupt" };

  const board = loadBoard(state.boardId);
  // Prefer pending debt creditor if not provided
  const resolvedCreditorId =
    creditorId ?? state.pendingDebt?.toPlayerId ?? null;
  const creditor = resolvedCreditorId
    ? findPlayer(state, resolvedCreditorId)
    : null;

  if (creditor && creditor.id !== player.id) {
    creditor.cash += player.cash;
    for (const prop of player.properties) {
      if (prop.houses > 0) {
        const tile = getTile(board, prop.tileId);
        const houseValue =
          prop.houses === 5
            ? Math.floor((tile.houseCost * 5) / 2)
            : Math.floor((tile.houseCost * prop.houses) / 2);
        creditor.cash += houseValue;
        // Return buildings to bank supply
        if (prop.houses === 5) state.hotelsInBank += 1;
        else state.housesInBank += prop.houses;
        prop.houses = 0;
      }
      // Transfer as-is (keep mortgage status)
      creditor.properties.push(prop);
    }
    creditor.getOutOfJailCards += player.getOutOfJailCards;
    creditor.heldJailCardIds.push(...player.heldJailCardIds);
  } else {
    // Assets return to bank — sell buildings, properties become unowned
    addToPot(state, player.cash);
    for (const prop of player.properties) {
      if (prop.houses > 0) {
        const tile = getTile(board, prop.tileId);
        const houseValue =
          prop.houses === 5
            ? Math.floor((tile.houseCost * 5) / 2)
            : Math.floor((tile.houseCost * prop.houses) / 2);
        addToPot(state, houseValue);
        if (prop.houses === 5) state.hotelsInBank += 1;
        else state.housesInBank += prop.houses;
      }
    }
    // Return held jail cards to discard piles
    for (const id of player.heldJailCardIds) {
      if (id.startsWith("cc")) state.discardedCommunity.push(id);
      else state.discardedChance.push(id);
    }
  }

  player.cash = 0;
  player.properties = [];
  player.getOutOfJailCards = 0;
  player.heldJailCardIds = [];
  player.bankrupt = true;
  state.pendingDebt = null;

  log(state, `${player.username} went bankrupt!`, "bankrupt", playerId);
  replay(state, "bankrupt", { playerId, creditorId: resolvedCreditorId });
  events.push({ type: "bankrupt", payload: { playerId } });

  if (checkWinner(state)) {
    refreshNetWorth(state, board);
    touch(state);
    return { state, events };
  }

  if (currentPlayer(state).id === playerId) {
    state.phase = "action";
    return endTurn(state, playerId);
  }

  state.phase = "action";
  refreshNetWorth(state, board);
  touch(state);
  return { state, events };
}

export function dismissCard(state: GameState, playerId: string): EngineResult {
  const events: EngineResult["events"] = [];
  if (state.phase !== "card") return { state, events, error: "No card to dismiss" };
  const player = currentPlayer(state);
  if (player.id !== playerId) return { state, events, error: "Not your turn" };
  state.phase = "action";
  state.lastCard = null;
  touch(state);
  return { state, events };
}

export function forceEndTurnOnTimeout(state: GameState): EngineResult {
  const auctionExpired =
    state.phase === "auction" &&
    !!state.auction &&
    Date.now() >= state.auction.endsAt;
  const turnExpired = !!state.turnEndsAt && Date.now() >= state.turnEndsAt;

  if (!auctionExpired && !turnExpired) {
    return { state, events: [], error: "Timer not expired" };
  }
  if (state.phase === "ended" || state.paused) return { state, events: [] };

  // Auction timer alone: close auction, leave turn open
  if (auctionExpired && !turnExpired) {
    return resolveAuction(state);
  }

  const player = currentPlayer(state);
  log(state, `${player.username}'s turn timed out`, "system", player.id);

  if (state.phase === "buying" && state.pendingPurchase) {
    // Auto-decline → auction if enabled
    return declinePurchase(state, player.id);
  }
  if (state.phase === "auction") {
    resolveAuction(state);
  }
  if (state.phase === "trading") {
    state.trade = null;
  }
  if (state.phase === "card") {
    state.lastCard = null;
  }
  // Unpaid debt on timeout → bankrupt to creditor
  if (state.phase === "bankruptcy" && state.pendingDebt) {
    return declareBankruptcy(
      state,
      state.pendingDebt.playerId,
      state.pendingDebt.toPlayerId
    );
  }

  state.phase = "action";
  return endTurn(state, player.id);
}

export function pauseGame(state: GameState, hostId: string): EngineResult {
  if (state.hostId !== hostId) return { state, events: [], error: "Only host can pause" };
  state.phaseBeforePause = state.phase;
  state.paused = true;
  state.phase = "paused";
  log(state, "Game paused by host", "system");
  touch(state);
  return { state, events: [{ type: "paused" }] };
}

export function resumeGame(state: GameState, hostId: string): EngineResult {
  if (state.hostId !== hostId) return { state, events: [], error: "Only host can resume" };
  state.paused = false;
  state.phase =
    state.phaseBeforePause && state.phaseBeforePause !== "paused"
      ? state.phaseBeforePause
      : currentPlayer(state).jailed
        ? "jail_choice"
        : "rolling";
  state.phaseBeforePause = null;
  startTurnTimer(state);
  log(state, "Game resumed", "system");
  touch(state);
  return { state, events: [{ type: "resumed" }] };
}

export function restartGame(state: GameState, hostId: string): EngineResult {
  if (state.hostId !== hostId) return { state, events: [], error: "Only host can restart" };
  const fresh = createGameState({
    roomCode: state.roomCode,
    hostId: state.hostId,
    players: state.players.map((p) => ({
      ...p,
      bankrupt: false,
      isSpectator: false,
    })),
    settings: state.settings,
    boardId: state.boardId,
  });
  fresh.id = state.id;
  return { state: fresh, events: [{ type: "restarted" }] };
}
