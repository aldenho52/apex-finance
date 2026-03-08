export interface DebtAccount {
  account_id: string;
  name: string;
  balance: number;
  apr: number;
  minimum_payment: number;
  due_date: string | null;
  credit_limit: number | null;
  utilization: number | null;
}

export interface MonthlyBreakdown {
  month: number;
  total_payment: number;
  interest: number;
  principal: number;
  remaining_balance: number;
}

export interface StrategyResult {
  total_months: number;
  total_interest: number;
  total_paid: number;
  interest_saved_vs_minimum?: number;
  months_saved_vs_minimum?: number;
  payoff_order: string[];
  monthly_breakdown: MonthlyBreakdown[];
}

export interface PayoffComparison {
  debts: DebtAccount[];
  extra_monthly_payment: number;
  strategies: {
    minimum_only: StrategyResult;
    snowball: StrategyResult;
    avalanche: StrategyResult;
  };
  recommendation: {
    strategy: string;
    reason: string;
  };
}

export interface DebtOverview {
  debts: DebtAccount[];
  total_balance: number;
  total_minimum_payments: number;
  weighted_avg_apr: number;
}

export interface BalanceTransferOffer {
  offer_name: string;
  promo_apr: number;
  promo_months: number;
  transfer_fee_pct: number;
  transfer_fee_dollar: number;
  interest_saved: number;
  net_savings: number;
  monthly_payment_needed: number;
}

export interface BalanceTransferAnalysis {
  has_debt: boolean;
  message?: string;
  total_balance: number;
  total_annual_interest: number;
  debt_analysis: DebtAccount[];
  recommendations: BalanceTransferOffer[];
  best_recommendation?: BalanceTransferOffer;
}
