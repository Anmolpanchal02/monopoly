"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socket-client";
import { useGameStore } from "@/store/game-store";
import { playSound } from "@/lib/sounds";

/** Bind Socket.io listeners once for the whole app (avoids duplicate keys / events). */
export function SocketBindings() {
  useEffect(() => {
    const socket = getSocket();
    const store = useGameStore.getState;

    const onConnect = () => store().setConnected(true);
    const onDisconnect = () => store().setConnected(false);
    const onRoom = (room: unknown) => store().setRoom(room as never);
    const onChat = (msg: Parameters<ReturnType<typeof store>["addChat"]>[0]) =>
      store().addChat(msg);
    const onTyping = ({
      playerId,
      username,
      isTyping,
    }: {
      playerId: string;
      username: string;
      isTyping: boolean;
    }) => store().setTyping(playerId, username, isTyping);
    const onEmote = (e: Parameters<ReturnType<typeof store>["addEmote"]>[0]) =>
      store().addEmote(e);
    const onError = (message: string) => toast.error(message);
    const onKicked = () => {
      toast.error("You were kicked from the room");
      store().resetSession();
    };
    const onGameEvent = ({ type }: { type: string }) => {
      if (!store().soundEnabled) return;
      if (type === "roll") playSound("dice");
      if (type === "buy") playSound("purchase");
      if (type === "game_started") playSound("start");
      if (["pay_jail", "use_jail_card"].includes(type)) playSound("jail");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_update", onRoom);
    socket.on("chat_message", onChat);
    socket.on("typing", onTyping);
    socket.on("emote", onEmote);
    socket.on("error", onError);
    socket.on("kicked", onKicked);
    socket.on("game_event", onGameEvent);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_update", onRoom);
      socket.off("chat_message", onChat);
      socket.off("typing", onTyping);
      socket.off("emote", onEmote);
      socket.off("error", onError);
      socket.off("kicked", onKicked);
      socket.off("game_event", onGameEvent);
    };
  }, []);

  return null;
}
