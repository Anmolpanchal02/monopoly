"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useGameStore } from "@/store/game-store";
import { createId } from "@/lib/utils";

/** Syncs auth session into Zustand and ensures guest identity exists */
export function IdentitySync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const setIdentity = useGameStore((s) => s.setIdentity);
  const userId = useGameStore((s) => s.userId);
  const username = useGameStore((s) => s.username);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setIdentity({
        userId: session.user.id,
        username: session.user.name ?? "Player",
        avatar: session.user.image ?? "🎩",
      });
      return;
    }
    if (status === "unauthenticated" && !userId) {
      setIdentity({
        userId: `local_${createId()}`,
        username: username || `Guest${Math.floor(Math.random() * 9000 + 1000)}`,
        avatar: "🎩",
      });
    }
  }, [session, status, setIdentity, userId, username]);

  return <>{children}</>;
}
