import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { meta } from "@/lib/game-data";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({
      user: null,
      stats: null,
      achievements: meta.achievements,
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        stats: true,
        achievements: { include: { achievement: true } },
      },
    });
    return NextResponse.json({
      user,
      stats: user?.stats,
      achievements: meta.achievements,
      unlocked: user?.achievements.map((a) => a.achievement.key) ?? [],
    });
  } catch {
    return NextResponse.json({
      user: { name: session.user.name, id: session.user.id },
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        hotelsBuilt: 0,
        timesJailed: 0,
      },
      achievements: meta.achievements,
      unlocked: [],
    });
  }
}
