import { describe, expect, it } from "vitest";
import { scoreBand, scoreColor, scoreLabel } from "../../lib/colors";

// Pull the hue (the first number) out of an "hsl(H S% L%)" string.
function hue(hsl: string): number {
  const m = hsl.match(/^hsl\((\d+)/);
  if (!m) throw new Error(`not an hsl() colour: ${hsl}`);
  return Number(m[1]);
}

// Hue families the traffic light should live in.
const RED = (h: number) => h >= 0 && h <= 20;
const YELLOW = (h: number) => h >= 35 && h <= 60;
const GREEN = (h: number) => h >= 120 && h <= 160;

describe("scoreBand", () => {
  it("splits the score into low / medium / good at 45 and 60", () => {
    expect(scoreBand(0)).toBe("low");
    expect(scoreBand(44)).toBe("low");
    expect(scoreBand(45)).toBe("medium");
    expect(scoreBand(59)).toBe("medium");
    expect(scoreBand(60)).toBe("good");
    expect(scoreBand(100)).toBe("good");
  });

  it("clamps out-of-range scores into the end bands", () => {
    expect(scoreBand(-20)).toBe("low");
    expect(scoreBand(150)).toBe("good");
  });
});

describe("scoreColor — a red / yellow / green traffic light", () => {
  it("is red when resilience is low", () => {
    expect(RED(hue(scoreColor(10)))).toBe(true);
    expect(RED(hue(scoreColor(44)))).toBe(true);
  });

  it("is yellow when resilience is medium", () => {
    expect(YELLOW(hue(scoreColor(45)))).toBe(true);
    expect(YELLOW(hue(scoreColor(52)))).toBe(true);
    expect(YELLOW(hue(scoreColor(59)))).toBe(true);
  });

  it("is green when resilience is good", () => {
    expect(GREEN(hue(scoreColor(60)))).toBe(true);
    expect(GREEN(hue(scoreColor(85)))).toBe(true);
    expect(GREEN(hue(scoreColor(100)))).toBe(true);
  });

  it("switches colour family exactly at the band edges", () => {
    expect(hue(scoreColor(44))).not.toBe(hue(scoreColor(45))); // red → yellow
    expect(hue(scoreColor(59))).not.toBe(hue(scoreColor(60))); // yellow → green
  });
});

// The colour and the word are read off the same buffer, so they must agree:
// a "red" score should never be labelled like a healthy one, and vice versa.
describe("scoreColor agrees with scoreLabel", () => {
  it("never shows a green label in the red band, or a red label in green", () => {
    for (let pct = 0; pct <= 100; pct++) {
      const band = scoreBand(pct);
      const label = scoreLabel(pct);
      if (band === "low") {
        expect(["Depleted", "Low"]).toContain(label);
      } else if (band === "medium") {
        expect(label).toBe("Steady");
      } else {
        expect(["Strong", "Peak"]).toContain(label);
      }
    }
  });
});
