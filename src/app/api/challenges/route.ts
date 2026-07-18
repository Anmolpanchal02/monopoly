import { NextResponse } from "next/server";
import { meta } from "@/lib/game-data";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  // Rotate daily challenge by day of year
  const dayIndex =
    Math.floor(Date.now() / 86400000) % meta.dailyChallenges.length;
  const challenge = {
    ...meta.dailyChallenges[dayIndex],
    date: today,
  };
  return NextResponse.json({ challenge, all: meta.dailyChallenges });
}
