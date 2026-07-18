"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { GameProvider } from "@/context/GameContext";
import { SocketBindings } from "@/components/providers/SocketBindings";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GameProvider>
        <SocketBindings />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#0f172a",
              color: "#f8fafc",
              border: "1px solid rgba(255,255,255,0.12)",
            },
          }}
        />
      </GameProvider>
    </SessionProvider>
  );
}
