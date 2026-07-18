import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function formatMoney(amount: number, currency = "₹"): string {
  return `${currency}${amount.toLocaleString("en-IN")}`;
}

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function createId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const PLAYER_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#ec4899",
] as const;

export const PLAYER_EMOJIS = ["😎", "🦊", "🦄", "🐼", "🦁", "🐸", "🦉", "🐙"] as const;

export const TOKENS = [
  { id: "car", label: "Car", emoji: "🚗" },
  { id: "dog", label: "Dog", emoji: "🐶" },
  { id: "hat", label: "Hat", emoji: "🎩" },
  { id: "ship", label: "Ship", emoji: "🚢" },
  { id: "cat", label: "Cat", emoji: "🐱" },
  { id: "duck", label: "Duck", emoji: "🦆" },
  { id: "robot", label: "Robot", emoji: "🤖" },
  { id: "pizza", label: "Pizza", emoji: "🍕" },
] as const;

export const EMOTES = ["😂", "😎", "🔥", "❤️", "😭", "👏"] as const;

export const COLOR_GROUP_HEX: Record<string, string> = {
  brown: "#8B4513",
  lightblue: "#87CEEB",
  pink: "#FF69B4",
  orange: "#FF8C00",
  red: "#DC143C",
  yellow: "#FFD700",
  green: "#228B22",
  darkblue: "#00008B",
  railroad: "#1f2937",
  utility: "#6b7280",
  none: "transparent",
};

export function getTokenEmoji(tokenId: string): string {
  return TOKENS.find((t) => t.id === tokenId)?.emoji ?? "🎲";
}
