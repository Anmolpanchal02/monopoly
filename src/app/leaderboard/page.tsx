"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

type Entry = {
  username: string;
  avatar?: string;
  wins?: number;
  score: number;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-amber-950 p-6 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/" className="text-sm text-amber-300 hover:underline">
          ← Back
        </Link>
        <h1 className="font-display text-4xl font-black">Leaderboard</h1>
        <GlassCard className="divide-y divide-white/10 overflow-hidden">
          {entries.map((e, i) => (
            <div key={`${e.username}-${i}`} className="flex items-center gap-4 px-4 py-3">
              <span className="w-8 text-lg font-bold text-amber-300">#{i + 1}</span>
              <span className="text-2xl">{e.avatar ?? "🎩"}</span>
              <div className="flex-1">
                <p className="font-semibold">{e.username}</p>
                <p className="text-xs text-white/40">{e.wins ?? 0} wins</p>
              </div>
              <span className="font-bold text-emerald-300">{e.score}</span>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
