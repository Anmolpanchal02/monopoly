"use client";

import { useCallback } from "react";
import { getSocket } from "@/lib/socket-client";
import { useGameStore } from "@/store/game-store";
import type { GameSettings, ThemeId, TokenId } from "@/types/game";

/** Emit helpers only — listeners live in <SocketBindings /> */
export function useSocket() {
  const userId = useGameStore((s) => s.userId);
  const username = useGameStore((s) => s.username);
  const avatar = useGameStore((s) => s.avatar);
  const token = useGameStore((s) => s.token);
  const draftSettings = useGameStore((s) => s.draftSettings);
  const theme = useGameStore((s) => s.theme);
  const setRoom = useGameStore((s) => s.setRoom);
  const setPlayerId = useGameStore((s) => s.setPlayerId);

  const createRoom = useCallback(
    (password?: string) => {
      const socket = getSocket();
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        if (!userId || !username) {
          resolve({ ok: false, error: "Sign in first" });
          return;
        }
        socket.emit(
          "create_room",
          {
            userId,
            username,
            avatar,
            password,
            settings: draftSettings,
            theme,
            token,
          },
          (res) => {
            if (res.ok && res.room && res.playerId) {
              setRoom(res.room as never);
              setPlayerId(res.playerId);
              resolve({ ok: true });
            } else {
              resolve({ ok: false, error: res.error });
            }
          }
        );
      });
    },
    [avatar, draftSettings, setPlayerId, setRoom, theme, token, userId, username]
  );

  const joinRoom = useCallback(
    (code: string, password?: string, asSpectator = false) => {
      const socket = getSocket();
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        if (!userId || !username) {
          resolve({ ok: false, error: "Sign in first" });
          return;
        }
        socket.emit(
          "join_room",
          {
            code,
            password,
            userId,
            username,
            avatar,
            token,
            asSpectator,
          },
          (res) => {
            if (res.ok && res.room && res.playerId) {
              setRoom(res.room as never);
              setPlayerId(res.playerId);
              resolve({ ok: true });
            } else {
              resolve({ ok: false, error: res.error });
            }
          }
        );
      });
    },
    [avatar, setPlayerId, setRoom, token, userId, username]
  );

  const sendAction = useCallback((action: string, payload?: Record<string, unknown>) => {
    getSocket().emit("game_action", { action, payload });
  }, []);

  const setReady = useCallback((ready: boolean) => {
    getSocket().emit("set_ready", ready);
  }, []);

  const setPlayerToken = useCallback((t: TokenId) => {
    getSocket().emit("set_token", t);
  }, []);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    getSocket().emit("update_settings", settings);
  }, []);

  const updateTheme = useCallback((t: ThemeId) => {
    getSocket().emit("update_theme", t);
  }, []);

  const startGame = useCallback(() => {
    getSocket().emit("start_game");
  }, []);

  const sendChat = useCallback((message: string) => {
    getSocket().emit("chat", message);
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    getSocket().emit("typing", isTyping);
  }, []);

  const sendEmote = useCallback((emote: string) => {
    getSocket().emit("emote", emote);
  }, []);

  const kick = useCallback((targetId: string) => {
    getSocket().emit("kick", targetId);
  }, []);

  const transferHost = useCallback((targetId: string) => {
    getSocket().emit("transfer_host", targetId);
  }, []);

  return {
    createRoom,
    joinRoom,
    sendAction,
    setReady,
    setPlayerToken,
    updateSettings,
    updateTheme,
    startGame,
    sendChat,
    sendTyping,
    sendEmote,
    kick,
    transferHost,
  };
}
