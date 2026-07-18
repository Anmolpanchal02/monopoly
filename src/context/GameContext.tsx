"use client";

import { createContext, useContext, useMemo } from "react";
import { useGameStore } from "@/store/game-store";
import type { GameState, RoomState } from "@/types/game";

type GameContextValue = {
  room: RoomState | null;
  game: GameState | null;
  playerId: string | null;
  isMyTurn: boolean;
  isHost: boolean;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);

  const value = useMemo<GameContextValue>(() => {
    const game = room?.game ?? null;
    const isMyTurn =
      !!game &&
      !!playerId &&
      game.players[game.currentPlayerIndex]?.id === playerId;
    const isHost = !!room && room.hostId === playerId;
    return { room, game, playerId, isMyTurn, isHost };
  }, [room, playerId]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProvider");
  return ctx;
}
