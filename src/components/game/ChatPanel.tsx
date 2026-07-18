"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import { EMOTES } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function ChatPanel() {
  const chat = useGameStore((s) => s.chat);
  const typingUsers = useGameStore((s) => s.typingUsers);
  const emotes = useGameStore((s) => s.emotes);
  const { sendChat, sendTyping, sendEmote } = useSocket();
  const [text, setText] = useState("");
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep latest message visible after send / receive
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [chat.length, chat.at(-1)?.id]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    setText("");
    sendTyping(false);
  };

  const onChange = (value: string) => {
    setText(value);
    sendTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 1200);
  };

  const typingLabel = Object.values(typingUsers).join(", ");

  return (
    <GlassCard className="relative flex h-72 flex-col overflow-hidden sm:h-80">
      <div className="border-b border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/60">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {chat.map((m) => (
          <div key={m.id} className={`text-sm ${m.isSystem ? "text-amber-200/80 italic" : ""}`}>
            {!m.isSystem && (
              <span className="mr-1 font-semibold text-emerald-300">
                {m.avatar} {m.username}:
              </span>
            )}
            <span className="text-white/90">{m.message}</span>
          </div>
        ))}
      </div>
      {typingLabel && (
        <p className="px-3 text-[11px] text-white/40">{typingLabel} typing…</p>
      )}
      <div className="flex gap-1 border-t border-white/10 px-2 py-1">
        {EMOTES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => sendEmote(e)}
            className="rounded-lg px-1.5 py-0.5 text-lg hover:bg-white/10"
          >
            {e}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 p-2">
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Say something…"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/50"
          maxLength={500}
        />
        <Button type="submit" size="sm">
          Send
        </Button>
      </form>

      <AnimatePresence>
        {emotes.slice(-3).map((em, i) => (
          <motion.div
            key={`${em.id}-${em.timestamp}-${i}`}
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1.4 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute right-4 top-10 text-3xl"
          >
            {em.emote}
          </motion.div>
        ))}
      </AnimatePresence>
    </GlassCard>
  );
}
