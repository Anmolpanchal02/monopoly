"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { meta } from "@/lib/game-data";

type ProfileResponse = {
  user: { name?: string | null; id?: string; avatar?: string } | null;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    hotelsBuilt: number;
    timesJailed: number;
    propertiesBought: number;
    tradesCompleted: number;
  } | null;
  unlocked: string[];
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-950 p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-sm text-amber-300 hover:underline">
          ← Back
        </Link>
        <h1 className="font-display text-4xl font-black">Player Profile</h1>
        <GlassCard className="p-6">
          <p className="text-2xl font-bold">
            {data?.user?.name ?? "Guest Player"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Games", data?.stats?.gamesPlayed ?? 0],
              ["Wins", data?.stats?.gamesWon ?? 0],
              ["Hotels", data?.stats?.hotelsBuilt ?? 0],
              ["Jailed", data?.stats?.timesJailed ?? 0],
              ["Properties", data?.stats?.propertiesBought ?? 0],
              ["Trades", data?.stats?.tradesCompleted ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-black/20 p-3">
                <p className="text-xs text-white/40">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-bold">Achievements</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {meta.achievements.map((a) => {
              const unlocked = data?.unlocked?.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 ${
                    unlocked
                      ? "border-amber-400/40 bg-amber-400/10"
                      : "border-white/10 bg-white/5 opacity-60"
                  }`}
                >
                  <p className="text-2xl">{a.icon}</p>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-white/50">{a.description}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
