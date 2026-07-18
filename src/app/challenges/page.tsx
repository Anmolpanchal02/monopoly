"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

type Challenge = {
  id: string;
  title: string;
  description: string;
  reward: number;
  target: number;
  date?: string;
};

export default function ChallengesPage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [all, setAll] = useState<Challenge[]>([]);

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => {
        setChallenge(d.challenge);
        setAll(d.all ?? []);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-950 to-emerald-950 p-6 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/" className="text-sm text-amber-300 hover:underline">
          ← Back
        </Link>
        <h1 className="font-display text-4xl font-black">Daily Challenges</h1>
        {challenge && (
          <GlassCard className="border border-amber-400/30 p-6">
            <p className="text-xs uppercase tracking-wider text-amber-300">
              Today · {challenge.date}
            </p>
            <h2 className="mt-2 text-2xl font-bold">{challenge.title}</h2>
            <p className="mt-1 text-white/60">{challenge.description}</p>
            <p className="mt-4 text-sm text-emerald-300">
              Reward: {challenge.reward} pts · Target: {challenge.target}
            </p>
          </GlassCard>
        )}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase text-white/50">Challenge pool</h3>
          {all.map((c) => (
            <GlassCard key={c.id} className="p-4">
              <p className="font-semibold">{c.title}</p>
              <p className="text-sm text-white/50">{c.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
