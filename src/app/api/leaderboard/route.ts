import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.leaderboardEntry.findMany({
      where: { period: "alltime" },
      orderBy: { score: "desc" },
      take: 50,
    });

    if (entries.length === 0) {
      const stats = await prisma.playerStats.findMany({
        include: { user: true },
        orderBy: { gamesWon: "desc" },
        take: 50,
      });
      return NextResponse.json(
        stats.map((s) => ({
          userId: s.userId,
          username: s.user.username ?? s.user.name ?? "Player",
          avatar: s.user.avatar,
          wins: s.gamesWon,
          score: s.gamesWon * 100 + s.hotelsBuilt * 10,
        }))
      );
    }

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json([
      { username: "Demo Tycoon", avatar: "🎩", wins: 12, score: 1400 },
      { username: "Boardwalk Boss", avatar: "👑", wins: 9, score: 1100 },
      { username: "Rail Baron", avatar: "🚂", wins: 7, score: 900 },
    ]);
  }
}
