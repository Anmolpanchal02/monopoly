"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import { TOKENS, getTokenEmoji } from "@/lib/utils";
import { themes } from "@/lib/game-data";
import type { TokenId, ThemeId } from "@/types/game";
import { Copy, Users, Settings2, Sparkles } from "lucide-react";

export function LobbyRoom() {
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const draftSettings = useGameStore((s) => s.draftSettings);
  const setDraftSettings = useGameStore((s) => s.setDraftSettings);
  const setToken = useGameStore((s) => s.setToken);
  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);
  const {
    setReady,
    setPlayerToken,
    updateSettings,
    updateTheme,
    startGame,
    kick,
    transferHost,
  } = useSocket();
  const router = useRouter();
  const [tab, setTab] = useState<"players" | "settings" | "theme">("players");

  if (!room) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    toast.success("Room code copied!");
  };

  const onStart = () => {
    startGame();
    // navigation happens when room.status becomes playing via GameShell
  };

  if (room.status === "playing" && room.game) {
    router.replace(`/game/${room.code}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">Private Room</p>
            <h2 className="font-display mt-1 text-4xl font-black text-white">{room.code}</h2>
            <p className="mt-1 text-sm text-white/50">
              {room.players.length}/{room.settings.maxPlayers} players
            </p>
          </div>
          <Button variant="secondary" onClick={copyCode}>
            <Copy className="h-4 w-4" /> Copy Code
          </Button>
        </div>

        <div className="mt-6 flex gap-2 border-b border-white/10 pb-2">
          {(
            [
              ["players", Users, "Players"],
              ["settings", Settings2, "Settings"],
              ["theme", Sparkles, "Theme"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                tab === id ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "players" && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-white/50">Choose your token</p>
            <div className="flex flex-wrap gap-2">
              {TOKENS.map((t) => {
                const taken = room.players.some(
                  (p) => p.token === t.id && p.id !== playerId
                );
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={taken}
                    onClick={() => {
                      setToken(t.id as TokenId);
                      setPlayerToken(t.id as TokenId);
                    }}
                    className={`rounded-xl border px-3 py-2 text-2xl transition ${
                      me?.token === t.id
                        ? "border-amber-400 bg-amber-400/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    } disabled:opacity-30`}
                  >
                    {t.emoji}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2">
              {room.players.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTokenEmoji(p.token)}</span>
                    <div>
                      <p className="font-semibold text-white">
                        {p.username}
                        {p.id === room.hostId && (
                          <span className="ml-2 text-xs text-amber-300">HOST</span>
                        )}
                      </p>
                      <p className="text-xs text-white/40">
                        {p.isReady ? "Ready ✓" : "Not ready"}
                        {!p.isConnected && " · offline"}
                      </p>
                    </div>
                  </div>
                  {isHost && p.id !== playerId && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => transferHost(p.id)}>
                        Host
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => kick(p.id)}>
                        Kick
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant={me?.isReady ? "success" : "primary"}
                onClick={() => setReady(!me?.isReady)}
              >
                {me?.isReady ? "Ready ✓" : "Ready Up"}
              </Button>
              {isHost && (
                <Button
                  onClick={onStart}
                  disabled={
                    room.players.length < 2 || !room.players.every((p) => p.isReady)
                  }
                >
                  Start Game
                </Button>
              )}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["startingMoney", "Starting money", 500, 5000, 100],
                ["salaryAtGo", "GO salary", 100, 400, 50],
                ["timePerTurn", "Turn timer (sec, 0=off)", 0, 180, 10],
                ["maxPlayers", "Max players", 2, 8, 1],
              ] as const
            ).map(([key, label, min, max, step]) => (
              <label key={key} className="block text-sm text-white/70">
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  disabled={!isHost}
                  value={room.settings[key]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setDraftSettings({ [key]: value });
                    if (isHost) updateSettings({ [key]: value });
                  }}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                />
              </label>
            ))}
            {(
              [
                ["freeParkingJackpot", "Free Parking jackpot"],
                ["auctionEnabled", "Auctions enabled"],
                ["evenBuild", "Even building rule"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  disabled={!isHost}
                  checked={room.settings[key]}
                  onChange={(e) => {
                    setDraftSettings({ [key]: e.target.checked });
                    if (isHost) updateSettings({ [key]: e.target.checked });
                  }}
                />
                {label}
              </label>
            ))}
            <p className="text-xs text-white/40 sm:col-span-2">
              Draft defaults: starting ${draftSettings.startingMoney}
            </p>
          </div>
        )}

        {tab === "theme" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.values(themes).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!isHost && t.id !== theme}
                onClick={() => {
                  setTheme(t.id as ThemeId);
                  if (isHost) updateTheme(t.id as ThemeId);
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  room.theme === t.id
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-xs text-white/50">{t.description}</p>
              </button>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
