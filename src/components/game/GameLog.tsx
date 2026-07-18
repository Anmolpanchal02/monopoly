"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { GameState } from "@/types/game";

export function GameLog({ game }: { game: GameState }) {
  return (
    <GlassCard className="flex max-h-48 flex-col overflow-hidden p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
        Activity
      </h3>
      <div className="space-y-1 overflow-y-auto text-xs text-white/75">
        {game.log.slice(0, 40).map((entry) => (
          <p key={entry.id} className="border-b border-white/5 pb-1">
            <span className="text-white/35">
              {new Date(entry.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>{" "}
            {entry.message}
          </p>
        ))}
      </div>
    </GlassCard>
  );
}
