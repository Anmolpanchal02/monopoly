"use client";

import { motion } from "framer-motion";
import type { GameState, PlayerState } from "@/types/game";
import { formatMoney, getTokenEmoji, cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";

export function PlayerPanel({
  game,
  currentPlayerId,
}: {
  game: GameState;
  currentPlayerId: string | null;
}) {
  return (
    <GlassCard className="flex max-h-[50vh] flex-col overflow-hidden p-3 sm:max-h-none">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
        Players
      </h3>
      <div className="space-y-2 overflow-y-auto pr-1">
        {game.players.map((player, index) => (
          <PlayerRow
            key={player.id}
            player={player}
            isTurn={index === game.currentPlayerIndex && !player.bankrupt}
            isYou={player.id === currentPlayerId}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function PlayerRow({
  player,
  isTurn,
  isYou,
}: {
  player: PlayerState;
  isTurn: boolean;
  isYou: boolean;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border px-3 py-2 transition",
        isTurn
          ? "border-amber-400/60 bg-amber-400/15"
          : "border-white/10 bg-white/5",
        player.bankrupt && "opacity-40 grayscale"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg"
          style={{ borderColor: player.color, backgroundColor: `${player.color}33` }}
        >
          {getTokenEmoji(player.token)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-white">
              {player.username}
              {isYou && <span className="text-amber-300"> (you)</span>}
            </p>
            {!player.isConnected && (
              <span className="text-[10px] text-red-300">offline</span>
            )}
          </div>
          <p className="text-xs text-emerald-300">{formatMoney(player.cash)}</p>
        </div>
        <div className="text-right text-[10px] text-white/50">
          <div>NW {formatMoney(player.netWorth)}</div>
          <div>{player.properties.length} props</div>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
        {isTurn && (
          <span className="rounded bg-amber-400/30 px-1.5 py-0.5 text-amber-200">
            Turn
          </span>
        )}
        {player.jailed && (
          <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-red-200">Jail</span>
        )}
        {player.getOutOfJailCards > 0 && (
          <span className="rounded bg-blue-500/30 px-1.5 py-0.5 text-blue-200">
            🃏×{player.getOutOfJailCards}
          </span>
        )}
        {player.bankrupt && (
          <span className="rounded bg-zinc-500/30 px-1.5 py-0.5">Bankrupt</span>
        )}
      </div>
    </motion.div>
  );
}
