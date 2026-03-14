import type { GrowthDataPoint, StreakSnapshot } from "../types/growth";

/**
 * Calculate compound growth over time with monthly contributions.
 *
 * Uses the standard future value formula:
 *   FV = P*(1+r)^n + PMT * ((1+r)^n - 1) / r
 * where:
 *   P = principal, r = monthly rate, n = total months, PMT = monthly contribution
 */
export function calcCompoundGrowth(
  principal: number,
  annualRate: number,
  years: number,
  monthlyContribution: number
): GrowthDataPoint[] {
  const r = annualRate / 100 / 12;
  return Array.from({ length: years + 1 }, (_, y) => {
    const n = y * 12;
    const balance =
      principal * Math.pow(1 + r, n) +
      (r > 0
        ? monthlyContribution * (Math.pow(1 + r, n) - 1) / r
        : monthlyContribution * n);
    const contributed = principal + monthlyContribution * n;
    return {
      year: y,
      label: y === 0 ? "Now" : `Y${y}`,
      balance: Math.round(balance),
      contributed: Math.round(contributed),
    };
  });
}

/**
 * Derive implied annual return rate and average monthly contribution from
 * a series of historical balance snapshots.
 */
export function deriveStreakMetrics(history: StreakSnapshot[]) {
  if (history.length < 2) {
    return { avgMonthlyContribution: 0, impliedAnnualRate: 0 };
  }

  const first = history[0];
  const last = history[history.length - 1];
  const months = Math.max(1, history.length - 1);

  const totalContributed = history.reduce((sum, s) => sum + s.contributed, 0);
  const gains = last.balance - first.balance - totalContributed;
  const rawRate =
    first.balance > 0 ? (gains / first.balance) * (12 / months) * 100 : 0;

  // Clamp to a reasonable range — anything beyond ±50% annually is almost
  // certainly a data artifact (too few snapshots, missing contributions, etc.)
  const impliedAnnualRate = Math.max(-50, Math.min(50, rawRate));
  const avgMonthlyContribution = totalContributed / months;

  return {
    avgMonthlyContribution: Math.round(avgMonthlyContribution),
    impliedAnnualRate: Math.round(impliedAnnualRate * 10) / 10,
  };
}

/**
 * Project future balance from current position using compound growth.
 */
export function projectFromCurrent(
  currentBalance: number,
  annualRate: number,
  monthlyContribution: number,
  yearsOut: number
): number {
  const r = annualRate / 100 / 12;
  const n = yearsOut * 12;
  const fv =
    currentBalance * Math.pow(1 + r, n) +
    (r > 0
      ? monthlyContribution * (Math.pow(1 + r, n) - 1) / r
      : monthlyContribution * n);
  return Math.round(fv);
}

export function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

export function formatAxisValue(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}
