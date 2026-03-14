import { describe, it, expect } from "vitest";
import {
  calcCompoundGrowth,
  deriveStreakMetrics,
  projectFromCurrent,
  formatCurrency,
  formatAxisValue,
} from "./growth-math";

describe("calcCompoundGrowth", () => {
  it("returns correct number of data points", () => {
    const data = calcCompoundGrowth(10000, 7, 30, 500);
    expect(data).toHaveLength(31); // years 0-30
  });

  it("year 0 should equal the principal", () => {
    const data = calcCompoundGrowth(10000, 7, 30, 500);
    expect(data[0].balance).toBe(10000);
    expect(data[0].contributed).toBe(10000);
    expect(data[0].label).toBe("Now");
  });

  it("contributed should grow linearly", () => {
    const data = calcCompoundGrowth(10000, 7, 10, 500);
    // At year 5: 10000 + 500 * 60 = 40000
    expect(data[5].contributed).toBe(40000);
    // At year 10: 10000 + 500 * 120 = 70000
    expect(data[10].contributed).toBe(70000);
  });

  it("balance should always be >= contributed (positive rate)", () => {
    const data = calcCompoundGrowth(10000, 7, 30, 500);
    for (const point of data) {
      expect(point.balance).toBeGreaterThanOrEqual(point.contributed);
    }
  });

  it("matches known compound interest formula result", () => {
    // $10,000 at 7% for 30 years with $500/mo contributions
    // FV of principal: 10000 * (1 + 0.07/12)^360 = ~81,164.97
    // FV of annuity: 500 * ((1 + 0.07/12)^360 - 1) / (0.07/12) = ~609,985.27
    // Total ≈ $691,150
    const data = calcCompoundGrowth(10000, 7, 30, 500);
    const final = data[30].balance;
    expect(final).toBeGreaterThan(680000);
    expect(final).toBeLessThan(700000);
  });

  it("handles 0% rate correctly (no growth, just contributions)", () => {
    const data = calcCompoundGrowth(10000, 0, 10, 500);
    // At year 10: 10000 + 500 * 120 = 70000
    expect(data[10].balance).toBe(70000);
    expect(data[10].contributed).toBe(70000);
  });

  it("handles 0 monthly contribution", () => {
    const data = calcCompoundGrowth(10000, 10, 10, 0);
    // Pure compound growth on principal only
    // 10000 * (1 + 0.10/12)^120 ≈ 27,070
    expect(data[10].balance).toBeGreaterThan(27000);
    expect(data[10].balance).toBeLessThan(28000);
    expect(data[10].contributed).toBe(10000);
  });

  it("handles 0 principal with monthly contributions", () => {
    const data = calcCompoundGrowth(0, 7, 10, 1000);
    expect(data[0].balance).toBe(0);
    // FV of annuity only: 1000 * ((1.005833)^120 - 1) / 0.005833 ≈ $173,085
    expect(data[10].balance).toBeGreaterThan(170000);
    expect(data[10].balance).toBeLessThan(180000);
  });

  it("higher rate produces higher final balance", () => {
    const low = calcCompoundGrowth(10000, 5, 30, 500);
    const high = calcCompoundGrowth(10000, 10, 30, 500);
    expect(high[30].balance).toBeGreaterThan(low[30].balance);
  });

  it("more years produces higher final balance", () => {
    const short = calcCompoundGrowth(10000, 7, 10, 500);
    const long = calcCompoundGrowth(10000, 7, 30, 500);
    expect(long[10].balance).toBe(short[10].balance); // same at year 10
    expect(long[30].balance).toBeGreaterThan(short[10].balance);
  });

  it("labels are formatted correctly", () => {
    const data = calcCompoundGrowth(10000, 7, 5, 500);
    expect(data[0].label).toBe("Now");
    expect(data[1].label).toBe("Y1");
    expect(data[5].label).toBe("Y5");
  });
});

