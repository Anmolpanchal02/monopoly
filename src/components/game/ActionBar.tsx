"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import type { GameState } from "@/types/game";
import { board } from "@/lib/game-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dice, DiceIcon } from "@/components/game/Dice";

export function ActionBar({ game }: { game: GameState }) {
  const playerId = useGameStore((s) => s.playerId);
  const setDiceRolling = useGameStore((s) => s.setDiceRolling);
  const diceRolling = useGameStore((s) => s.diceRolling);
  const { sendAction } = useSocket();
  const [remaining, setRemaining] = useState<number | null>(null);

  const me = game.players.find((p) => p.id === playerId);
  const isMyTurn = game.players[game.currentPlayerIndex]?.id === playerId;
  const canAct =
    isMyTurn && !game.paused && game.phase !== "ended" && !me?.isSpectator;
  const canRoll =
    canAct &&
    (game.phase === "rolling" || game.phase === "jail_choice") &&
    !(game.phase === "jail_choice"); // jail handled in modal
  const canEnd = canAct && ["action", "building"].includes(game.phase);

  const pendingTile =
    game.pendingPurchase != null
      ? board.tiles[game.pendingPurchase.tileId]
      : null;

  useEffect(() => {
    if (!game.turnEndsAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((game.turnEndsAt! - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [game.turnEndsAt, game.currentPlayerIndex]);

  const handleRoll = () => {
    if (!canAct || game.phase !== "rolling" || diceRolling) return;
    setDiceRolling(true);
    sendAction("roll");
    setTimeout(() => setDiceRolling(false), 950);
  };

  const statusText = (() => {
    if (!isMyTurn)
      return `Waiting for ${game.players[game.currentPlayerIndex]?.username}…`;
    if (diceRolling) return "Rolling…";
    if (
      game.dice?.isDoubles &&
      game.phase === "rolling" &&
      (me?.doublesCount ?? 0) > 0 &&
      (me?.doublesCount ?? 0) < 3
    ) {
      return "Doubles! Roll again 🎲";
    }
    if (game.phase === "buying")
      return `Buy offer: ${pendingTile?.name ?? "property"}`;
    if (game.phase === "jail_choice") return "Jail — choose in the popup";
    if (game.phase === "card") return game.lastCard?.title ?? "Card drawn";
    if (game.phase === "auction") return "Auction open";
    if (game.phase === "bankruptcy") {
      if (game.pendingDebt?.playerId === playerId) return "Raise cash & pay debt";
      return "Waiting for debt resolution";
    }
    if (!game.dice) return "Waiting for first roll";
    if (game.phase === "action")
      return `Rolled ${game.dice.die1} + ${game.dice.die2} = ${game.dice.total}`;
    return game.phase.replace("_", " ");
  })();

  return (
    <div className="rounded-2xl border-2 border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black tracking-wide text-slate-800">CONTROLS</h3>
        {isMyTurn && game.phase !== "ended" && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            Your Turn!
          </span>
        )}
        {remaining !== null && (
          <span
            className={cn(
              "ml-auto rounded-full px-2.5 py-1 text-xs font-bold",
              remaining <= 10 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
            )}
          >
            ⏱ {remaining}s
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-xl bg-slate-100 px-3 py-3 sm:px-4">
        <div className="shrink-0 pl-1">
          <Dice
            die1={game.dice?.die1 ?? 5}
            die2={game.dice?.die2 ?? 3}
            rolling={diceRolling}
            size={48}
          />
        </div>
        <p className="flex-1 text-center text-sm font-medium text-slate-500 sm:text-base">
          {statusText}
        </p>
      </div>

      <div className="space-y-2.5">
        <BlockButton
          color="red"
          onClick={handleRoll}
          disabled={game.phase !== "rolling" || !canAct || diceRolling}
        >
          <DiceIcon />
          ROLL
        </BlockButton>
        <BlockButton
          color="blue"
          onClick={() => sendAction("end_turn")}
          disabled={!canEnd}
        >
          END TURN →
        </BlockButton>
      </div>

      {canEnd && (
        <button
          type="button"
          onClick={() => sendAction("bankrupt", { creditorId: null })}
          className="mt-3 w-full text-center text-xs font-semibold text-red-500 hover:underline"
        >
          Declare Bankruptcy
        </button>
      )}
    </div>
  );
}

function BlockButton({
  children,
  onClick,
  disabled,
  color,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color: "red" | "blue" | "green";
  className?: string;
}) {
  const colors = {
    red: "bg-[#e53935] border-b-[#b71c1c] hover:bg-[#ef5350] disabled:bg-red-300 disabled:border-b-red-400",
    blue: "bg-[#64b5f6] border-b-[#1e88e5] hover:bg-[#90caf9] disabled:bg-sky-200 disabled:border-b-sky-300",
    green:
      "bg-emerald-500 border-b-emerald-700 hover:bg-emerald-400 disabled:bg-emerald-300 disabled:border-b-emerald-400",
  };

  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { y: 3 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border-b-[5px] px-4 py-3.5 text-base font-black uppercase tracking-wide text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-70",
        colors[color],
        className
      )}
    >
      {children}
    </motion.button>
  );
}
