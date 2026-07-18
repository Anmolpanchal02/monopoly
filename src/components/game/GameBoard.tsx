"use client";

import { motion } from "framer-motion";
import { board } from "@/lib/game-data";
import { COLOR_GROUP_HEX, cn, formatMoney, getTokenEmoji } from "@/lib/utils";
import type { BoardTile, GameState, PlayerState } from "@/types/game";
import { useGameStore } from "@/store/game-store";

/** Bottom row R→L, left B→T, top L→R, right T→B */
function getTilePosition(id: number): { row: number; col: number } {
  if (id >= 0 && id <= 10) return { row: 10, col: 10 - id };
  if (id >= 11 && id <= 19) return { row: 10 - (id - 10), col: 0 };
  if (id >= 20 && id <= 30) return { row: 0, col: id - 20 };
  return { row: id - 30, col: 10 };
}

function sideOf(id: number): "bottom" | "left" | "top" | "right" | "corner" {
  if ([0, 10, 20, 30].includes(id)) return "corner";
  if (id >= 1 && id <= 9) return "bottom";
  if (id >= 11 && id <= 19) return "left";
  if (id >= 21 && id <= 29) return "top";
  return "right";
}

const CITY_GRADIENT: Record<string, string> = {
  indore: "from-amber-700 via-orange-600 to-yellow-800",
  bhubaneswar: "from-stone-600 via-amber-700 to-orange-900",
  patna: "from-sky-700 via-blue-600 to-indigo-800",
  bhopal: "from-emerald-800 via-teal-700 to-cyan-900",
  agra: "from-slate-200 via-stone-300 to-slate-400",
  nagpur: "from-rose-800 via-red-700 to-orange-900",
  lucknow: "from-yellow-700 via-amber-600 to-orange-800",
  chandigarh: "from-cyan-600 via-sky-500 to-blue-700",
  jaipur: "from-pink-600 via-rose-500 to-orange-600",
  surat: "from-violet-800 via-purple-700 to-fuchsia-800",
  kolkata: "from-indigo-800 via-blue-700 to-slate-800",
  kochi: "from-cyan-400 via-teal-500 to-blue-600",
  chennai: "from-blue-700 via-indigo-600 to-slate-800",
  ahmedabad: "from-sky-500 via-blue-600 to-cyan-700",
  bengaluru: "from-fuchsia-700 via-violet-600 to-purple-900",
  goa: "from-orange-400 via-amber-500 to-yellow-600",
  hyderabad: "from-amber-800 via-yellow-700 to-stone-800",
  gurugram: "from-slate-600 via-zinc-500 to-slate-800",
  noida: "from-zinc-700 via-slate-600 to-neutral-800",
  delhi: "from-stone-500 via-amber-600 to-yellow-700",
  pune: "from-blue-800 via-indigo-700 to-violet-900",
  mumbai: "from-stone-700 via-amber-800 to-yellow-900",
};

function ColorBar({ color, side }: { color: string; side: string }) {
  const base = "absolute z-[1]";
  if (side === "bottom")
    return <div className={`${base} inset-x-0 top-0 h-[22%]`} style={{ backgroundColor: color }} />;
  if (side === "top")
    return <div className={`${base} inset-x-0 bottom-0 h-[22%]`} style={{ backgroundColor: color }} />;
  if (side === "left")
    return <div className={`${base} inset-y-0 right-0 w-[22%]`} style={{ backgroundColor: color }} />;
  return <div className={`${base} inset-y-0 left-0 w-[22%]`} style={{ backgroundColor: color }} />;
}