describe("deriveStreakMetrics", () => {
  it("returns zeros for insufficient history", () => {
    expect(deriveStreakMetrics([])).toEqual({
      avgMonthlyContribution: 0,
      impliedAnnualRate: 0,
    });
    expect(deriveStreakMetrics([{ date: "2025-01-01", balance: 10000, contributed: 0 }])).toEqual({
      avgMonthlyContribution: 0,
      impliedAnnualRate: 0,
    });
  });

  it("calculates average monthly contribution", () => {
    const history = [
      { date: "2025-01-01", balance: 10000, contributed: 0 },
      { date: "2025-02-01", balance: 10600, contributed: 500 },
      { date: "2025-03-01", balance: 11200, contributed: 500 },
      { date: "2025-04-01", balance: 11900, contributed: 500 },
    ];
    const result = deriveStreakMetrics(history);
    expect(result.avgMonthlyContribution).toBe(500); // 1500 / 3 months
  });

  it("derives positive implied rate when gains exist", () => {
    const history = [
      { date: "2025-01-01", balance: 100000, contributed: 0 },
      { date: "2025-02-01", balance: 101000, contributed: 500 },
      { date: "2025-03-01", balance: 102100, contributed: 500 },
      { date: "2025-04-01", balance: 103300, contributed: 500 },
    ];
    // gains = 103300 - 100000 - 1500 = 1800
    // implied annual = (1800 / 100000) * (12 / 3) * 100 = 7.2%
    const result = deriveStreakMetrics(history);
    expect(result.impliedAnnualRate).toBe(7.2);
  });

  it("handles zero starting balance without NaN", () => {
    const history = [
      { date: "2025-01-01", balance: 0, contributed: 0 },
      { date: "2025-02-01", balance: 500, contributed: 500 },
    ];
    const result = deriveStreakMetrics(history);
    expect(result.impliedAnnualRate).toBe(0);
    expect(result.avgMonthlyContribution).toBe(500);
  });

  it("handles negative gains (losses)", () => {
    const history = [
      { date: "2025-01-01", balance: 100000, contributed: 0 },
      { date: "2025-02-01", balance: 99000, contributed: 500 },
    ];
    // gains = 99000 - 100000 - 500 = -1500
    const result = deriveStreakMetrics(history);
    expect(result.impliedAnnualRate).toBeLessThan(0);
  });

  it("clamps unreasonably high implied rates to 50%", () => {
    // Simulate the bug: 2 data points with fabricated 5% gap, 0 contributions
    const history = [
      { date: "2025-01-01", balance: 82215, contributed: 0 },
      { date: "2025-12-01", balance: 86542, contributed: 0 },
    ];
    // raw = (4327 / 82215) * 12 * 100 = 63.2% — should be clamped to 50%
    const result = deriveStreakMetrics(history);
    expect(result.impliedAnnualRate).toBeLessThanOrEqual(50);
  });

  it("clamps unreasonably negative implied rates to -50%", () => {
    const history = [
      { date: "2025-01-01", balance: 10000, contributed: 0 },
      { date: "2025-02-01", balance: 1000, contributed: 0 },
    ];
    // raw = (-9000 / 10000) * 12 * 100 = -1080% — should be clamped to -50%
    const result = deriveStreakMetrics(history);
    expect(result.impliedAnnualRate).toBe(-50);
  });
});

describe("projectFromCurrent", () => {
  it("matches calcCompoundGrowth for equivalent inputs", () => {
    const growth = calcCompoundGrowth(50000, 8, 20, 1000);
    const projected = projectFromCurrent(50000, 8, 1000, 20);
    expect(projected).toBe(growth[20].balance);
  });

  it("with 0% rate, just adds contributions", () => {
    const result = projectFromCurrent(10000, 0, 500, 10);
    expect(result).toBe(10000 + 500 * 120); // 70000
  });

  it("with 0 contributions, applies compound growth on principal only", () => {
    const result = projectFromCurrent(10000, 10, 0, 10);
    // 10000 * (1.008333)^120 ≈ 27,070
    expect(result).toBeGreaterThan(27000);
    expect(result).toBeLessThan(28000);
  });

  it("produces higher values for longer time horizons", () => {
    const short = projectFromCurrent(10000, 7, 500, 5);
    const long = projectFromCurrent(10000, 7, 500, 30);
    expect(long).toBeGreaterThan(short);
  });
});

describe("formatCurrency", () => {
  it("formats positive values", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  it("rounds to nearest dollar", () => {
    expect(formatCurrency(1234.56)).toBe("$1,235");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatAxisValue", () => {
  it("formats thousands", () => {
    expect(formatAxisValue(50000)).toBe("$50K");
  });

  it("formats millions", () => {
    expect(formatAxisValue(1500000)).toBe("$1.5M");
  });

  it("formats small values", () => {
    expect(formatAxisValue(500)).toBe("$1K"); // rounds up from 0.5
  });
});
