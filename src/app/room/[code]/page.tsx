"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameShell } from "@/components/game/GameShell";
import { useGameStore } from "@/store/game-store";
import { useSocket } from "@/hooks/use-socket";
import { LobbyRoom } from "@/components/lobby/LobbyRoom";

export default function RoomPage() {
  const params = useParams();
  const code = String(params.code ?? "").toUpperCase();
  const room = useGameStore((s) => s.room);
  const { joinRoom } = useSocket();
  const userId = useGameStore((s) => s.userId);
  const username = useGameStore((s) => s.username);
  const router = useRouter();

  useEffect(() => {
    if (!userId || !username) return;
    if (room?.code === code) {
      if (room.status === "playing") router.replace(`/game/${code}`);
      return;
    }
    joinRoom(code).then((res) => {
      if (!res.ok) router.push("/");
    });
  }, [code, joinRoom, room, router, userId, username]);

  if (!room || room.code !== code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-white">
        Joining room {code}…
      </div>
    );
  }

  if (room.status === "playing") {
    return <GameShell />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-rose-950 p-4 sm:p-8">
      <LobbyRoom />
    </div>
  );
}
