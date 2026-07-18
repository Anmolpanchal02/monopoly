"use client";

import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import type { RoomState } from "@/types/game";

export function AdminControls({ room }: { room: RoomState }) {
  const playerId = useGameStore((s) => s.playerId);
  const { sendAction, kick, transferHost } = useSocket();
  const isHost = room.hostId === playerId;

  if (!isHost || !room.game) return null;

  return (
    <GlassCard className="space-y-3 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
        Host Controls
      </h3>
      <div className="flex flex-wrap gap-2">
        {room.game.paused ? (
          <Button size="sm" variant="success" onClick={() => sendAction("resume")}>
            Resume
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => sendAction("pause")}>
            Pause
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => sendAction("restart")}>
          Restart Game
        </Button>
      </div>
      <div className="space-y-1">
        {room.players
          .filter((p) => p.id !== playerId)
          .map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm text-white/80">
              <span>{p.username}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => transferHost(p.id)}>
                  Make host
                </Button>
                <Button size="sm" variant="danger" onClick={() => kick(p.id)}>
                  Kick
                </Button>
              </div>
            </div>
          ))}
      </div>
    </GlassCard>
  );
}