function PropertyPhoto({ image, side }: { image?: string; side: string }) {
  const slug = image ?? "mumbai";
  const gradient = CITY_GRADIENT[slug] ?? "from-slate-600 to-slate-800";
  const pos =
    side === "bottom"
      ? "top-[22%] inset-x-0 h-[38%]"
      : side === "top"
        ? "bottom-[22%] inset-x-0 h-[38%]"
        : side === "left"
          ? "right-[22%] inset-y-0 w-[38%]"
          : "left-[22%] inset-y-0 w-[38%]";

  return (
    <div className={cn("absolute overflow-hidden bg-gradient-to-br", gradient, pos)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/cities/${slug}.jpg`}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}

function TileIcon({ tile }: { tile: BoardTile }) {
  if (tile.type === "chance")
    return <span className="text-lg font-black text-orange-500 sm:text-2xl">?</span>;
  if (tile.type === "community_chest")
    return <span className="text-base sm:text-xl">📦</span>;
  if (tile.type === "railroad")
    return <span className="text-base sm:text-xl">🚂</span>;
  if (tile.type === "utility")
    return (
      <span className="text-base sm:text-xl">
        {tile.name.includes("Electric") ? "💡" : "🚰"}
      </span>
    );
  if (tile.type === "tax") return <span className="text-base sm:text-xl">🏛️</span>;
  return null;
}

function CornerTile({ tile }: { tile: BoardTile }) {
  if (tile.type === "go") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#e8f5e9]">
        <div className="rotate-[-45deg] text-center">
          <p className="text-[10px] font-black tracking-widest text-red-600 sm:text-xs">COLLECT</p>
          <p className="font-display text-xl font-black text-red-600 sm:text-3xl">GO</p>
          <p className="text-[9px] font-bold text-red-500 sm:text-[11px]">₹2000 →</p>
        </div>
      </div>
    );
  }
  if (tile.type === "jail") {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f5e6c8]">
        <div className="flex flex-1 items-center justify-center bg-orange-100">
          <div className="rounded border-2 border-slate-700 bg-amber-50 px-1 py-0.5 text-center">
            <p className="text-lg sm:text-2xl">🔒</p>
            <p className="text-[8px] font-black uppercase text-slate-800 sm:text-[10px]">Jail</p>
          </div>
        </div>
        <p className="bg-amber-200 py-0.5 text-center text-[7px] font-bold uppercase text-slate-700 sm:text-[9px]">
          Just Visiting
        </p>
      </div>
    );
  }
  if (tile.type === "free_parking") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#e3f2fd] p-1">
        <span className="text-lg sm:text-2xl">🚗</span>
        <p className="text-center text-[8px] font-black uppercase leading-tight text-blue-800 sm:text-[10px]">
          Free
          <br />
          Parking
        </p>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#ffebee] p-1">
      <p className="rotate-45 text-center text-[8px] font-black uppercase leading-tight text-red-700 sm:text-[11px]">
        Go To
        <br />
        Jail
      </p>
      <span className="mt-1 text-base sm:text-xl">👮</span>
    </div>
  );
}

function TileView({
  tileId,
  owners,
  selected,
  onSelect,
}: {
  tileId: number;
  owners: Map<number, { color: string; houses: number; mortgaged: boolean }>;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const tile = board.tiles[tileId];
  const side = sideOf(tileId);
  const owner = owners.get(tileId);
  const color = COLOR_GROUP_HEX[tile.colorGroup] ?? "transparent";
  const isCorner = side === "corner";

  return (
    <button
      type="button"
      onClick={() => onSelect(tileId)}
      className={cn(
        "relative h-full w-full overflow-hidden border border-slate-800/80 bg-[#f7f3e8] text-left transition",
        selected && "z-10 ring-2 ring-amber-400",
        isCorner && "bg-[#efe8d8]"
      )}
    >
      {isCorner ? (
        <CornerTile tile={tile} />
      ) : (
        <>
          {tile.type === "property" && (
            <>
              <ColorBar color={color} side={side} />
              <PropertyPhoto image={tile.image} side={side} />
            </>
          )}
          {(tile.type === "railroad" ||
            tile.type === "utility" ||
            tile.type === "chance" ||
            tile.type === "community_chest" ||
            tile.type === "tax") && (
            <div
              className={cn(
                "absolute flex items-center justify-center",
                side === "bottom" || side === "top"
                  ? "inset-x-0 top-[18%] h-[36%]"
                  : "inset-y-0 left-[18%] w-[36%]"
              )}
            >
              <TileIcon tile={tile} />
            </div>
          )}

          <div
            className={cn(
              "absolute z-[2] flex flex-col items-center justify-end p-[2px] sm:p-1",
              side === "bottom" && "inset-x-0 bottom-0 top-[58%]",
              side === "top" && "inset-x-0 top-0 bottom-[58%] justify-start",
              side === "left" && "inset-y-0 left-0 right-[58%] justify-center",
              side === "right" && "inset-y-0 right-0 left-[58%] justify-center"
            )}
          >
            <span
              className={cn(
                "text-center font-black uppercase leading-[1.05] text-slate-900",
                "text-[6px] sm:text-[8px] md:text-[9px]",
                (side === "left" || side === "right") && "writing-vertical max-w-full"
              )}
              style={
                side === "left"
                  ? { writingMode: "vertical-rl", transform: "rotate(180deg)" }
                  : side === "right"
                    ? { writingMode: "vertical-rl" }
                    : undefined
              }
            >
              {tile.name}
            </span>
            {(tile.price > 0 || tile.taxAmount > 0) && (
              <span className="mt-0.5 text-[6px] font-bold text-slate-700 sm:text-[8px]">
                {formatMoney(tile.price || tile.taxAmount)}
              </span>
            )}
          </div>

          {owner && (
            <div className="absolute bottom-0.5 right-0.5 z-[3] flex items-center gap-0.5">
              {owner.houses === 5 ? (
                <span className="text-[9px]">🏨</span>
              ) : (
                Array.from({ length: owner.houses }).map((_, i) => (
                  <span key={i} className="text-[7px]">
                    🏠
                  </span>
                ))
              )}
              <span
                className={cn(
                  "h-2 w-2 rounded-full border border-white shadow",
                  owner.mortgaged && "opacity-40"
                )}
                style={{ backgroundColor: owner.color }}
              />
            </div>
          )}
        </>
      )}
    </button>
  );
}

function RuleCard({
  title,
  color,
  children,
  className,
  rotate,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  className?: string;
  rotate: string;
}) {
  return (
    <div
      className={cn(
        "w-[42%] max-w-[150px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-md",
        className
      )}
      style={{ transform: rotate }}
    >
      <div className={cn("px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white sm:text-[10px]", color)}>
        {title}
      </div>
      <div className="px-1.5 py-1 text-[7px] font-semibold leading-snug text-slate-700 sm:text-[9px]">
        {children}
      </div>
    </div>
  );
}

function Token({ player, index }: { player: PlayerState; index: number }) {
  const pos = getTilePosition(player.position);
  const offset = (index % 4) * 7;

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="pointer-events-none absolute z-30 flex items-center justify-center"
      style={{
        width: "9.09%",
        height: "9.09%",
        left: `calc(${pos.col * 9.09}% + ${offset}px)`,
        top: `calc(${pos.row * 9.09}% + ${Math.floor(index / 4) * 7}px)`,
      }}
      title={player.username}
    >
      <motion.span
        animate={player.jailed ? { rotate: [0, -8, 8, 0] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs shadow-lg sm:h-7 sm:w-7 sm:text-sm"
        style={{ backgroundColor: player.color }}
      >
        {getTokenEmoji(player.token)}
      </motion.span>
    </motion.div>
  );
}

export function GameBoard({ game }: { game: GameState }) {
  const { selectedTileId, setSelectedTileId } = useGameStore();
  const owners = new Map<number, { color: string; houses: number; mortgaged: boolean }>();

  for (const player of game.players) {
    for (const prop of player.properties) {
      owners.set(prop.tileId, {
        color: player.color,
        houses: prop.houses,
        mortgaged: prop.mortgaged,
      });
    }
  }

  const activePlayers = game.players.filter((p) => !p.bankrupt);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(96vw,900px)]">
      <div className="absolute inset-0 overflow-hidden rounded-sm border-[3px] border-slate-900 bg-[#c8e6c9] shadow-2xl">
        <div
          className="absolute inset-0 grid gap-0 bg-slate-900"
          style={{
            gridTemplateColumns: "repeat(11, 1fr)",
            gridTemplateRows: "repeat(11, 1fr)",
          }}
        >
          {Array.from({ length: 40 }).map((_, id) => {
            const { row, col } = getTilePosition(id);
            return (
              <div
                key={id}
                style={{ gridRow: row + 1, gridColumn: col + 1 }}
                className="min-h-0 min-w-0"
              >
                <TileView
                  tileId={id}
                  owners={owners}
                  selected={selectedTileId === id}
                  onSelect={setSelectedTileId}
                />
              </div>
            );
          })}

          <div
            className="relative overflow-hidden bg-[#d4edda]"
            style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}
          >
            <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 shadow-sm sm:px-4 sm:py-1.5">
                <span className="text-sm">🚗</span>
                <div className="text-center leading-tight">
                  <p className="text-[8px] font-black uppercase tracking-wide text-cyan-800 sm:text-[10px]">
                    Free Parking Pot
                  </p>
                  <p className="text-xs font-black text-cyan-950 sm:text-sm">
                    {formatMoney(game.freeParkingPot)}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex h-[72%] w-[72%] flex-wrap content-between justify-between">
                <RuleCard title="Jail Rules" color="bg-orange-500" rotate="rotate(-8deg)">
                  Roll doubles to escape or pay ₹500 bail. 3 turns max.
                </RuleCard>
                <RuleCard title="Trade Rules" color="bg-blue-500" rotate="rotate(7deg)">
                  Tap players to trade. Swap cash &amp; properties. Complete sets.
                </RuleCard>
                <RuleCard title="Auction Rules" color="bg-yellow-500" rotate="rotate(6deg)">
                  Unbought lands auctioned. Live timer. Highest bid wins.
                </RuleCard>
                <RuleCard title="Property Rules" color="bg-green-600" rotate="rotate(-7deg)">
                  Own sets for 2× rent. Build up to 4 houses. Upgrade to hotel.
                </RuleCard>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-sm border-[3px] border-white bg-[#c62828] px-4 py-2 shadow-xl sm:px-8 sm:py-3"
              >
                <h2 className="font-display text-xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
                  MONOPOLY
                </h2>
              </motion.div>
              <p className="mt-1 text-center text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-900/70 sm:text-[11px]">
                India Edition
              </p>
            </div>
          </div>
        </div>

        {activePlayers.map((player, i) => (
          <Token key={player.id} player={player} index={i} />
        ))}
      </div>
    </div>
  );
}
