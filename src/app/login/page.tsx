"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export default function LoginPage() {
  const [username, setUsername] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 to-slate-950 p-4">
      <GlassCard className="w-full max-w-md space-y-4 p-8">
        <h1 className="font-display text-3xl font-black text-white">Play as Guest</h1>
        <p className="text-sm text-white/60">
          Enter a name to join the lobby — no account needed.
        </p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white"
          maxLength={24}
        />
        <Button
          className="w-full"
          onClick={() =>
            signIn("guest", { username, callbackUrl: "/", redirect: true })
          }
        >
          Continue as Guest
        </Button>
      </GlassCard>
    </div>
  );
}
