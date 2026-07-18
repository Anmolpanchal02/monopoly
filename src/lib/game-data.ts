import boardData from "../../data/board.json";
import cardsData from "../../data/cards.json";
import themesData from "../../data/themes.json";
import metaData from "../../data/meta.json";
import type { BoardDefinition, CardsDeck } from "@/types/game";

export const board = boardData as BoardDefinition;
export const cards = cardsData as CardsDeck;
export const themes = themesData as Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    boardBg: string;
    accent: string;
    surface: string;
    tileBg: string;
    text: string;
  }
>;
export const meta = metaData;

export function getClientTile(tileId: number) {
  return board.tiles.find((t) => t.id === tileId);
}
