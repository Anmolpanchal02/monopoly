import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const events = await prisma.replayEvent.findMany({
      where: { gameId: id },
      orderBy: { sequence: "asc" },
    });
    const game = await prisma.game.findUnique({ where: { id } });
    return NextResponse.json({ game, events });
  } catch {
    return NextResponse.json({ game: null, events: [] });
  }
}
