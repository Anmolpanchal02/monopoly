import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Persist game state for reconnect / resume */
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { roomId, roomCode, state } = body ?? {};

  if (!roomCode || !state) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    let room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) {
      room = await prisma.room.create({
        data: {
          code: roomCode,
          hostId: session?.user?.id ?? state.hostId,
          settings: state.settings ?? {},
          status: "playing",
          id: roomId,
        },
      });
    }

    const game = await prisma.game.upsert({
      where: { id: state.id },
      create: {
        id: state.id,
        roomId: room.id,
        roomCode,
        state,
        status: state.phase === "ended" ? "finished" : "playing",
        winnerId: state.winnerId,
      },
      update: {
        state,
        status: state.phase === "ended" ? "finished" : "playing",
        winnerId: state.winnerId,
        endedAt: state.phase === "ended" ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, gameId: game.id });
  } catch (e) {
    // DB may be unavailable in local demo mode
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "Save failed",
    });
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  try {
    const game = await prisma.game.findFirst({
      where: { roomCode: code, status: "playing" },
      orderBy: { updatedAt: "desc" },
    });
    if (!game) return NextResponse.json({ game: null });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ game: null });
  }
}
