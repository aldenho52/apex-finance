export type CashFlowPeriod = "monthly" | "3months" | "6months" | "ytd" | "1year" | "2years" | "3years";

export type CashFlowStatus = "building_wealth" | "building_debt" | "breaking_even";

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export interface IncomeSource {
  source: string;
  amount: number;
}

export interface CashFlowData {
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  monthly_avg_income: number;
  monthly_avg_expenses: number;
  status: CashFlowStatus;
  top_expense_categories: CategoryBreakdown[];
  top_income_sources: IncomeSource[];
  period: CashFlowPeriod;
  start_date: string;
  transaction_count: number;
}
