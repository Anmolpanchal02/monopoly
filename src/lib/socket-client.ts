"use client";

import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/server/socket";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (typeof window === "undefined") {
    throw new Error("Socket is client-only");
  }
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    socket = io(url, {
      path: "/api/socket",
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/** Wait until connected, or reject with a clear error (Vercel has no Socket.io). */
export function ensureSocketConnected(timeoutMs = 5000): Promise<AppSocket> {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Server offline — multiplayer needs a live Node host (Railway/Render). Vercel alone cannot run Socket.io."
        )
      );
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve(s);
    };
    const onError = () => {
      cleanup();
      reject(
        new Error(
          "Cannot connect to game server. Deploy with `npm run start` on Railway/Render, not Vercel serverless."
        )
      );
    };

    const cleanup = () => {
      clearTimeout(timer);
      s.off("connect", onConnect);
      s.off("connect_error", onError);
    };

    s.on("connect", onConnect);
    s.on("connect_error", onError);
    if (!s.connected) s.connect();
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
