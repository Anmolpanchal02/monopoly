"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

type ReplayEvent = {
  id: string;
  type: string;
  payload: unknown;
  sequence: number;
  timestamp: string;
};

export default function ReplayPage() {
  const params = useParams();
  const id = String(params.id);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetch(`/api/replay/${id}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, [id]);

  useEffect(() => {
    if (!playing || index >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex((i) => i + 1), 800);
    return () => clearTimeout(t);
  }, [playing, index, events.length]);

  const current = events[index];

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/" className="text-sm text-amber-300 hover:underline">
          ← Back
        </Link>
        <h1 className="font-display text-3xl font-black">Replay</h1>
        <GlassCard className="space-y-4 p-6">
          <p className="text-sm text-white/50">
            Event {events.length ? index + 1 : 0} / {events.length}
          </p>
          <div className="min-h-24 rounded-xl bg-black/30 p-4 font-mono text-sm">
            {current ? (
              <>
                <p className="text-amber-300">{current.type}</p>
                <pre className="mt-2 overflow-auto text-xs text-white/70">
                  {JSON.stringify(current.payload, null, 2)}
                </pre>
              </>
            ) : (
              <p className="text-white/40">No replay data for this game yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIndex(0)}>
              Reset
            </Button>
            <Button size="sm" onClick={() => setPlaying(!playing)}>
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIndex((i) => Math.min(events.length - 1, i + 1))}
            >
              Next
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
