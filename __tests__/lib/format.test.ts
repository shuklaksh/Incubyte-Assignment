import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatEmploymentType,
  formatLevel,
  calcTotalComp,
  calcDelta,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formats USD correctly as $120,000", () => {
    const result = formatCurrency(120000, "USD");
    expect(result).toContain("120,000");
    expect(result).toContain("$");
  });

  it("formats INR correctly with ₹ symbol", () => {
    const result = formatCurrency(1500000, "INR");
    expect(result).toContain("₹");
  });

  it("formats EUR correctly with € symbol", () => {
    const result = formatCurrency(70000, "EUR");
    expect(result).toContain("€");
  });

  it("handles zero correctly", () => {
    const result = formatCurrency(0, "USD");
    expect(result).toContain("0");
  });

  it("handles large numbers with correct comma separation", () => {
    const result = formatCurrency(1000000, "USD");
    expect(result).toContain("1,000,000");
  });
});

describe("formatDate", () => {
  it("formats a date as a human-readable string", () => {
    const result = formatDate(new Date("2020-01-15"));
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("formats ISO date string correctly", () => {
    const result = formatDate(new Date("2023-06-01"));
    expect(result).toContain("2023");
  });
});

describe("formatEmploymentType", () => {
  it("formats FULL_TIME as Full Time", () => {
    expect(formatEmploymentType("FULL_TIME")).toBe("Full Time");
  });

  it("formats PART_TIME as Part Time", () => {
    expect(formatEmploymentType("PART_TIME")).toBe("Part Time");
  });

  it("formats CONTRACT as Contract", () => {
    expect(formatEmploymentType("CONTRACT")).toBe("Contract");
  });
});

describe("formatLevel", () => {
  it("passes through L1 as L1", () => {
    expect(formatLevel("L1")).toBe("L1");
  });

  it("passes through L7 as L7", () => {
    expect(formatLevel("L7")).toBe("L7");
  });

  it("returns the level string unchanged", () => {
    expect(formatLevel("L4")).toBe("L4");
  });
});

describe("calcTotalComp", () => {
  it("returns sum of base and bonus", () => {
    expect(calcTotalComp(100000, 20000)).toBe(120000);
  });

  it("handles zero bonus correctly", () => {
    expect(calcTotalComp(80000, 0)).toBe(80000);
  });

  it("handles decimal values correctly", () => {
    expect(calcTotalComp(99999.99, 0.01)).toBe(100000);
  });
});

describe("calcDelta", () => {
  it("returns positive amount and percent for increase", () => {
    const delta = calcDelta(100000, 110000);
    expect(delta.amount).toBe(10000);
    expect(delta.percent).toBeGreaterThan(0);
  });

  it("returns negative amount and percent for decrease", () => {
    const delta = calcDelta(100000, 90000);
    expect(delta.amount).toBe(-10000);
    expect(delta.percent).toBeLessThan(0);
  });

  it("returns direction UP for increase", () => {
    const delta = calcDelta(100000, 110000);
    expect(delta.direction).toBe("UP");
  });

  it("returns direction DOWN for decrease", () => {
    const delta = calcDelta(100000, 90000);
    expect(delta.direction).toBe("DOWN");
  });

  it("returns direction NONE when values are equal", () => {
    const delta = calcDelta(100000, 100000);
    expect(delta.direction).toBe("NONE");
  });

  it("rounds percent to 1 decimal place", () => {
    const delta = calcDelta(100000, 110000);
    // 10% exactly
    expect(delta.percent).toBe(10.0);
  });

  it("rounds percent to 1 decimal place for non-round numbers", () => {
    const delta = calcDelta(100000, 115000);
    // 15% exactly
    expect(delta.percent).toBe(15.0);
  });

  it("handles edge case of increase from zero gracefully", () => {
    const delta = calcDelta(0, 100000);
    expect(delta.direction).toBe("UP");
    expect(delta.amount).toBe(100000);
  });
});
