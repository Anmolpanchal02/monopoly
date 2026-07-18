"use client";

import { motion } from "framer-motion";
import type { GameState } from "@/types/game";
import { formatMoney, getTokenEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";
import { useEffect } from "react";
import { playSound } from "@/lib/sounds";

export function VictoryScreen({ game }: { game: GameState }) {
  const winner = game.players.find((p) => p.id === game.winnerId);
  const router = useRouter();
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const resetSession = useGameStore((s) => s.resetSession);

  useEffect(() => {
    if (soundEnabled) playSound("win");
  }, [soundEnabled]);

  if (!winner) return null;

  const ranked = [...game.players].sort((a, b) => b.netWorth - a.netWorth);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 16 }}
        className="w-full max-w-lg rounded-3xl border border-amber-400/40 bg-gradient-to-br from-emerald-950 via-slate-900 to-rose-950 p-8 text-center shadow-2xl"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-4 text-6xl"
        >
          🏆
        </motion.div>
        <h2 className="font-display text-4xl font-black text-amber-300">Victory!</h2>
        <p className="mt-2 text-xl text-white">
          {getTokenEmoji(winner.token)} {winner.username} wins!
        </p>
        <p className="mt-1 text-emerald-300">
          Net worth {formatMoney(winner.netWorth)}
        </p>

        <div className="mt-6 space-y-2 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
            Final Standings
          </h3>
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
            >
              <span className="text-white">
                #{i + 1} {getTokenEmoji(p.token)} {p.username}
              </span>
              <span className="text-emerald-300">{formatMoney(p.netWorth)}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            onClick={() => {
              resetSession();
              router.push("/");
            }}
          >
            Back to Lobby
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
