import { describe, it, expect } from "vitest";
import { generateRoomCode, shuffle, formatMoney } from "@/lib/utils";

describe("utils", () => {
  it("generates room codes", () => {
    const code = generateRoomCode(6);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("shuffles array without losing items", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(5);
    expect([...result].sort()).toEqual(arr);
  });

  it("formats money", () => {
    expect(formatMoney(1500)).toBe("₹1,500");
  });
});
