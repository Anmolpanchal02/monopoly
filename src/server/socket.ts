import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { roomManager } from "@/server/room-manager";
import type { GameSettings, ThemeId, TokenId } from "@/types/game";
import { createId } from "@/lib/utils";

export type ServerToClientEvents = {
  room_update: (room: ReturnType<typeof roomManager.serializeRoom>) => void;
  chat_message: (message: {
    id: string;
    roomId: string;
    playerId: string;
    username: string;
    avatar: string;
    message: string;
    timestamp: number;
    isSystem: boolean;
  }) => void;
  typing: (data: { playerId: string; username: string; isTyping: boolean }) => void;
  emote: (data: { id: string; playerId: string; emote: string; timestamp: number }) => void;
  error: (message: string) => void;
  game_event: (data: { type: string; payload?: unknown }) => void;
  kicked: () => void;
};

export type ClientToServerEvents = {
  create_room: (
    data: {
      userId: string;
      username: string;
      avatar: string;
      password?: string;
      settings?: Partial<GameSettings>;
      theme?: ThemeId;
      token?: TokenId;
    },
    callback: (res: { ok: boolean; room?: unknown; playerId?: string; error?: string }) => void
  ) => void;
  join_room: (
    data: {
      code: string;
      password?: string;
      userId: string;
      username: string;
      avatar: string;
      token?: TokenId;
      asSpectator?: boolean;
    },
    callback: (res: { ok: boolean; room?: unknown; playerId?: string; error?: string }) => void
  ) => void;
  leave_room: () => void;
  set_ready: (ready: boolean) => void;
  set_token: (token: TokenId) => void;
  update_settings: (settings: Partial<GameSettings>) => void;
  update_theme: (theme: ThemeId) => void;
  start_game: () => void;
  game_action: (data: { action: string; payload?: Record<string, unknown> }) => void;
  chat: (message: string) => void;
  typing: (isTyping: boolean) => void;
  emote: (emote: string) => void;
  kick: (targetId: string) => void;
  transfer_host: (targetId: string) => void;
  reconnect_room: (
    data: { roomCode: string; userId: string },
    callback: (res: { ok: boolean; room?: unknown; playerId?: string; error?: string }) => void
  ) => void;
};

function broadcastRoom(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit("room_update", roomManager.serializeRoom(room));
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket",
  });

  roomManager.onTimerExpired = (room) => {
    io.to(room.id).emit("room_update", roomManager.serializeRoom(room));
    io.to(room.id).emit("game_event", { type: "turn_timeout" });
  };

  io.on("connection", (socket: Socket) => {
    socket.on("create_room", (data, callback) => {
      try {
        if (!data.userId || !data.username) {
          callback({ ok: false, error: "Invalid identity" });
          return;
        }
        const room = roomManager.createRoom({
          hostUserId: data.userId,
          hostUsername: data.username.slice(0, 24),
          hostAvatar: data.avatar || "🎩",
          password: data.password,
          settings: data.settings,
          theme: data.theme,
          token: data.token,
        });
        const player = room.players[0];
        roomManager.bindSocket(socket.id, room.id, player.id);
        socket.join(room.id);
        callback({
          ok: true,
          room: roomManager.serializeRoom(room),
          playerId: player.id,
        });
      } catch (e) {
        callback({ ok: false, error: e instanceof Error ? e.message : "Failed" });
      }
    });

    socket.on("join_room", (data, callback) => {
      try {
        if (!data.code || !data.userId || !data.username) {
          callback({ ok: false, error: "Invalid join data" });
          return;
        }
        const result = roomManager.joinRoom({
          code: data.code,
          password: data.password,
          userId: data.userId,
          username: data.username.slice(0, 24),
          avatar: data.avatar || "🎩",
          token: data.token,
          asSpectator: data.asSpectator,
        });
        if ("error" in result) {
          callback({ ok: false, error: result.error });
          return;
        }
        roomManager.bindSocket(socket.id, result.room.id, result.player.id);
        socket.join(result.room.id);
        broadcastRoom(io, result.room.id);
        callback({
          ok: true,
          room: roomManager.serializeRoom(result.room),
          playerId: result.player.id,
        });
      } catch (e) {
        callback({ ok: false, error: e instanceof Error ? e.message : "Failed" });
      }
    });

    socket.on("reconnect_room", (data, callback) => {
      const result = roomManager.joinRoom({
        code: data.roomCode,
        userId: data.userId,
        username: "Player",
        avatar: "🎩",
      });
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      roomManager.bindSocket(socket.id, result.room.id, result.player.id);
      socket.join(result.room.id);
      broadcastRoom(io, result.room.id);
      callback({
        ok: true,
        room: roomManager.serializeRoom(result.room),
        playerId: result.player.id,
      });
    });

    socket.on("set_ready", (ready) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.setReady(binding.roomId, binding.playerId, ready);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
    });

    socket.on("set_token", (token) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.setToken(binding.roomId, binding.playerId, token);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
    });

    socket.on("update_settings", (settings) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.updateSettings(binding.roomId, binding.playerId, settings);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
    });

    socket.on("update_theme", (theme) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.updateTheme(binding.roomId, binding.playerId, theme);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
    });

    socket.on("start_game", () => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.startGame(binding.roomId, binding.playerId);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
      io.to(binding.roomId).emit("game_event", { type: "game_started" });
    });

    socket.on("game_action", (data) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      if (!data?.action || typeof data.action !== "string") {
        socket.emit("error", "Invalid action");
        return;
      }
      const result = roomManager.applyAction(
        binding.roomId,
        binding.playerId,
        data.action,
        data.payload ?? {}
      );
      if (result.error) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
      io.to(binding.roomId).emit("game_event", {
        type: data.action,
        payload: data.payload,
      });
    });

    socket.on("chat", (message) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.addChat(binding.roomId, binding.playerId, message);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      io.to(binding.roomId).emit("chat_message", result);
    });

    socket.on("typing", (isTyping) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const room = roomManager.getRoom(binding.roomId);
      const player = room?.players.find((p) => p.id === binding.playerId);
      if (!player) return;
      socket.to(binding.roomId).emit("typing", {
        playerId: player.id,
        username: player.username,
        isTyping,
      });
    });

    socket.on("emote", (emote) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const allowed = ["😂", "😎", "🔥", "❤️", "😭", "👏"];
      if (!allowed.includes(emote)) return;
      io.to(binding.roomId).emit("emote", {
        id: createId(),
        playerId: binding.playerId,
        emote,
        timestamp: Date.now(),
      });
    });

    socket.on("kick", (targetId) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.kickPlayer(binding.roomId, binding.playerId, targetId);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      for (const sid of roomManager.findSocketIdsForPlayer(targetId)) {
        io.to(sid).emit("kicked");
        io.sockets.sockets.get(sid)?.leave(binding.roomId);
      }
      broadcastRoom(io, binding.roomId);
    });

    socket.on("transfer_host", (targetId) => {
      const binding = roomManager.getPlayerSocket(socket.id);
      if (!binding) return;
      const result = roomManager.transferHost(binding.roomId, binding.playerId, targetId);
      if ("error" in result) {
        socket.emit("error", result.error);
        return;
      }
      broadcastRoom(io, binding.roomId);
    });

    socket.on("leave_room", () => {
      const room = roomManager.unbindSocket(socket.id);
      if (room) broadcastRoom(io, room.id);
    });

    socket.on("disconnect", () => {
      const room = roomManager.unbindSocket(socket.id);
      if (room) broadcastRoom(io, room.id);
    });
  });

  return io;
}
