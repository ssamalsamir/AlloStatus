import { describe, expect, it } from "vitest";
import {
  circularStdHours,
  clamp,
  mean,
  round,
  sigmoid,
  stdDev,
} from "../../lib/scoring/stats";

describe("stats", () => {
  it("means and clamps the obvious way", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(mean([])).toBe(0);
    expect(clamp(5, -3, 3)).toBe(3);
    expect(clamp(-5, -3, 3)).toBe(-3);
    expect(clamp(1, -3, 3)).toBe(1);
  });

  it("uses sample standard deviation and is safe on tiny inputs", () => {
    expect(stdDev([1, 3])).toBeCloseTo(Math.SQRT2, 6);
    expect(stdDev([5])).toBe(0);
    expect(stdDev([])).toBe(0);
  });

  it("sigmoid is centered at a half", () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
    expect(sigmoid(-10)).toBeLessThan(0.01);
  });

  it("treats clock times as circular", () => {
    // 1am and 11pm are two hours apart, not twenty-two.
    expect(circularStdHours([1, 23])).toBeLessThan(1.5);
    expect(circularStdHours([3, 3, 3])).toBe(0);
    // A genuinely scattered sleeper should score high.
    expect(circularStdHours([1, 5, 9])).toBeGreaterThan(2);
  });

  it("rounds to the requested precision", () => {
    expect(round(72.456, 1)).toBe(72.5);
    expect(round(72.456)).toBe(72);
  });
});
