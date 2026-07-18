import { readFileSync } from "fs";
import path from "path";
import type { BoardDefinition, CardsDeck } from "@/types/game";

const dataDir = path.join(process.cwd(), "data");

let boardCache: BoardDefinition | null = null;
let cardsCache: CardsDeck | null = null;

export function loadBoard(_boardId = "india-cities"): BoardDefinition {
  if (boardCache) return boardCache;
  const raw = readFileSync(path.join(dataDir, "board.json"), "utf-8");
  const board = JSON.parse(raw) as BoardDefinition;
  boardCache = board;
  return board;
}

export function loadCards(): CardsDeck {
  if (cardsCache) return cardsCache;
  const raw = readFileSync(path.join(dataDir, "cards.json"), "utf-8");
  cardsCache = JSON.parse(raw) as CardsDeck;
  return cardsCache;
}

export function getTile(board: BoardDefinition, tileId: number) {
  const tile = board.tiles.find((t) => t.id === tileId);
  if (!tile) throw new Error(`Tile ${tileId} not found`);
  return tile;
}

export function reloadBoardCache() {
  boardCache = null;
  cardsCache = null;
}

/** Always reload from disk in development so board.json edits apply */
export function loadBoardFresh(boardId = "classic-us"): BoardDefinition {
  boardCache = null;
  return loadBoard(boardId);
}
