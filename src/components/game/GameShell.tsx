"use client";

import { useGameStore } from "@/store/game-store";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { PropertyPanel } from "@/components/game/PropertyPanel";
import { PortfolioPanel } from "@/components/game/PortfolioPanel";
import { ActionBar } from "@/components/game/ActionBar";
import { GameModals } from "@/components/game/GameModals";
import { ChatPanel } from "@/components/game/ChatPanel";
import { TradePanel } from "@/components/game/TradePanel";
import { VictoryScreen } from "@/components/game/VictoryScreen";
import { AdminControls } from "@/components/game/AdminControls";
import { LobbyRoom } from "@/components/lobby/LobbyRoom";
import { themes } from "@/lib/game-data";
import { Volume2, VolumeX } from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";

export function GameShell() {
  useAutoSave();
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const theme = useGameStore((s) => s.theme);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const connected = useGameStore((s) => s.connected);

  if (!room) return null;

  const themeConfig = themes[room.theme] ?? themes[theme] ?? themes.classic;
  const game = room.game;

  if (room.status === "waiting" || !game) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${themeConfig.boardBg} p-4 sm:p-8`}>
        <LobbyRoom />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeConfig.boardBg} text-white`}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 backdrop-blur-md">
        <div>
          <p className="font-display text-xl font-black tracking-tight text-amber-300">
            Monopoly Royale
          </p>
          <p className="text-xs text-white/50">
            Room {room.code} · {connected ? "Online" : "Reconnecting…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="rounded-xl border border-white/15 bg-white/5 p-2 hover:bg-white/10"
          aria-label="Toggle sound"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-3 lg:grid-cols-[320px_1fr_300px] lg:p-4">
        <aside className="order-1 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <ActionBar game={game} />
          <PlayerPanel game={game} currentPlayerId={playerId} />
          <TradePanel game={game} />
          <AdminControls room={room} />
        </aside>

        <main className="order-2">
          <GameBoard game={game} />
        </main>

        <aside className="order-3 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <PortfolioPanel game={game} />
          <PropertyPanel game={game} />
          <ChatPanel />
        </aside>
      </div>

      {game.phase === "ended" && <VictoryScreen game={game} />}
      <GameModals game={game} />
      {game.paused && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center">
          <div className="rounded-full bg-amber-500/90 px-4 py-2 text-sm font-bold text-black shadow-lg">
            Game Paused
          </div>
        </div>
      )}
    </div>
  );
}
