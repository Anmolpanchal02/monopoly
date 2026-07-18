"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/game-store";

/** Debounced auto-save of active game state to the API / DB */
export function useAutoSave() {
  const room = useGameStore((s) => s.room);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!room?.game || room.status !== "playing") return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch("/api/games/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          roomCode: room.code,
          state: room.game,
        }),
      }).catch(() => {
        // silent — DB optional in demo mode
      });
    }, 2000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [room]);
}
