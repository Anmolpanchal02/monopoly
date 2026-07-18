import { NextResponse } from "next/server";
import { board, cards, themes, meta } from "@/lib/game-data";

export async function GET() {
  return NextResponse.json({
    board,
    cards,
    themes,
    meta,
  });
}
