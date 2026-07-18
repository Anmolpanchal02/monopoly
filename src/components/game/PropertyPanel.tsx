"use client";

import { X } from "lucide-react";
import { board } from "@/lib/game-data";
import { COLOR_GROUP_HEX, formatMoney } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { useGameStore } from "@/store/game-store";
import type { GameState } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/hooks/use-socket";

export function PropertyPanel({ game }: { game: GameState }) {
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const setSelectedTileId = useGameStore((s) => s.setSelectedTileId);
  const playerId = useGameStore((s) => s.playerId);
  const { sendAction } = useSocket();

  // Closed — free space for chat / portfolio
  if (selectedTileId === null) return null;

  const tile = board.tiles[selectedTileId];
  if (!tile) return null;

  const owner = game.players.find((p) =>
    p.properties.some((prop) => prop.tileId === selectedTileId)
  );
  const owned = owner?.properties.find((p) => p.tileId === selectedTileId);
  const isMine = owner?.id === playerId;
  const isDebtor =
    game.phase === "bankruptcy" && game.pendingDebt?.playerId === playerId;
  const canManage =
    isMine &&
    (isDebtor ||
      (game.players[game.currentPlayerIndex]?.id === playerId &&
        (game.phase === "action" || game.phase === "building")));
  const canBuild =
    canManage &&
    !isDebtor &&
    game.phase !== "bankruptcy";

  return (
    <GlassCard className="relative space-y-3 p-4">
      <button
        type="button"
        onClick={() => setSelectedTileId(null)}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
        aria-label="Close property details"
        title="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div
        className="h-2 rounded-full"
        style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }}
      />
      {tile.image && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/cities/${tile.image}.jpg`}
            alt={tile.name}
            className="h-28 w-full object-cover"
          />
        </div>
      )}
      <div className="pr-8">
        <h3 className="text-lg font-bold text-white">{tile.name}</h3>
        <p className="text-xs uppercase tracking-wide text-white/50">{tile.type}</p>
      </div>

      {tile.price > 0 && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label="Price" value={formatMoney(tile.price)} />
          <Info label="Mortgage" value={formatMoney(tile.mortgageValue)} />
          {tile.houseCost > 0 && (
            <Info label="House cost" value={formatMoney(tile.houseCost)} />
          )}
          <Info
            label="Owner"
            value={owner ? owner.username : "Bank"}
          />
        </div>
      )}

      {tile.rent && tile.type === "property" && (
        <div className="space-y-1 text-xs text-white/70">
          <p>Rent: {formatMoney(tile.rent.base)}</p>
          <p>With monopoly: {formatMoney(tile.rent.monopoly)}</p>
          {tile.rent.houses.map((r, i) => (
            <p key={i}>
              {i + 1} house{i ? "s" : ""}: {formatMoney(r)}
            </p>
          ))}
          <p>Hotel: {formatMoney(tile.rent.hotel)}</p>
        </div>
      )}

      {owned && (
        <p className="text-xs text-white/60">
          Buildings: {owned.houses === 5 ? "Hotel" : `${owned.houses} houses`}
          {owned.mortgaged ? " · Mortgaged" : ""}
        </p>
      )}

      {canManage && tile.type === "property" && owned && (
        <div className="flex flex-wrap gap-2">
          {canBuild && !owned.mortgaged && owned.houses < 5 && (
            <Button size="sm" onClick={() => sendAction("build", { tileId: tile.id })}>
              Build
              {owned.houses === 4
                ? ` hotel (${game.hotelsInBank} left)`
                : ` (${game.housesInBank} left)`}
            </Button>
          )}
          {owned.houses > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => sendAction("sell_house", { tileId: tile.id })}
            >
              {owned.houses === 5 ? "Sell hotel" : "Sell house"}
            </Button>
          )}
          {!owned.mortgaged && owned.houses === 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => sendAction("mortgage", { tileId: tile.id })}
            >
              Mortgage
            </Button>
          )}
          {owned.mortgaged && !isDebtor && (
            <Button
              size="sm"
              variant="success"
              onClick={() => sendAction("unmortgage", { tileId: tile.id })}
            >
              Unmortgage
            </Button>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={() => setSelectedTileId(null)}
      >
        Close
      </Button>
    </GlassCard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-1.5">
      <p className="text-[10px] uppercase text-white/40">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}
