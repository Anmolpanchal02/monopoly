"use client";

import { useState } from "react";
import type { GameState } from "@/types/game";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import { board } from "@/lib/game-data";
import { formatMoney } from "@/lib/utils";

export function TradePanel({ game }: { game: GameState }) {
  const playerId = useGameStore((s) => s.playerId);
  const { sendAction } = useSocket();
  const me = game.players.find((p) => p.id === playerId);
  const others = game.players.filter((p) => p.id !== playerId && !p.bankrupt);

  const [toPlayerId, setToPlayerId] = useState(others[0]?.id ?? "");
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [offerProperties, setOfferProperties] = useState<number[]>([]);
  const [requestProperties, setRequestProperties] = useState<number[]>([]);
  const [offerJailCards, setOfferJailCards] = useState(0);
  const [requestJailCards, setRequestJailCards] = useState(0);

  if (!me || me.bankrupt) return null;

  const target = game.players.find((p) => p.id === toPlayerId);

  const toggle = (
    list: number[],
    setList: (v: number[]) => void,
    id: number
  ) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  if (game.trade?.status === "pending") {
    const isRecipient = game.trade.toPlayerId === playerId;
    const from = game.players.find((p) => p.id === game.trade!.fromPlayerId);
    return (
      <GlassCard className="space-y-3 p-4">
        <h3 className="font-bold text-white">Trade Offer</h3>
        <p className="text-sm text-white/70">
          From {from?.username}: offers {formatMoney(game.trade.offerCash)} +{" "}
          {game.trade.offerProperties.length} props; requests{" "}
          {formatMoney(game.trade.requestCash)} + {game.trade.requestProperties.length}{" "}
          props
        </p>
        {isRecipient ? (
          <div className="flex gap-2">
            <Button onClick={() => sendAction("respond_trade", { accept: true })}>
              Accept
            </Button>
            <Button
              variant="danger"
              onClick={() => sendAction("respond_trade", { accept: false })}
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="text-xs text-white/50">Waiting for response…</p>
        )}
      </GlassCard>
    );
  }

  const canTrade =
    game.players[game.currentPlayerIndex]?.id === playerId &&
    game.phase === "action";

  if (!canTrade) return null;

  return (
    <GlassCard className="space-y-3 p-4">
      <h3 className="font-bold text-white">Propose Trade</h3>
      <select
        value={toPlayerId}
        onChange={(e) => setToPlayerId(e.target.value)}
        className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm text-white"
      >
        {others.map((p) => (
          <option key={p.id} value={p.id}>
            {p.username}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="mb-1 text-white/50">You offer cash</p>
          <input
            type="number"
            min={0}
            value={offerCash}
            onChange={(e) => setOfferCash(Number(e.target.value))}
            className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
          />
          <p className="mt-2 mb-1 text-white/50">Your properties</p>
          <div className="max-h-24 space-y-1 overflow-y-auto">
            {me.properties.map((p) => (
              <label key={p.tileId} className="flex items-center gap-1 text-white/80">
                <input
                  type="checkbox"
                  checked={offerProperties.includes(p.tileId)}
                  onChange={() => toggle(offerProperties, setOfferProperties, p.tileId)}
                />
                {board.tiles[p.tileId]?.name}
              </label>
            ))}
          </div>
          <p className="mt-2 text-white/50">Jail cards</p>
          <input
            type="number"
            min={0}
            max={me.getOutOfJailCards}
            value={offerJailCards}
            onChange={(e) => setOfferJailCards(Number(e.target.value))}
            className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
          />
        </div>
        <div>
          <p className="mb-1 text-white/50">You request cash</p>
          <input
            type="number"
            min={0}
            value={requestCash}
            onChange={(e) => setRequestCash(Number(e.target.value))}
            className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
          />
          <p className="mt-2 mb-1 text-white/50">Their properties</p>
          <div className="max-h-24 space-y-1 overflow-y-auto">
            {(target?.properties ?? []).map((p) => (
              <label key={p.tileId} className="flex items-center gap-1 text-white/80">
                <input
                  type="checkbox"
                  checked={requestProperties.includes(p.tileId)}
                  onChange={() =>
                    toggle(requestProperties, setRequestProperties, p.tileId)
                  }
                />
                {board.tiles[p.tileId]?.name}
              </label>
            ))}
          </div>
          <p className="mt-2 text-white/50">Jail cards</p>
          <input
            type="number"
            min={0}
            max={target?.getOutOfJailCards ?? 0}
            value={requestJailCards}
            onChange={(e) => setRequestJailCards(Number(e.target.value))}
            className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
          />
        </div>
      </div>

      <Button
        onClick={() =>
          sendAction("propose_trade", {
            toPlayerId,
            offerCash,
            requestCash,
            offerProperties,
            requestProperties,
            offerJailCards,
            requestJailCards,
          })
        }
      >
        Send Offer
      </Button>
    </GlassCard>
  );
}
