"use client";

import { board } from "@/lib/game-data";
import { COLOR_GROUP_HEX, formatMoney, cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { useGameStore } from "@/store/game-store";
import type { ColorGroup, GameState, OwnedProperty } from "@/types/game";

const GROUP_ORDER: ColorGroup[] = [
  "brown",
  "lightblue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkblue",
  "railroad",
  "utility",
];

const GROUP_LABEL: Partial<Record<ColorGroup, string>> = {
  brown: "Brown",
  lightblue: "Light Blue",
  pink: "Pink",
  orange: "Orange",
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  darkblue: "Dark Blue",
  railroad: "Railroads",
  utility: "Utilities",
};

export function PortfolioPanel({ game }: { game: GameState }) {
  const playerId = useGameStore((s) => s.playerId);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const setSelectedTileId = useGameStore((s) => s.setSelectedTileId);

  const me = game.players.find((p) => p.id === playerId);

  if (!me) {
    return (
      <GlassCard className="p-4 text-sm text-white/50">
        Join the game to see your portfolio.
      </GlassCard>
    );
  }

  const owned = me.properties
    .map((prop) => {
      const tile = board.tiles[prop.tileId];
      return tile ? { prop, tile } : null;
    })
    .filter(Boolean) as {
    prop: OwnedProperty;
    tile: (typeof board.tiles)[number];
  }[];

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: owned.filter((o) => o.tile.colorGroup === group),
  })).filter((g) => g.items.length > 0);

  const assetValue = owned.reduce((sum, { prop, tile }) => {
    let v = prop.mortgaged ? tile.mortgageValue : tile.price;
    if (prop.houses === 5) v += tile.houseCost * 5;
    else v += tile.houseCost * prop.houses;
    return sum + v;
  }, 0);

  return (
    <GlassCard className="flex max-h-[42vh] flex-col overflow-hidden p-3">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
            My Portfolio
          </h3>
          <p className="mt-0.5 text-base font-bold text-emerald-300">
            {formatMoney(me.cash)}
          </p>
          <p className="text-[11px] text-white/45">
            {owned.length} propert{owned.length === 1 ? "y" : "ies"}
            {me.getOutOfJailCards > 0
              ? ` · 🃏×${me.getOutOfJailCards}`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Assets
          </p>
          <p className="text-xs font-semibold text-white/80">
            {formatMoney(assetValue)}
          </p>
        </div>
      </div>

      {owned.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-6 text-center text-sm text-white/45">
          No properties yet — buy cities as you land on them.
        </p>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-1">
          {grouped.map(({ group, items }) => {
            const setSize = board.tiles.filter(
              (t) => t.colorGroup === group && t.price > 0
            ).length;
            const complete =
              group !== "none" &&
              items.length === setSize &&
              items.every((i) => !i.prop.mortgaged);

            return (
              <div key={group}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: COLOR_GROUP_HEX[group] }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">
                    {GROUP_LABEL[group] ?? group}
                  </span>
                  <span className="text-[10px] text-white/35">
                    {items.length}/{setSize}
                  </span>
                  {complete && (
                    <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                      SET
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {items.map(({ prop, tile }) => (
                    <button
                      key={prop.tileId}
                      type="button"
                      onClick={() => setSelectedTileId(prop.tileId)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition",
                        selectedTileId === prop.tileId
                          ? "border-amber-400/50 bg-amber-400/15"
                          : "border-white/10 bg-black/25 hover:border-white/25 hover:bg-white/5"
                      )}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {tile.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/cities/${tile.image}.jpg`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-full w-full"
                            style={{
                              backgroundColor: COLOR_GROUP_HEX[tile.colorGroup],
                            }}
                          />
                        )}
                        <span
                          className="absolute inset-x-0 top-0 h-1"
                          style={{
                            backgroundColor: COLOR_GROUP_HEX[tile.colorGroup],
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {tile.name}
                        </p>
                        <p className="text-[10px] text-white/50">
                          {prop.mortgaged
                            ? "Mortgaged"
                            : prop.houses === 5
                              ? "Hotel"
                              : prop.houses > 0
                                ? `${prop.houses} house${prop.houses > 1 ? "s" : ""}`
                                : formatMoney(tile.price)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        {prop.mortgaged && (
                          <span className="rounded bg-amber-500/30 px-1 py-0.5 text-[9px] font-bold text-amber-100">
                            M
                          </span>
                        )}
                        {prop.houses === 5 && (
                          <span className="rounded bg-rose-500/35 px-1 py-0.5 text-[9px] font-bold text-rose-100">
                            Hotel
                          </span>
                        )}
                        {prop.houses > 0 && prop.houses < 5 && (
                          <span className="rounded bg-emerald-500/25 px-1 py-0.5 text-[9px] font-bold text-emerald-100">
                            ×{prop.houses}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
