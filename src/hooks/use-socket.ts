"use client";

import { useCallback } from "react";
import { getSocket, ensureSocketConnected } from "@/lib/socket-client";
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
    async (password?: string) => {
      if (!userId || !username) {
        return { ok: false, error: "Enter your name first" };
      }
      try {
        const socket = await ensureSocketConnected();
        return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
          const timer = setTimeout(() => {
            resolve({
              ok: false,
              error: "Create room timed out — game server not responding",
            });
          }, 8000);
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
              clearTimeout(timer);
              if (res.ok && res.room && res.playerId) {
                setRoom(res.room as never);
                setPlayerId(res.playerId);
                resolve({ ok: true });
              } else {
                resolve({ ok: false, error: res.error ?? "Failed to create room" });
              }
            }
          );
        });
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Cannot reach game server",
        };
      }
    },
    [avatar, draftSettings, setPlayerId, setRoom, theme, token, userId, username]
  );

  const joinRoom = useCallback(
    async (code: string, password?: string, asSpectator = false) => {
      if (!userId || !username) {
        return { ok: false, error: "Enter your name first" };
      }
      try {
        const socket = await ensureSocketConnected();
        return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
          const timer = setTimeout(() => {
            resolve({
              ok: false,
              error: "Join timed out — game server not responding",
            });
          }, 8000);
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
              clearTimeout(timer);
              if (res.ok && res.room && res.playerId) {
                setRoom(res.room as never);
                setPlayerId(res.playerId);
                resolve({ ok: true });
              } else {
                resolve({ ok: false, error: res.error ?? "Failed to join" });
              }
            }
          );
        });
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Cannot reach game server",
        };
      }
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
