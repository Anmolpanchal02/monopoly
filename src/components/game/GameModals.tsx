"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/store/game-store";
import type { GameState } from "@/types/game";
import { board } from "@/lib/game-data";
import { COLOR_GROUP_HEX, formatMoney, cn } from "@/lib/utils";

export function GameModals({ game }: { game: GameState }) {
  const playerId = useGameStore((s) => s.playerId);
  const { sendAction } = useSocket();
  const me = game.players.find((p) => p.id === playerId);
  const isMyTurn = game.players[game.currentPlayerIndex]?.id === playerId;
  const canAct =
    isMyTurn && !game.paused && game.phase !== "ended" && !me?.isSpectator;

  const pendingTile =
    game.pendingPurchase != null
      ? board.tiles[game.pendingPurchase.tileId]
      : null;

  const showBuy = canAct && game.phase === "buying" && pendingTile;
  const showJail = canAct && game.phase === "jail_choice" && me?.jailed;
  const showCard = canAct && game.phase === "card" && game.lastCard;
  const showAuction = game.phase === "auction" && game.auction;
  const isDebtor =
    game.phase === "bankruptcy" &&
    game.pendingDebt?.playerId === playerId &&
    !!me &&
    !me.bankrupt;
  const showBankrupt = isDebtor;

  const open =
    showBuy || showJail || showCard || showAuction || showBankrupt;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {showBuy && pendingTile && (
              <BuyModal
                tile={pendingTile}
                cash={me?.cash ?? 0}
                auctionEnabled={game.settings.auctionEnabled}
                onBuy={() => sendAction("buy")}
                onDecline={() => sendAction("decline_buy")}
              />
            )}

            {showJail && me && (
              <JailModal
                cards={me.getOutOfJailCards}
                cash={me.cash}
                onRoll={() => sendAction("roll")}
                onPay={() => sendAction("pay_jail")}
                onCard={() => sendAction("use_jail_card")}
              />
            )}

            {showCard && game.lastCard && (
              <CardModal
                title={game.lastCard.title}
                description={game.lastCard.description}
                type={game.lastCard.type}
                onOk={() => sendAction("dismiss_card")}
              />
            )}

            {showAuction && game.auction && (
              <AuctionModal
                game={game}
                canAct={
                  !!me &&
                  !me.bankrupt &&
                  !me.isSpectator &&
                  !game.paused &&
                  game.auction.participants.includes(playerId ?? "")
                }
              />
            )}

            {showBankrupt && game.pendingDebt && me && (
              <BankruptModal
                debt={game.pendingDebt}
                cash={me.cash}
                creditorName={
                  game.players.find((p) => p.id === game.pendingDebt?.toPlayerId)
                    ?.username ?? "the Bank"
                }
                onSettle={() => sendAction("settle_debt")}
                onBankrupt={() =>
                  sendAction("bankrupt", {
                    creditorId: game.pendingDebt?.toPlayerId ?? null,
                  })
                }
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalHeader({
  eyebrow,
  title,
  accent,
}: {
  eyebrow: string;
  title: string;
  accent: string;
}) {
  return (
    <div className={cn("px-6 pb-4 pt-6 text-white", accent)}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-2xl font-black">{title}</h2>
    </div>
  );
}

function ModalBtn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl px-4 py-3.5 text-sm font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

function BuyModal({
  tile,
  cash,
  auctionEnabled,
  onBuy,
  onDecline,
}: {
  tile: (typeof board.tiles)[number];
  cash: number;
  auctionEnabled: boolean;
  onBuy: () => void;
  onDecline: () => void;
}) {
  const canAfford = cash >= tile.price;

  return (
    <>
      <div
        className="h-2 w-full"
        style={{ backgroundColor: COLOR_GROUP_HEX[tile.colorGroup] }}
      />
      {tile.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/cities/${tile.image}.jpg`}
          alt={tile.name}
          className="h-40 w-full object-cover"
        />
      )}
      <ModalHeader
        eyebrow="Property Available"
        title={tile.name}
        accent="bg-gradient-to-r from-emerald-700 to-teal-600"
      />
      <div className="space-y-4 px-6 py-5 text-slate-800">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Price" value={formatMoney(tile.price)} />
          <Stat label="Your cash" value={formatMoney(cash)} />
          {tile.rent && (
            <>
              <Stat label="Rent" value={formatMoney(tile.rent.base)} />
              <Stat label="Mortgage" value={formatMoney(tile.mortgageValue)} />
            </>
          )}
        </div>
        {!canAfford && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            Not enough cash to buy.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <ModalBtn variant="success" onClick={onBuy} disabled={!canAfford}>
            Buy {formatMoney(tile.price)}
          </ModalBtn>
          <ModalBtn variant="secondary" onClick={onDecline}>
            {auctionEnabled ? "Auction" : "Skip"}
          </ModalBtn>
        </div>
      </div>
    </>
  );
}

function JailModal({
  cards,
  cash,
  onRoll,
  onPay,
  onCard,
}: {
  cards: number;
  cash: number;
  onRoll: () => void;
  onPay: () => void;
  onCard: () => void;
}) {
  const setDiceRolling = useGameStore((s) => s.setDiceRolling);

  const handleRoll = () => {
    setDiceRolling(true);
    onRoll();
    setTimeout(() => setDiceRolling(false), 950);
  };

  return (
    <>
      <ModalHeader
        eyebrow="Jail"
        title="You're Locked Up!"
        accent="bg-gradient-to-r from-orange-600 to-red-600"
      />
      <div className="space-y-4 px-6 py-5 text-slate-800">
        <p className="text-sm text-slate-600">
          Roll doubles to escape, pay ₹500 bail, or use a Get Out of Jail Free
          card.
        </p>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm">
          Your cash: <strong>{formatMoney(cash)}</strong>
          {cards > 0 && (
            <span className="ml-2 text-blue-700">· 🃏 ×{cards}</span>
          )}
        </div>
        <div className="grid gap-2">
          <ModalBtn variant="primary" onClick={handleRoll}>
            🎲 Roll for Doubles
          </ModalBtn>
          <ModalBtn variant="danger" onClick={onPay} disabled={cash < 500}>
            Pay ₹500 Fine
          </ModalBtn>
          {cards > 0 && (
            <ModalBtn variant="success" onClick={onCard}>
              Use Jail Card
            </ModalBtn>
          )}
        </div>
      </div>
    </>
  );
}

function CardModal({
  title,
  description,
  type,
  onOk,
}: {
  title: string;
  description: string;
  type: string;
  onOk: () => void;
}) {
  const isChance = type === "chance";
  return (
    <>
      <ModalHeader
        eyebrow={isChance ? "Chance" : "Community Chest"}
        title={title}
        accent={
          isChance
            ? "bg-gradient-to-r from-orange-500 to-amber-500"
            : "bg-gradient-to-r from-blue-600 to-indigo-600"
        }
      />
      <div className="space-y-5 px-6 py-5 text-slate-800">
        <p className="text-base leading-relaxed text-slate-700">{description}</p>
        <ModalBtn variant="primary" className="w-full" onClick={onOk}>
          OK
        </ModalBtn>
      </div>
    </>
  );
}

function AuctionModal({
  game,
  canAct,
}: {
  game: GameState;
  canAct: boolean;
}) {
  const { sendAction } = useSocket();
  const playerId = useGameStore((s) => s.playerId);
  const highBid = game.auction?.highestBid ?? 0;
  const [bid, setBid] = useState(highBid + 100);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tile = board.tiles[game.auction!.tileId];
  const high = game.players.find((p) => p.id === game.auction!.highestBidderId);
  const isHost = game.hostId === playerId;
  const endsAt = game.auction!.endsAt;

  useEffect(() => {
    setBid(highBid + 100);
  }, [highBid]);

  useEffect(() => {
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <>
      {tile.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/cities/${tile.image}.jpg`}
          alt={tile.name}
          className="h-36 w-full object-cover"
        />
      )}
      <ModalHeader
        eyebrow="Live Auction"
        title={tile.name}
        accent="bg-gradient-to-r from-violet-700 to-fuchsia-600"
      />
      <div className="space-y-4 px-6 py-5 text-slate-800">
        <p className="text-sm text-slate-600">
          High bid: <strong>{formatMoney(highBid)}</strong>
          {high ? ` by ${high.username}` : " — no bids yet"}
        </p>
        <p className="text-xs font-medium text-violet-700">
          Ends in {secondsLeft}s
        </p>
        {canAct && (
          <div className="flex gap-2">
            <input
              type="number"
              value={bid}
              min={highBid + 100}
              onChange={(e) => setBid(Number(e.target.value))}
              className="flex-1 rounded-2xl border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-violet-500"
            />
            <ModalBtn
              variant="success"
              onClick={() =>
                sendAction("auction_bid", {
                  amount: Math.max(bid, highBid + 100),
                })
              }
            >
              Bid
            </ModalBtn>
          </div>
        )}
        {(isHost || secondsLeft === 0) && (
          <ModalBtn
            variant="secondary"
            className="w-full"
            onClick={() => sendAction("auction_resolve")}
          >
            {secondsLeft === 0 ? "Close Auction" : "End Auction (Host)"}
          </ModalBtn>
        )}
      </div>
    </>
  );
}

function BankruptModal({
  debt,
  cash,
  creditorName,
  onSettle,
  onBankrupt,
}: {
  debt: { amount: number; reason: string };
  cash: number;
  creditorName: string;
  onSettle: () => void;
  onBankrupt: () => void;
}) {
  const shortfall = Math.max(0, debt.amount - cash);
  const canPay = cash >= debt.amount;

  return (
    <>
      <ModalHeader
        eyebrow="Debt Due"
        title={`Owe ${formatMoney(debt.amount)}`}
        accent="bg-gradient-to-r from-red-700 to-rose-600"
      />
      <div className="space-y-4 px-6 py-5 text-slate-800">
        <p className="text-sm text-slate-600">
          {debt.reason} — pay <strong>{creditorName}</strong>.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Your cash" value={formatMoney(cash)} />
          <Stat
            label={canPay ? "Status" : "Still need"}
            value={canPay ? "Ready to pay" : formatMoney(shortfall)}
          />
        </div>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Tip: click your properties on the board to mortgage or sell houses,
          then pay the debt.
        </p>
        <div className="grid gap-2">
          <ModalBtn variant="success" onClick={onSettle} disabled={!canPay}>
            Pay Debt
          </ModalBtn>
          <ModalBtn variant="danger" onClick={onBankrupt}>
            Declare Bankruptcy
          </ModalBtn>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-base font-black text-slate-900">{value}</p>
    </div>
  );
}
