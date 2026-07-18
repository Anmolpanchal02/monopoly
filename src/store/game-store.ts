"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChatMessage,
  EmoteEvent,
  GameSettings,
  RoomState,
  ThemeId,
  TokenId,
} from "@/types/game";
import { DEFAULT_GAME_SETTINGS } from "@/types/game";

interface GameStore {
  userId: string | null;
  username: string;
  avatar: string;
  token: TokenId;
  theme: ThemeId;
  soundEnabled: boolean;
  playerId: string | null;
  room: RoomState | null;
  chat: ChatMessage[];
  typingUsers: Record<string, string>;
  emotes: EmoteEvent[];
  selectedTileId: number | null;
  connected: boolean;
  draftSettings: GameSettings;
  diceRolling: boolean;

  setIdentity: (data: { userId: string; username: string; avatar?: string }) => void;
  setToken: (token: TokenId) => void;
  setTheme: (theme: ThemeId) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setPlayerId: (id: string | null) => void;
  setRoom: (room: RoomState | null) => void;
  addChat: (message: ChatMessage) => void;
  setTyping: (playerId: string, username: string, isTyping: boolean) => void;
  addEmote: (emote: EmoteEvent) => void;
  setSelectedTileId: (id: number | null) => void;
  setConnected: (connected: boolean) => void;
  setDraftSettings: (settings: Partial<GameSettings>) => void;
  setDiceRolling: (rolling: boolean) => void;
  resetSession: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      userId: null,
      username: "",
      avatar: "🎩",
      token: "car",
      theme: "classic",
      soundEnabled: true,
      playerId: null,
      room: null,
      chat: [],
      typingUsers: {},
      emotes: [],
      selectedTileId: null,
      connected: false,
      draftSettings: DEFAULT_GAME_SETTINGS,
      diceRolling: false,

      setIdentity: ({ userId, username, avatar }) =>
        set({ userId, username, avatar: avatar ?? "🎩" }),
      setToken: (token) => set({ token }),
      setTheme: (theme) => set({ theme }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setPlayerId: (playerId) => set({ playerId }),
      setRoom: (room) =>
        set({
          room,
          chat: room?.chat ?? [],
        }),
      addChat: (message) =>
        set((s) => {
          if (s.chat.some((m) => m.id === message.id)) return s;
          return { chat: [...s.chat.slice(-299), message] };
        }),
      setTyping: (playerId, username, isTyping) =>
        set((s) => {
          const next = { ...s.typingUsers };
          if (isTyping) next[playerId] = username;
          else delete next[playerId];
          return { typingUsers: next };
        }),
      addEmote: (emote) =>
        set((s) => {
          if (s.emotes.some((e) => e.id === emote.id)) return s;
          return { emotes: [...s.emotes.slice(-20), emote] };
        }),
      setSelectedTileId: (selectedTileId) => set({ selectedTileId }),
      setConnected: (connected) => set({ connected }),
      setDraftSettings: (settings) =>
        set((s) => ({ draftSettings: { ...s.draftSettings, ...settings } })),
      setDiceRolling: (diceRolling) => set({ diceRolling }),
      resetSession: () =>
        set({
          playerId: null,
          room: null,
          chat: [],
          typingUsers: {},
          emotes: [],
          selectedTileId: null,
          diceRolling: false,
        }),
    }),
    {
      name: "monopoly-royale",
      partialize: (s) => ({
        userId: s.userId,
        username: s.username,
        avatar: s.avatar,
        token: s.token,
        theme: s.theme,
        soundEnabled: s.soundEnabled,
      }),
    }
  )
);
