"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameShell } from "@/components/game/GameShell";
import { useGameStore } from "@/store/game-store";
import { useSocket } from "@/hooks/use-socket";

export default function GamePage() {
  const params = useParams();
  const code = String(params.code ?? "").toUpperCase();
  const room = useGameStore((s) => s.room);
  const { joinRoom } = useSocket();
  const userId = useGameStore((s) => s.userId);
  const username = useGameStore((s) => s.username);
  const router = useRouter();

  useEffect(() => {
    if (!userId || !username) return;
    if (room?.code === code && room.game) return;
    joinRoom(code).then((res) => {
      if (!res.ok) router.push("/");
    });
  }, [code, joinRoom, room, router, userId, username]);

  if (!room?.game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-white">
        Loading game…
      </div>
    );
  }

  return <GameShell />;
}
