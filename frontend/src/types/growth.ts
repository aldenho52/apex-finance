export interface GrowthDataPoint {
  year: number;
  label: string;
  balance: number;
  contributed: number;
}

export interface CompoundInputs {
  principal: number;
  rate: number;
  years: number;
  monthly: number;
}

export interface StreakSnapshot {
  date: string;
  balance: number;
  contributed: number;
}

export interface StreakProjection {
  history: StreakSnapshot[];
  projected: GrowthDataPoint[];
  avgMonthlyContribution: number;
  impliedAnnualRate: number;
  projectedBalance: number;
  targetDate: string;
}
