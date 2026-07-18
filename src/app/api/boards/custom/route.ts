import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const boardSchema = z.object({
  name: z.string().min(2).max(64),
  data: z.record(z.string(), z.unknown()),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  try {
    const boards = await prisma.customBoard.findMany({
      where: { isPublic: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return NextResponse.json(boards);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = boardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const board = await prisma.customBoard.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        data: parsed.data.data as object,
        isPublic: parsed.data.isPublic ?? false,
      },
    });
    return NextResponse.json(board);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save board" },
      { status: 500 }
    );
  }
}
