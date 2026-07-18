"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import Link from "next/link";
import { Dices, Trophy, User } from "lucide-react";

export function HomeLobby() {
  const router = useRouter();
  const { data: session } = useSession();
  const connected = useGameStore((s) => s.connected);
  const { createRoom, joinRoom } = useSocket();
  const setIdentity = useGameStore((s) => s.setIdentity);
  const username = useGameStore((s) => s.username);
  const setUsername = (name: string) =>
    setIdentity({
      userId: useGameStore.getState().userId ?? `local_${Date.now()}`,
      username: name,
      avatar: useGameStore.getState().avatar,
    });

  const [joinCode, setJoinCode] = useState("");
  const [password, setPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [loading, setLoading] = useState(false);

  const ensureName = () => {
    if (username.trim().length >= 2) return true;
    toast.error("Enter a username (2+ characters)");
    return false;
  };

  const onCreate = async () => {
    if (!ensureName()) return;
    setLoading(true);
    const res = await createRoom(createPassword || undefined);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Failed to create room");
      return;
    }
    const code = useGameStore.getState().room?.code;
    if (code) router.push(`/room/${code}`);
  };

  const onJoin = async (asSpectator = false) => {
    if (!ensureName()) return;
    if (joinCode.trim().length < 4) {
      toast.error("Enter a valid room code");
      return;
    }
    setLoading(true);
    const res = await joinRoom(joinCode.trim().toUpperCase(), password || undefined, asSpectator);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Failed to join");
      return;
    }
    router.push(`/room/${joinCode.trim().toUpperCase()}`);
  };

  const onGuestAuth = async () => {
    const name = username.trim();
    if (name.length < 2) {
      toast.error("Enter a name (2+ characters)");
      return;
    }
    await signIn("guest", { username: name, redirect: false });
    setUsername(name);
    toast.success(`Welcome, ${name}!`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.18),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.2),_transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Trophy className="h-4 w-4 text-amber-300" />
            <Link href="/leaderboard" className="hover:text-white">
              Leaderboard
            </Link>
            <span className="text-white/20">·</span>
            <Link href="/profile" className="hover:text-white">
              Profile
            </Link>
            <span className="text-white/20">·</span>
            <Link href="/challenges" className="hover:text-white">
              Daily
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <>
                <span className="hidden text-sm text-white/70 sm:inline">
                  {session.user.name}
                </span>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>
                  Sign out
                </Button>
              </>
            ) : null}
          </div>
        </nav>

        <main className="flex flex-1 flex-col items-center justify-center gap-10 py-10">
          {!connected && (
            <div className="w-full max-w-3xl rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
              Game server offline — Create/Join room needs Socket.io. Local:{" "}
              <code className="text-amber-50">npm run dev</code>. Live multiplayer: deploy
              on Railway/Render (not Vercel alone).
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-3xl shadow-lg shadow-rose-500/30"
            >
              <Dices className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-7xl">
              Monopoly{" "}
              <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">
                Royale
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
              Private rooms, animated dice, custom boards — play with friends in real time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid w-full max-w-3xl gap-4 md:grid-cols-2"
          >
            <GlassCard className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <User className="h-5 w-5 text-amber-300" /> Your name
              </h2>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 24))}
                placeholder="Display name"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400/50"
              />
              {!session && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={onGuestAuth}
                >
                  Continue as Guest
                </Button>
              )}
            </GlassCard>

            <GlassCard className="space-y-4 p-5">
              <h2 className="text-lg font-bold text-white">Create room</h2>
              <input
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Optional password"
                type="password"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-400/50"
              />
              <Button className="w-full" size="lg" disabled={loading} onClick={onCreate}>
                Create Private Room
              </Button>
            </GlassCard>

            <GlassCard className="space-y-4 p-5 md:col-span-2">
              <h2 className="text-lg font-bold text-white">Join room</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white tracking-widest outline-none focus:border-amber-400/50"
                  maxLength={8}
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  className="sm:w-40 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={loading} onClick={() => onJoin(false)}>
                  Join Game
                </Button>
                <Button variant="secondary" disabled={loading} onClick={() => onJoin(true)}>
                  Spectate
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
