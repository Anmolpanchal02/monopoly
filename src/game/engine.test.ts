import { describe, it, expect, beforeEach } from "vitest";
import {
  createGameState,
  rollDice,
  buyProperty,
  declinePurchase,
  calculateRent,
  buildHouse,
  mortgageProperty,
  endTurn,
  declareBankruptcy,
  payJailFine,
  settleDebt,
  placeAuctionBid,
  resolveAuction,
} from "@/game/engine";
import { loadBoard } from "@/lib/board-loader";
import type { PlayerState } from "@/types/game";
import { PLAYER_COLORS, PLAYER_EMOJIS } from "@/lib/utils";

function makePlayers(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    userId: `u${i}`,
    username: `Player${i}`,
    avatar: "🎩",
    color: PLAYER_COLORS[i],
    emoji: PLAYER_EMOJIS[i],
    token: (["car", "dog", "hat", "ship"] as const)[i % 4],
    cash: 15000,
    position: 0,
    properties: [],
    getOutOfJailCards: 0,
    heldJailCardIds: [],
    bankrupt: false,
    jailed: false,
    jailTurns: 0,
    isReady: true,
    isConnected: true,
    isSpectator: false,
    doublesCount: 0,
    netWorth: 15000,
  }));
}

describe("Game Engine", () => {
  let state = createGameState({
    roomCode: "TEST01",
    hostId: "p0",
    players: makePlayers(2),
  });

  beforeEach(() => {
    state = createGameState({
      roomCode: "TEST01",
      hostId: "p0",
      players: makePlayers(2),
      settings: { timePerTurn: 0, auctionEnabled: false },
    });
  });

  it("creates a game with starting money", () => {
    expect(state.players).toHaveLength(2);
    expect(state.players[0].cash).toBe(15000);
    expect(state.phase).toBe("rolling");
  });

  it("only current player can roll", () => {
    const result = rollDice(state, "p1");
    expect(result.error).toBeTruthy();
  });

  it("rolls dice and moves player", () => {
    const result = rollDice(state, "p0");
    expect(result.error).toBeUndefined();
    expect(result.state.dice).toBeTruthy();
    expect(result.state.dice!.total).toBeGreaterThanOrEqual(2);
    expect(result.state.dice!.total).toBeLessThanOrEqual(12);
  });

  it("buys unowned property", () => {
    state.phase = "buying";
    state.pendingPurchase = { tileId: 1, playerId: "p0" };
    const before = state.players[0].cash;
    const result = buyProperty(state, "p0");
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].cash).toBe(before - 600);
    expect(result.state.players[0].properties.some((p) => p.tileId === 1)).toBe(true);
  });

  it("declines purchase without auction when disabled", () => {
    state.phase = "buying";
    state.pendingPurchase = { tileId: 1, playerId: "p0" };
    const result = declinePurchase(state, "p0");
    expect(result.error).toBeUndefined();
    expect(result.state.phase).toBe("action");
    expect(result.state.auction).toBeNull();
  });

  it("calculates rent for monopoly", () => {
    const board = loadBoard();
    state.players[0].properties = [
      { tileId: 1, houses: 0, mortgaged: false },
      { tileId: 3, houses: 0, mortgaged: false },
    ];
    const rent = calculateRent(state, board, 1, 7);
    expect(rent).toBe(40);
  });

  it("builds houses only with color group", () => {
    state.phase = "action";
    state.players[0].properties = [{ tileId: 1, houses: 0, mortgaged: false }];
    const fail = buildHouse(state, "p0", 1);
    expect(fail.error).toBeTruthy();

    state.players[0].properties = [
      { tileId: 1, houses: 0, mortgaged: false },
      { tileId: 3, houses: 0, mortgaged: false },
    ];
    const ok = buildHouse(state, "p0", 1);
    expect(ok.error).toBeUndefined();
    expect(ok.state.players[0].properties.find((p) => p.tileId === 1)?.houses).toBe(1);
  });

  it("mortgages property", () => {
    state.players[0].properties = [{ tileId: 1, houses: 0, mortgaged: false }];
    const before = state.players[0].cash;
    const result = mortgageProperty(state, "p0", 1);
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].cash).toBe(before + 300);
    expect(result.state.players[0].properties[0].mortgaged).toBe(true);
  });

  it("ends turn and advances player", () => {
    state.phase = "action";
    state.dice = { die1: 2, die2: 3, total: 5, isDoubles: false };
    const result = endTurn(state, "p0");
    expect(result.error).toBeUndefined();
    expect(result.state.currentPlayerIndex).toBe(1);
  });

  it("pays jail fine", () => {
    state.players[0].jailed = true;
    state.phase = "jail_choice";
    const before = state.players[0].cash;
    const result = payJailFine(state, "p0");
    expect(result.error).toBeUndefined();
    expect(result.state.players[0].jailed).toBe(false);
    expect(result.state.players[0].cash).toBe(before - 500);
  });

  it("settles debt after raising cash", () => {
    state.pendingDebt = {
      playerId: "p0",
      amount: 500,
      toPlayerId: "p1",
      reason: "rent",
    };
    state.phase = "bankruptcy";
    state.players[0].cash = 600;
    const result = settleDebt(state, "p0");
    expect(result.error).toBeUndefined();
    expect(result.state.pendingDebt).toBeNull();
    expect(result.state.players[0].cash).toBe(100);
    expect(result.state.players[1].cash).toBe(15500);
    expect(result.state.phase).toBe("action");
  });

  it("enforces house bank supply", () => {
    state.players[0].properties = [
      { tileId: 1, houses: 0, mortgaged: false },
      { tileId: 3, houses: 0, mortgaged: false },
    ];
    state.phase = "action";
    state.housesInBank = 0;
    const fail = buildHouse(state, "p0", 1);
    expect(fail.error).toMatch(/No houses/);
    state.housesInBank = 32;
    const ok = buildHouse(state, "p0", 1);
    expect(ok.error).toBeUndefined();
    expect(ok.state.housesInBank).toBe(31);
  });

  it("only host can end auction early", () => {
    state.phase = "auction";
    state.auction = {
      tileId: 1,
      highestBid: 0,
      highestBidderId: null,
      participants: ["p0", "p1"],
      currentBidderIndex: 0,
      endsAt: Date.now() + 60000,
    };
    state.hostId = "p0";
    const denied = resolveAuction(state, "p1");
    expect(denied.error).toMatch(/still open/);
    const bid = placeAuctionBid(state, "p1", 500);
    expect(bid.error).toBeUndefined();
    const closed = resolveAuction(bid.state, "p0");
    expect(closed.error).toBeUndefined();
    expect(closed.state.auction).toBeNull();
    expect(closed.state.players[1].properties.some((p) => p.tileId === 1)).toBe(true);
  });
});
